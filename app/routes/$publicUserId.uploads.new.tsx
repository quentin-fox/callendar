import { isError } from "@/helpers/result";

import * as models from "@/models";
import * as services from "@/services";
import * as dtos from "@/dtos";

import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  unstable_createMemoryUploadHandler,
  unstable_parseMultipartFormData,
} from "@remix-run/server-runtime";

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

export const action = async ({ request }: ActionFunctionArgs) => {
  const uploadHandler = unstable_createMemoryUploadHandler({
    maxPartSize: 500_000,
  });

  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler,
  );

  const name = formData.get("name");
  invariant(typeof name === "string");

  const publicLocationId = formData.get("publicLocationId");
  invariant(typeof publicLocationId === "string");

  const extra = formData.get("extra");
  invariant(typeof extra === "string" || extra === null);

  const images = formData.getAll("images[]");

  // to be uploaded to claude
  const contents: { data: string; type: string }[] = await Promise.all(
    images.flatMap((image) => {
      if (image instanceof File === false) {
        return [];
      }

      return image.arrayBuffer().then((buffer) => {
        const data = Buffer.from(buffer).toString("base64");
        return {
          data,
          type: image.type,
        };
      });
    }),
  );

  return json({ contents });
};

export default function Page() {
  const { locations } = useLoaderData<typeof loader>();

  const [uploads, setUploads] = useState<{ file: File; url: string }[]>([]);

  const actionData = useActionData<typeof action>();

  const dropZoneConfig = {
    accept: {
      "image/*": [".jpg", ".jpeg", ".png"],
    },
    multiple: true,
    maxFiles: 4,
    maxSize: 1 * 1024 * 1024,
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
      <p>{actionData?.contents[0]?.type}</p>
      <p>{actionData?.contents[0]?.data}</p>
    </Form>
  );
}
