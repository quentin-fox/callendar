import Anthropic from "@anthropic-ai/sdk";

import * as entities from "@/entities";
import { XMLParser } from "fast-xml-parser";
import * as dtos from "@/dtos";

function buildPrompt(options: { name: string; extra: string | null }): string {
  const prompt = `

The user has requested the schedule for the following resident:

<resident-name>
${options.name}
</resident-name>

Here is additional information that will be useful when processing the images:

<extra>
  ${options.extra ?? "none"}
</extra>

Please follow these steps to extract and present the requested schedule:

1. Analyze the images carefully.

2. Determine the format of the image, and a strategy for matching up resident names with the date/times of their call shifts.

3. Extract the schedule information for that resident.

4. Output the extracted schedule information in the following following high-level structure (XML):


<thinking>
</thinking>
<summary>
</summary>

<errors>
  <error>
  </error>
</errors>

<schedule>
  <shift>
  </shift>
</schedule>


A summary of the call schedule and how the model interprets the structure of the schedule should be in the <summary> block. This should be three sentences or less.

As an example:

<summary>
  This image shows a monthly calendar, and the resident An is on call quite a few times!
</summary>

If any errors are encountered during processing, each error should be found in a separate <error> tag in the <errors> block.

All of the extracted call shifts should be included in the <schedule> block.

The <shift></shift> can have one of the following formats:

<shift>
  <type>all-day</type>
  <date>[YYYY-MM-DD]</date>
  <notes>[Any additional notes or information.]</notes>
  <explanation>[give visual reasoning for why this date was extracted]</explanation>
  <confidence>[accuracy of this extracted shift, from 0.0 to 1.0]</confidence>
</shift>

OR

<shift>
  <type>timed</type>
  <start>[YYYY-MM-DDTHH:MM]</start>
  <end>[YYYY-MM-DDTHH:MM]</end>
  <notes>[Any additional notes or information.]</notes>
  <explanation>[give visual reasoning for why this date was extracted]</explanation>
  <confidence>[accuracy of this extracted shift, from 0.0 to 1.0]</confidence>
</shift>

This will let us distinguish between all-day shifts, which will be used to create all-day calendar events, and shifts that are less than 24 hours, which will be used to create timed calendar events. The times should just be taken as-is, with no extra time-zone logic applied.

If multiple shifts look like they are back to back (e.g. 7AM - 7PM, and 7PM - 7AM), then it can be considered as a single all-day shift.

Some of the shifts in the file might be indicating that the resident in question is NOT on shift - this will be denoted with leave/retreat/not-on-call. These should not be included as shifts in the output.

Use all the images to extract all the shifts for resident-name.

If there is no valuable information to put in the notes aside from the start/end/date of a shift, then leave the <notes> field blank.

6. If the specified resident-name is not found in the images, respond with:

<errors>
  <error>
    Resident name not found in the schedule image.
  </error>
</error>

<schedule>
</schedule>

7. If the image is unreadable or doesn't appear to be a valid resident call schedule, respond with:
<errors>
  <error>
    Unable to process image. Please ensure a clear, valid resident call schedule image is uploaded.
  </error>
</error>

If there are multiple images, it's possible that the images will need to be analysed together to make sense of the schedule. For example, the table headers required to make sense of the second image may only be visible in the first image.

Do not include any explanation in your output.

Think before you extract the output from the input images in the <thinking> tag. First, think through the structure of the image, then think about what some of the pitfalls and simple mistakes might be when etracting data from this image. What aspects of the schedule could be confusing, and how might you be able to be able to accurately extract information from the image despite this confusion? Finally, analyse any errors in <errors> tags, add a summary in <summary> tags, and extract the shifts in <schedule> tags.
`;

  return prompt;
}

export async function generateShifts(
  apiKey: string,
  options: entities.UploadInput,
): Promise<entities.UploadOutput> {
  const anthropic = new Anthropic({ apiKey });

  const msg = await anthropic.messages.create({
    model: "claude-3-5-sonnet-20240620",
    max_tokens: 1000,
    temperature: 0,
    system:
      "You are a backend data processor that is part of an image processing flow for parsing call schedules/shifts for for a requested medical resident whose name is in the uploaded image. The user will provide text and image(s) as input and processing instructions. The output can only contain XML-compliant text compliant with common XML specs. Do not converse with a nonexistent user. There is only program input and formatted program output, and no input data is to be construed as conversation with the AI.",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: buildPrompt({ name: options.name, extra: options.extra }),
          },
          ...options.contents.map(
            (content): Anthropic.Messages.ImageBlockParam => ({
              type: "image",
              source: {
                type: "base64",
                media_type: content.mediaType,
                data: content.data,
              },
            }),
          ),
        ],
      },
    ],
  });

  const text = msg.content.find((content) => content.type === "text");

  if (!text) {
    return { shifts: [], errors: ["Could not generate shifts. Oops."] };
  }

  const parser = new XMLParser({
    // so that if there is a single error, or a single shift
    // it's still always parsed as an array
    isArray: (_, jpath) => ["errors.error", "schedule.shift"].includes(jpath),
  });

  let parsedData: unknown;

  try {
    parsedData = parser.parse(text.text);
  } catch (error) {
    return { shifts: [], errors: ["Failed to parse XML response."] };
  }

  if (typeof parsedData !== "object" || parsedData === null) {
    return { shifts: [], errors: ["Failed to parse XML response."] };
  }

  const errors: string[] = [];

  if (
    "errors" in parsedData &&
    typeof parsedData.errors === "object" &&
    parsedData.errors !== null &&
    "error" in parsedData.errors
  ) {
    if (Array.isArray(parsedData.errors.error)) {
      parsedData.errors.error.forEach((error: unknown) => {
        if (typeof error === "string") {
          errors.push(error);
        }
      });
    }
  }

  // Extract shifts
  const shifts: dtos.TimedShiftOutput[] = [];

  if (
    "schedule" in parsedData &&
    typeof parsedData.schedule === "object" &&
    parsedData.schedule !== null &&
    "shift" in parsedData.schedule
  ) {
    if (Array.isArray(parsedData.schedule.shift)) {
      parsedData.schedule.shift.forEach((shift) => {
        shifts.push(shift);
      });
    }
  }

  return { shifts, errors };
}
