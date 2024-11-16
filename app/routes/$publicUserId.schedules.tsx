import { isError } from "@/helpers/result";

import * as models from "@/models";
import * as services from "@/services";
import * as dtos from "@/dtos";
import * as middleware from "@/middleware/index.server";

import { Link, Outlet, useLoaderData } from "@remix-run/react";
import { json, LoaderFunctionArgs } from "@remix-run/server-runtime";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import TableEmptyCard from "@/components/TableEmptyCard";
import { Button } from "@/components/ui/button";
import { useOutletUserContext } from "@/context";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, isSameDay, isSameMonth, isSameYear } from "date-fns";
import { toZonedTime } from "date-fns-tz";

import TableFooterButtons from "@/components/TableFooterButtons";

export const handle = {
  breadcrumb: () => {
    return {
      title: "Schedules",
      to: "/schedules",
    };
  },
};

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const user = await middleware.user.middleware({ params, context });

  const { DB } = context.cloudflare.env;

  const listSchedules = models.schedules.list.bind(null, DB);

  const result = await services.schedules.list(listSchedules, user);

  if (isError(result)) {
    throw new Error(result.error);
  }

  const schedules: dtos.Schedule[] = result.value.map(
    (schedule): dtos.Schedule => ({
      publicId: schedule.publicId,
      createdAt: schedule.createdAt,
      modifiedAt: schedule.modifiedAt,
      title: schedule.title,
      description: schedule.description,
      location: {
        title: schedule.location.title,
        publicId: schedule.location.publicId,
        createdAt: schedule.location.createdAt,
      },
      isDraft: schedule.isDraft,
      numShifts: schedule.numShifts,
      firstShiftStart: schedule.firstShiftStart,
      lastShiftStart: schedule.lastShiftStart,
    }),
  );

  return json({ schedules });
};

export default function Page() {
  const { schedules } = useLoaderData<typeof loader>();

  const { user } = useOutletUserContext();

  return (
    <div className="flex flex-col items-center">
      <Outlet context={{ user }} />
      {schedules.length === 0 && (
        <TableEmptyCard.Spacing>
          <TableEmptyCard
            title="No Schedules"
            description="Upload your first schedule to start tracking your shifts."
          >
            <Link to="../uploads/add" relative="path">
              <Button type="button" variant={"default"}>
                Upload a Schedule
              </Button>
            </Link>
            <Link to="../add-schedule" relative="path">
              <Button type="button" variant={"default"}>
                Add Blank Schedule
              </Button>
            </Link>
          </TableEmptyCard>
        </TableEmptyCard.Spacing>
      )}
      {schedules.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.publicId}>
                  <TableCell>{schedule.title}</TableCell>
                  <TableCell>{format(schedule.createdAt, "PPp")}</TableCell>
                  <TableCell>{schedule.location.title}</TableCell>
                  <TableCell>{buildSummary(schedule, user.timeZone)}</TableCell>
                  <TableCell>
                    {schedule.isDraft ? "Draft" : "Finalized"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <DotsHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <Link to={schedule.publicId + "/edit"}>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <Link to={schedule.publicId + "/remove"}>
                          <DropdownMenuItem className="text-destructive">
                            Remove
                          </DropdownMenuItem>
                        </Link>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TableFooterButtons>
            <Link to="../uploads/add" relative="path">
              <Button type="button" variant={"default"}>
                Upload a Schedule
              </Button>
            </Link>
            <Link to="../add-schedule" relative="path">
              <Button type="button" variant={"default"}>
                Add Blank Schedule
              </Button>
            </Link>
          </TableFooterButtons>
        </>
      )}
    </div>
  );
}

function buildSummary(schedule: dtos.Schedule, timeZone: string): string {
  if (
    schedule.numShifts === 0 ||
    !schedule.firstShiftStart ||
    !schedule.lastShiftStart
  ) {
    return "0 shifts";
  }

  const zonedFirstShiftStart = toZonedTime(schedule.firstShiftStart, timeZone);
  const zonedLastShiftStart = toZonedTime(schedule.lastShiftStart, timeZone);

  if (schedule.numShifts === 1) {
    return "1 shift on " + format(zonedFirstShiftStart, "PP");
  }

  if (isSameDay(zonedFirstShiftStart, zonedLastShiftStart)) {
    return schedule.numShifts + " on " + format(zonedFirstShiftStart, "PP");
  }

  const base = schedule.numShifts + " shifts from ";

  const formatter = buildFormatter(
    base,
    zonedFirstShiftStart,
    zonedLastShiftStart,
  );

  if (isSameMonth(zonedFirstShiftStart, zonedLastShiftStart)) {
    const firstFormat = "LLL d"; // Nov 15
    const lastFormat = "d yyyy";

    return formatter(firstFormat, lastFormat);
  }

  if (isSameYear(zonedFirstShiftStart, zonedLastShiftStart)) {
    const firstFormat = "LLL d";
    const lastFormat = "LLL d yyyy";

    return formatter(firstFormat, lastFormat);
  }

  const firstFormat = "LLL d yyyy";
  const lastFormat = "LLL d yyyy";

  return formatter(firstFormat, lastFormat);
}

function buildFormatter(
  base: string,
  zonedFirstShiftStart: Date,
  zonedLastShiftStart: Date,
) {
  return (firstFormat: string, lastFormat: string) => {
    return (
      base +
      format(zonedFirstShiftStart, firstFormat) +
      " - " +
      format(zonedLastShiftStart, lastFormat)
    );
  };
}
