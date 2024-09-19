import { isError } from "@/helpers/result";

import * as models from "@/models";
import * as services from "@/services";
import * as dtos from "@/dtos";

import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/server-runtime";

import invariant from "tiny-invariant";
import { validate } from "uuid";
import {
  Form,
  useLoaderData,
  useBeforeUnload,
  useFetcher,
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
import { Checkbox } from "@/components/ui/checkbox";

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
import { Separator } from "@/components/ui/separator";

export const handle = {
  breadcrumb: () => {
    return {
      title: "New Upload",
      to: "/uploads/new",
    };
  },
};

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

export const action = async ({
  context,
  request,
  params,
}: ActionFunctionArgs) => {
  const { DB } = context.cloudflare.env;

  const listOneUser = models.users.listOne.bind(null, DB);
  const listLocations = models.locations.list.bind(null, DB);
  const insertSchedule = models.schedules.insert.bind(null, DB);
  const insertManyShifts = models.shifts.insertMany.bind(null, DB);

  const publicUserId = params.publicUserId;

  invariant(publicUserId, "publicUserId not found");

  if (!validate(publicUserId)) {
    throw new Error("publicUserID must be a valid UUID");
  }

  const formData = await request.formData();

  const publicLocationId = formData.get("publicLocationId");
  const numShiftsStr = formData.get("numShifts");

  invariant(typeof publicLocationId === "string", "publicLocationId not found");
  invariant(typeof numShiftsStr == "string", "numShifts not found");

  const numShifts = Number(numShiftsStr);

  invariant(!Number.isNaN(numShifts), "numShifts is NaN");
  invariant(Number.isInteger(numShifts), "numShifts is not an integer");
  invariant(numShifts > 0, "numShifts must be positive");

  const title = formData.get("title");
  invariant(typeof title == "string", "title not found");

  const description = formData.get("description");
  invariant(typeof description == "string", "description not found");

  const isDraftStr = formData.get("isDraft");
  invariant(typeof description == "string", "description not found");

  const isDraft =
    isDraftStr === "true" ? true : isDraftStr === "false" ? false : null;

  invariant(typeof isDraft === "boolean", "isDraft must be true/false");

  const shifts: (
    | {
        type: "all-day";
        date: string;
      }
    | {
        type: "timed";
        start: string;
        end: string;
      }
  )[] = [];

  for (let i = 0; i < numShifts; i++) {
    const type = formData.get(`type-${i}`);

    invariant(typeof type === "string", `type-${i} not found`);

    invariant(
      type === "all-day" || type === "timed",
      `type-${i} must be either "all-day" or "timed"`,
    );

    if (type === "all-day") {
      const date = formData.get(`date-${i}`);
      invariant(typeof date === "string", `date-${i} not found`);

      shifts.push({ type: "all-day", date });
    } else {
      const start = formData.get(`start-${i}`);
      invariant(typeof start === "string", `start-${i} not found`);

      const end = formData.get(`end-${i}`);
      invariant(typeof end === "string", `end-${i} not found`);

      shifts.push({ type: "timed", start, end });
    }
  }

  const result = await services.schedules.insert(
    listOneUser,
    listLocations,
    insertSchedule,
    insertManyShifts,
    {
      publicLocationId,
      publicUserId,
      title,
      description,
      isDraft,
      shifts,
    },
  );

  if (isError(result)) {
    return json({ error: result.error });
  }

  const publicScheduleId = result.value;

  return redirect("/" + publicUserId + "/schedules/" + publicScheduleId);
};

export default function Page() {
  const { locations } = useLoaderData<typeof loader>();

  const [uploads, setUploads] = useState<{ file: File; url: string }[]>([]);

  const processUploadFetcher = useFetcher<
    | {
        shifts: (dtos.AllDayShiftOutput | dtos.TimedShiftOutput)[];
        receivedAt: number;
        error: null;
      }
    | {
        shifts: null;
        receivedAt: number;
        error: string;
      }
  >();

  const processSectionDisabled = !!processUploadFetcher.data?.shifts;
  const processButtonDisabled =
    processSectionDisabled || processUploadFetcher.state !== "idle";

  const dropZoneConfig = {
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
    },
    multiple: true,
    maxFiles: 8,
    maxSize: 10 * 1024 * 1024,
    noDrag: true, // for now
    disabled: processSectionDisabled,
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
      {processUploadFetcher.data && processUploadFetcher.data.error && (
        <ErrorAlert error={processUploadFetcher.data.error} />
      )}
      <processUploadFetcher.Form
        method="POST"
        relative="path"
        action="../process"
        encType="multipart/form-data"
        className="flex flex-col gap-4"
      >
        <fieldset disabled={processSectionDisabled}>
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

        <fieldset disabled={processSectionDisabled}>
          <Label htmlFor="name">Resident Name</Label>
          <Input id="name" type="text" required name="name" />
        </fieldset>

        <fieldset disabled={processSectionDisabled}>
          <Label htmlFor="extra">Other Information</Label>
          <Textarea id="extra" name="extra" />
        </fieldset>

        <Button type="submit" disabled={processButtonDisabled}>
          {processUploadFetcher.data?.shifts
            ? "Uploaded"
            : processUploadFetcher.state === "idle"
              ? "Upload"
              : "Uploading..."}
        </Button>
      </processUploadFetcher.Form>
      {!!processUploadFetcher.data?.shifts && (
        <ShiftsForm
          key={processUploadFetcher.data.receivedAt}
          locations={locations}
          shifts={processUploadFetcher.data.shifts}
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
    <>
      <Separator />
      <Form method="POST" className="flex flex-col gap-4">
        <Input type="hidden" name="numShifts" value={shifts.length} readOnly />

        <fieldset>
          <Label>Location</Label>
          <Select name="publicLocationId" required>
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

        <fieldset>
          <Label htmlFor="title">Schedule Title</Label>
          <Input id="title" type="text" required name="title" />
        </fieldset>

        <fieldset>
          <Label htmlFor="description">Schedule Description</Label>
          <Textarea id="description" name="description" />
        </fieldset>

        <fieldset className="items-top flex space-x-2">
          <Checkbox id="isDraft" defaultChecked={true} />
          <div className="grid gap-1.5 leading-none">
            <label
              htmlFor="isDraft"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Draft
            </label>
            <p className="text-sm text-muted-foreground">
              Leave this checked to indicate that this schedule is likely to
              change in the future.
            </p>
          </div>
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
                    <Input
                      type="hidden"
                      name={`type-${index}`}
                      value={shift.type}
                      readOnly
                    />
                    <TableCell className={COLUMN_CLASSES.type}>
                      All-Day
                    </TableCell>
                    <TableCell className={COLUMN_CLASSES.duration}>
                      24
                    </TableCell>
                    <TableCell className={COLUMN_CLASSES.start}>
                      <Input
                        id={`date-${index}`}
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
                        name={`date-${index}`}
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
                  <Input
                    type="hidden"
                    name={`type-${index}`}
                    value={shift.type}
                    readOnly
                  />
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
                          onSelect={() =>
                            handleChangeToAllDayShift(shift, index)
                          }
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
    </>
  );
}
