import { isError } from "@/helpers/result";

import * as models from "@/models";
import * as services from "@/services";
import * as dtos from "@/dtos";
import * as entities from "@/entities";

import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/server-runtime";

import Anthropic from "@anthropic-ai/sdk";

import invariant from "tiny-invariant";
import { validate } from "uuid";
import {
  Form,
  useLoaderData,
  useBeforeUnload,
  useActionData,
} from "@remix-run/react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectValue,
  SelectTrigger,
  SelectItem,
} from "@/components/ui/select";
import {
  FileUploader,
  FileUploaderContent,
  FileInput,
} from "@/components/ui/extension/file-uploader";
import { useCallback, useState } from "react";
import { DropzoneOptions } from "react-dropzone-esm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrashIcon } from "@radix-ui/react-icons";
import { Textarea } from "@/components/ui/textarea";

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { DB } = context.cloudflare.env;

  const listOneUser = models.users.listOne.bind(null, DB);
  const listLocations = models.locations.list.bind(null, DB);

  const publicUserId = params.publicUserId;

  invariant(publicUserId, "publicUserId not found");

  if (!validate(publicUserId)) {
    throw new Error("publicUserID must be a valid UUID");
  }

  const result = await services.locations.list(listOneUser, listLocations, {
    publicUserId,
  });

  if (isError(result)) {
    throw new Error(result.error);
  }

  const locations: dtos.Location[] = result.value.map(
    (location): dtos.Location => ({
      title: location.title,
      publicId: location.publicId,
      createdAt: location.createdAt,
    }),
  );

  return json({ locations });
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 5_000_000,
  });

  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler,
  );

  console.log(context.cloudflare.env);

  const anthropic = new Anthropic({
    apiKey: context.cloudflare.env.ANTHROPIC_API_KEY,
  });

  const name = formData.get("name");
  invariant(typeof name === "string");

  const publicLocationId = formData.get("publicLocationId");
  invariant(typeof publicLocationId === "string");

  const extra = formData.get("extra");
  invariant(typeof extra === "string" || extra === null);

  const images = formData.getAll("images[]");

  // to be uploaded to claude
  const contents: { data: string; mediaType: entities.ValidMediaType }[] =
    await Promise.all(
      images.flatMap((image) => {
        if (image instanceof File === false) {
          return [];
        }

        const matchingValidMediaType = entities.validMediaTypes.find(
          (mt) => mt === image.type,
        );

        if (!matchingValidMediaType) {
          return [];
        }

        return image.arrayBuffer().then((buffer) => {
          const data = Buffer.from(buffer).toString("base64");
          return {
            data,
            mediaType: matchingValidMediaType,
          };
        });
      }),
    );

  const prompt = `

The user has requested the schedule for the following resident:

<resident-name>
${name}
</resident-name>

Here is additional information that will be useful when processing the images:

<extra>
  ${extra}
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

This will let us distinguish between all-day shifts, which will be used to create all-day calendar events, and shifts that are less than 24 hours, which will be used to create timed calendar events.

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
            text: prompt,
          },
          ...contents.map(
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

  console.log(msg);
  console.log(JSON.stringify(msg));

  const texts = msg.content.flatMap((content) => {
    content.type === "text" ? content.text : [];
  });

  return json({ texts });
};

export default function Page() {
  const { locations } = useLoaderData<typeof loader>();

  const [uploads, setUploads] = useState<{ file: File; url: string }[]>([]);

  const actionData = useActionData<typeof action>();

  const dropZoneConfig = {
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
    },
    multiple: true,
    maxFiles: 8,
    maxSize: 10 * 1024 * 1024,
    noDrag: true, // for now
  } satisfies DropzoneOptions;

  const handleChangeFiles = useCallback((files: File[] | null) => {
    if (!files) {
      setUploads([]);
      return;
    }

    const newUploads = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));

    setUploads(newUploads);
  }, []);

  const handleRemoveUpload = useCallback((url: string) => {
    setUploads((currUploads) =>
      currUploads.filter((upload) => upload.url !== url),
    );

    URL.revokeObjectURL(url);
  }, []);

  useBeforeUnload(
    useCallback(() => {
      uploads.forEach((upload) => {
        URL.revokeObjectURL(upload.url);
      });
    }, [uploads]),
  );

  return (
    <Form
      method="POST"
      encType="multipart/form-data"
      className="flex flex-col gap-4"
    >
      <fieldset>
        <FileUploader
          value={uploads.map((u) => u.file)}
          onValueChange={handleChangeFiles}
          dropzoneOptions={dropZoneConfig}
          className="gap-8"
        >
          <FileInput className="flex flex-col items-center justify-center rounded-xl border border-dashed border-muted px-8 py-12 hover:border-muted-foreground transition">
            <p className="text-xl font-bold">Upload an Image</p>
            <p className="text-sm text-muted-foreground">
              Click anywhere to upload up to 4 images
            </p>
          </FileInput>
          <FileUploaderContent className="flex flex-row flex-wrap justify-center gap-4">
            {uploads.map((u) => (
              <div className="group relative" key={u.url}>
                <img
                  key={u.url}
                  className="size-36 rounded-xl object-cover border border-muted"
                  alt="schedule screenshot"
                  src={u.url}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    variant="outline"
                    onClick={() => handleRemoveUpload(u.url)}
                    size="icon"
                  >
                    <TrashIcon />
                  </Button>
                </div>
              </div>
            ))}
          </FileUploaderContent>
        </FileUploader>
      </fieldset>

      <fieldset>
        <Label htmlFor="location">Location</Label>
        <Select name="publicLocationId">
          <SelectTrigger>
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            {locations.map((location) => (
              <SelectItem key={location.publicId} value={location.publicId}>
                {location.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </fieldset>

      <fieldset>
        <Label htmlFor="name">Resident Name</Label>
        <Input type="text" required name="name" />
      </fieldset>

      <fieldset>
        <Label htmlFor="extra">Other Information</Label>
        <Textarea name="extra" />
      </fieldset>

      <Button type="submit">Upload</Button>
      <p>{JSON.stringify(actionData?.texts)}</p>
    </Form>
  );
}
