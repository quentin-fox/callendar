import { useCallback, useState } from "react";

import { isError } from "@/helpers/result";

import * as models from "@/models";
import * as services from "@/services";
import * as dtos from "@/dtos";
import * as entities from "@/entities";
import * as middleware from "@/middleware/index.server";
import * as adapters from "@/adapters";

import {
  ActionFunctionArgs,
  LoaderFunctionArgs,
  redirect,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/server-runtime";

import invariant from "tiny-invariant";
import {
  Form,
  useBeforeUnload,
  useActionData,
  useNavigation,
} from "@remix-run/react";
import { Label } from "@/components/ui/label";
import {
  FileUploader,
  FileUploaderContent,
  FileInput,
} from "@/components/ui/extension/file-uploader";

import ErrorAlert from "@/components/ErrorAlert";

import { TrashIcon } from "@radix-ui/react-icons";

import { DropzoneOptions } from "react-dropzone-esm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";

export const handle = {
  breadcrumb: () => {
    return {
      title: "New Upload",
      to: "/uploads/add",
    };
  },
};

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const user = await middleware.user.middleware({ params, context });

  const { DB } = context.cloudflare.env;

  const listLocations = models.locations.list.bind(null, DB);

  const result = await services.locations.list(listLocations, user);

  if (isError(result)) {
    throw new Error(result.error);
  }

  const locations: dtos.Location[] = result.value.map(dtos.fromLocationEntity);

  return { locations };
};

export const action = async ({ request, context }: ActionFunctionArgs) => {
  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 5_000_000,
  });

  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler,
  );

  const text = formData.get("text");
  invariant(typeof text === "string" || text === null);

  const name = formData.get("name");
  invariant(typeof name === "string");

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

  const { ANTHROPIC_API_KEY } = context.cloudflare.env;

  const generateShifts = adapters.anthropic.generateShifts.bind(
    null,
    ANTHROPIC_API_KEY,
  );

  const result = await services.uploads.process(generateShifts, {
    contents,
    text,
    name,
    extra,
  });

  if (isError(result)) {
    return { error: result.error.join("\n") };
  }

  if (result.value.length === 0) {
    return {
      error: "No shifts could be created. Please try uploading another image.",
    };
  }

  const shifts: (dtos.AllDayShiftOutput | dtos.TimedShiftOutput)[] =
    result.value;

  const encoded = Buffer.from(JSON.stringify(shifts)).toString("base64");

  return redirect("../schedules/add" + `?shifts=${encoded}`);
};

export default function Page() {
  const data = useActionData<typeof action>();
  const navigation = useNavigation();

  const [uploads, setUploads] = useState<{ file: File; url: string }[]>([]);

  const dropZoneConfig = {
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
    },
    multiple: true,
    maxFiles: 8,
    maxSize: 10 * 1024 * 1024,
    noDrag: true, // for now
    disabled: false,
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
    <>
      {data && data.error && <ErrorAlert error={data.error} />}
      <Form
        method="POST"
        encType="multipart/form-data"
        className="flex flex-col gap-8"
      >
        <div className="flex flex-col gap-4">
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

          <div className="flex flex-row gap-4 items-center">
            <Separator className="flex-1" orientation="horizontal" />
            <span className="text-xs text-border">AND / OR</span>
            <Separator className="flex-1" orientation="horizontal" />
          </div>

          <fieldset className="flex flex-col gap-2">
            <div>
              <Label htmlFor="text">Shifts</Label>
              <Textarea
                id="text"
                name="text"
                placeholder={
                  "One all-day shift on October 24th, another on October 28th, and then a 6 hour shift on October 30th starting at noon."
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the shifts that you want to upload as text, using plain
              language. Hint: you can use your device&apos;s built-in dictation
              to read out your schedule, and Callendar will parse it out into
              the correct list of shifts!
            </p>
          </fieldset>
        </div>

        <div className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <div>
              <Label htmlFor="name">Resident Name</Label>
              <Input id="name" type="text" required name="name" />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter the name of the resident as it appears on the schedule.
            </p>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <div>
              <Label htmlFor="extra">Other Information</Label>
              <Textarea id="extra" name="extra" />
            </div>
            <p className="text-xs text-muted-foreground">
              Provide any additional information required to generate the
              shifts, e.g. the year, the format of the upload, etc.
            </p>
          </fieldset>
        </div>

        <Button type="submit" disabled={navigation.state !== "idle"}>
          {navigation.state === "idle" ? "Upload" : "Uploading..."}
        </Button>
      </Form>
    </>
  );
}
