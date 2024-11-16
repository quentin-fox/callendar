import { isError } from "@/helpers/result";

import * as services from "@/services";
import * as dtos from "@/dtos";
import * as middleware from "@/middleware/index.server";
import * as models from "@/models";

import {
  ActionFunctionArgs,
  json,
  LoaderFunctionArgs,
  redirect,
} from "@remix-run/server-runtime";

import invariant from "tiny-invariant";

import { differenceInHours, format, parse, addDays } from "date-fns";
import { Form, useLoaderData } from "@remix-run/react";
import { useState } from "react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectValue,
  SelectTrigger,
  SelectItem,
} from "@/components/ui/select";
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

import { DotsHorizontalIcon } from "@radix-ui/react-icons";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenuSeparator } from "@radix-ui/react-dropdown-menu";
import { Separator } from "@/components/ui/separator";
import TableEmptyCard from "@/components/TableEmptyCard";
import { cn } from "@/lib/utils";
import TableFooterButtons from "@/components/TableFooterButtons";

export const handle = {
  breadcrumb: () => {
    return {
      title: "Add Schedule",
      to: "/schedules/add",
    };
  },
};

export const loader = async ({
  context,
  params,
  request,
}: LoaderFunctionArgs) => {
  const user = await middleware.user.middleware({ params, context });

  const { DB } = context.cloudflare.env;

  const listLocations = models.locations.list.bind(null, DB);

  const result = await services.locations.list(listLocations, user);

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

  let initialShifts: (dtos.AllDayShiftOutput | dtos.TimedShiftOutput)[] = [];

  const url = new URL(request.url);
  const searchParamsShifts = url.searchParams.get("shifts");

  if (searchParamsShifts) {
    try {
      const shiftsStr = Buffer.from(searchParamsShifts, "base64").toString(
        "utf8",
      );

      initialShifts = JSON.parse(shiftsStr);
      // TODO should probably validate here but oh well
    } catch (err) {
      // not all that relevant
    }
  }

  return json({ locations, initialShifts });
};

export const action = async ({
  context,
  request,
  params,
}: ActionFunctionArgs) => {
  const user = await middleware.user.middleware({ params, context });

  const { DB } = context.cloudflare.env;

  const listLocations = models.locations.list.bind(null, DB);
  const insertSchedule = models.schedules.insert.bind(null, DB);
  const insertManyShifts = models.shifts.insertMany.bind(null, DB);

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
  const isDraft = isDraftStr === "on";

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

  console.log(numShifts);

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
    listLocations,
    insertSchedule,
    insertManyShifts,
    user,
    {
      publicLocationId,
      title,
      description,
      isDraft,
      shifts,
    },
  );

  if (isError(result)) {
    return json({ error: result.error });
  }

  // TODO redirect to the single schedule page
  return redirect("/" + user.publicId + "/schedules");
};

export default function Page() {
  const { locations, initialShifts } = useLoaderData<typeof loader>();

  const [shifts, setShifts] = useState(initialShifts);

  const handleAddAllDayShift = () => {
    const now = new Date();

    const date = format(now, "yyyy-MM-dd");

    setShifts((prev) => [...prev, { type: "all-day", date }]);
  };

  const handleAddTimedShift = () => {
    const now = new Date();

    const start = format(now, "yyyy-MM-dd") + "T00:00";
    const end = format(addDays(now, 1), "yyyy-MM-dd") + "T00:00";

    setShifts((prev) => [...prev, { type: "timed", start, end }]);
  };

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

        const start = shift.date + "T00:00";

        const date = parse(shift.date, "yyyy-MM-dd", new Date());

        const end = format(addDays(date, 1), "yyyy-MM-dd") + "T00:00";

        return {
          type: "timed",
          start,
          end,
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

        // need to have quotes around the T so it's special cased
        const start = parse(shift.start, "yyyy-MM-dd'T'HH:mm", new Date());

        return {
          type: "all-day",
          date: format(start, "yyyy-MM-dd"),
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
    num: "w-12",
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
              {locations.map((location) => (
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
          <Checkbox id="isDraft" name="isDraft" defaultChecked={true} />
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

        <div
          className={cn(
            "flex flex-col min-h-80",
            shifts.length === 0 ? "justify-center" : "justify-start",
          )}
        >
          {shifts.length === 0 && (
            <TableEmptyCard
              title="No Shifts"
              description="Add a shift to the schedule to record when you are going to be working."
            >
              <Button
                type="button"
                variant={"default"}
                onClick={handleAddAllDayShift}
              >
                Add All-Day Shift
              </Button>
              <Button
                type="button"
                variant={"default"}
                onClick={handleAddTimedShift}
              >
                Add Timed Shift
              </Button>
            </TableEmptyCard>
          )}

          {shifts.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={COLUMN_CLASSES.num}>#</TableHead>
                    <TableHead className={COLUMN_CLASSES.type}>
                      Shift Type
                    </TableHead>
                    <TableHead className={COLUMN_CLASSES.duration}>
                      Duration (h)
                    </TableHead>
                    <TableHead className={COLUMN_CLASSES.start}>
                      Start
                    </TableHead>
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
                          <TableCell className={COLUMN_CLASSES.num}>
                            {index + 1}
                          </TableCell>
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
                          <TableCell className={COLUMN_CLASSES.end}>
                            -
                          </TableCell>
                          <TableCell className={COLUMN_CLASSES.actions}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                  <DotsHorizontalIcon />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
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
                                  onSelect={() =>
                                    handleRemoveShift(shift, index)
                                  }
                                >
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    const duration = differenceInHours(shift.end, shift.start, {
                      roundingMethod: "floor",
                    });

                    return (
                      <TableRow key={index}>
                        <Input
                          type="hidden"
                          name={`type-${index}`}
                          value={shift.type}
                          readOnly
                        />
                        <TableCell className={COLUMN_CLASSES.num}>
                          {index + 1}
                        </TableCell>
                        <TableCell className={COLUMN_CLASSES.type}>
                          Timed
                        </TableCell>
                        <TableCell className={COLUMN_CLASSES.duration}>
                          {duration}
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
                            // don't need the max on the first input
                            min={shift.start}
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
              <TableFooterButtons>
                <Button
                  type="button"
                  variant={"default"}
                  onClick={handleAddAllDayShift}
                >
                  Add All-Day Shift
                </Button>
                <Button
                  type="button"
                  variant={"default"}
                  onClick={handleAddTimedShift}
                >
                  Add Timed Shift
                </Button>
              </TableFooterButtons>
            </>
          )}
        </div>
        <Button type="submit">Save</Button>
      </Form>
    </>
  );
}
