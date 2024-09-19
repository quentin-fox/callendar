import { isError } from "@/helpers/result";

import * as models from "@/models";
import * as services from "@/services";
import * as dtos from "@/dtos";
import * as entities from "@/entities";
import * as adapters from "@/adapters";

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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DotsHorizontalIcon, TrashIcon } from "@radix-ui/react-icons";

import { useCallback, useState } from "react";
import { DropzoneOptions } from "react-dropzone-esm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ErrorAlert from "@/components/ErrorAlert";
import { DropdownMenuSeparator } from "@radix-ui/react-dropdown-menu";

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
    maxPartSize: 5_000_000,
  });

  const formData = await unstable_parseMultipartFormData(
    request,
    uploadHandler,
  );

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

  const generateShifts = adapters.mock.generateShifts;

  const result = await services.uploads.process(generateShifts, {
    name,
    extra,
    contents,
  });

  if (isError(result)) {
    return json({
      shifts: null,
      receivedAt: Date.now(),
      error: result.error.join("\n"),
    });
  }

  if (result.value.length === 0) {
    return json({
      shifts: null,
      receivedAt: Date.now(),
      error: "No shifts could be created. Please try uploading another image.",
    });
  }

  const shifts: (dtos.AllDayShiftOutput | dtos.TimedShiftOutput)[] =
    result.value;

  return json({ shifts, receivedAt: Date.now(), error: null });
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
    <>
      {actionData && actionData.error && (
        <ErrorAlert error={actionData.error} />
      )}
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
          <Label htmlFor="name">Resident Name</Label>
          <Input type="text" required name="name" />
        </fieldset>

        <fieldset>
          <Label htmlFor="extra">Other Information</Label>
          <Textarea name="extra" />
        </fieldset>

        {(!actionData || actionData.error) && (
          <Button type="submit">Upload</Button>
        )}
      </Form>

      {actionData && actionData.shifts && (
        <ShiftsForm
          key={actionData.receivedAt}
          locations={locations}
          shifts={actionData.shifts}
        />
      )}
    </>
  );
}

function ShiftsForm(props: {
  locations: dtos.Location[];
  shifts: (dtos.AllDayShiftOutput | dtos.TimedShiftOutput)[];
}) {
  const [shifts, setShifts] = useState(props.shifts);

  const handleAllDayShiftDateChange = (
    shift: dtos.AllDayShiftOutput,
    index: number,
    newDate: string,
  ) => {
    setShifts((prev) =>
      prev.map((s, i) => {
        if (i !== index) {
          return s;
        }

        return { ...shift, date: newDate };
      }),
    );
  };

  const handleTimedShiftStartChange = (
    shift: dtos.TimedShiftOutput,
    index: number,
    newStart: string,
  ) => {
    setShifts((prev) =>
      prev.map((s, i) => {
        if (i !== index) {
          return s;
        }

        return { ...shift, start: newStart };
      }),
    );
  };

  const handleTimedShiftEndChange = (
    shift: dtos.TimedShiftOutput,
    index: number,
    newEnd: string,
  ) => {
    setShifts((prev) =>
      prev.map((s, i) => {
        if (i !== index) {
          return s;
        }
        return { ...shift, end: newEnd };
      }),
    );
  };

  const handleChangeToTimedShift = (
    shift: dtos.AllDayShiftOutput,
    index: number,
  ) => {
    setShifts((prev) =>
      prev.map((s, i) => {
        if (i !== index) {
          return s;
        }

        // TODO get just the time, not the full ISO timestamp
        return {
          type: "timed",
          start: new Date(shift.date).toISOString(),
          end: new Date(shift.date).toISOString(),
        };
      }),
    );
  };

  const handleChangeToAllDayShift = (
    shift: dtos.TimedShiftOutput,
    index: number,
  ) => {
    setShifts((prev) =>
      prev.map((s, i) => {
        if (i !== index) {
          return s;
        }

        return {
          type: "all-day",
          // TODO use date-fns for this
          date: shift.start.split("T")[0],
        };
      }),
    );
  };

  const handleRemoveShift = (
    shift: dtos.AllDayShiftOutput | dtos.TimedShiftOutput,
    index: number,
  ) => {
    setShifts((prev) => prev.filter((_, i) => i !== index));
  };

  const COLUMN_CLASSES = {
    type: "w-32",
    duration: "w-32",
    start: "w-[30%]",
    end: "w-[30%]",
    actions: "w-12",
  };

  return (
    <Form method="POST" className="flex flex-col gap-4">
      <fieldset>
        <Label htmlFor="location">Location</Label>
        <Select name="publicLocationId">
          <SelectTrigger>
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            {props.locations.map((location) => (
              <SelectItem key={location.publicId} value={location.publicId}>
                {location.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </fieldset>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className={COLUMN_CLASSES.type}>Shift Type</TableHead>
            <TableHead className={COLUMN_CLASSES.duration}>
              Duration (h)
            </TableHead>
            <TableHead className={COLUMN_CLASSES.start}>Start</TableHead>
            <TableHead className={COLUMN_CLASSES.end}>End</TableHead>
            <TableHead className={COLUMN_CLASSES.actions} />
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift, index) => {
            if (shift.type === "all-day") {
              return (
                <TableRow key={index}>
                  <TableCell className={COLUMN_CLASSES.type}>All-Day</TableCell>
                  <TableCell className={COLUMN_CLASSES.duration}>24</TableCell>
                  <TableCell className={COLUMN_CLASSES.start}>
                    <Input
                      id={`start-${index}`}
                      type="date"
                      value={shift.date}
                      onChange={(event) =>
                        handleAllDayShiftDateChange(
                          shift,
                          index,
                          event.target.value,
                        )
                      }
                      required
                      name={`start-${index}`}
                    />
                  </TableCell>
                  <TableCell className={COLUMN_CLASSES.end}>-</TableCell>
                  <TableCell className={COLUMN_CLASSES.actions}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <DotsHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Edit</DropdownMenuItem>
                        <DropdownMenuItem
                          onSelect={() =>
                            handleChangeToTimedShift(shift, index)
                          }
                        >
                          Change to Timed Shift
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onSelect={() => handleRemoveShift(shift, index)}
                        >
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            }

            return (
              <TableRow key={index}>
                <TableCell className={COLUMN_CLASSES.type}>Timed</TableCell>
                <TableCell className={COLUMN_CLASSES.duration}>
                  12{/* TODO calculate */}
                </TableCell>
                <TableCell className={COLUMN_CLASSES.start}>
                  <Input
                    id={`start-${index}`}
                    type="datetime-local"
                    value={shift.start}
                    onChange={(event) =>
                      handleTimedShiftStartChange(
                        shift,
                        index,
                        event.target.value,
                      )
                    }
                    required
                    name={`start-${index}`}
                  />
                </TableCell>
                <TableCell className={COLUMN_CLASSES.end}>
                  <Input
                    id={`end-${index}`}
                    type="datetime-local"
                    value={shift.end}
                    onChange={(event) =>
                      handleTimedShiftEndChange(
                        shift,
                        index,
                        event.target.value,
                      )
                    }
                    required
                    name={`end-${index}`}
                  />
                </TableCell>
                <TableCell className={COLUMN_CLASSES.actions}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon">
                        <DotsHorizontalIcon />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>Edit</DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => handleChangeToAllDayShift(shift, index)}
                      >
                        Change to All-Day Shift
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onSelect={() => handleRemoveShift(shift, index)}
                      >
                        Remove
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Button type="submit">Save</Button>
    </Form>
  );
}
