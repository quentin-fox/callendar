import { isError } from "@/helpers/result";

import * as models from "@/models";
import * as services from "@/services";
import * as dtos from "@/dtos";

import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
} from "@remix-run/server-runtime";

import invariant from "tiny-invariant";
import { validate } from "uuid";
import { Form, useLoaderData } from "@remix-run/react";
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
import { useCallback, useEffect, useState } from "react";
import { DropzoneOptions } from "react-dropzone-esm";
import { Button } from "@/components/ui/button";
import { TrashIcon } from "@radix-ui/react-icons";

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
  const fd = await request.formData();

  console.log([...fd.keys()]);

  return json({ value: null });
};

export default function Page() {
  const { locations } = useLoaderData<typeof loader>();

  const [uploads, setUploads] = useState<{ file: File; url: string }[]>([]);

  const dropZoneConfig = {
    accept: {
      "image/*": [".jpg", ".jpeg", ".png"],
    },
    multiple: true,
    maxFiles: 4,
    maxSize: 1 * 1024 * 1024,
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

    setUploads((prevUploads) => [...prevUploads, ...newUploads]);
  }, []);

  const handleRemoveUpload = useCallback((url: string) => {
    setUploads((currUploads) =>
      currUploads.filter((upload) => upload.url !== url),
    );
  }, []);

  useEffect(() => {
    const cb = (event: ClipboardEvent) => {
      if (!event.clipboardData?.files) {
        return;
      }

      const { files } = event.clipboardData;
      handleChangeFiles([...files]);
    };

    window.addEventListener("paste", cb);

    return () => {
      window.removeEventListener("paste", cb);
    };
  }, [handleChangeFiles]);

  return (
    <Form method="POST" encType="multipart/form-data">
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
              Click anywhere, paste, or drag-and-drop to upload an image
            </p>
          </FileInput>
          <FileUploaderContent className="flex flex-row flex-wrap justify-center gap-4">
            {uploads.map((u) => (
              <div className="group relative" key={u.url}>
                <img
                  key={u.url}
                  className="size-36 rounded-xl object-cover my-4 border border-muted"
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
        <Select>
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

      <Button type="submit">Upload</Button>
    </Form>
  );
}
