import { unwrap } from "@/helpers/result";

import * as models from "@/models";
import * as services from "@/services";
import * as dtos from "@/dtos";
import * as middleware from "@/middleware/index.server";

import { Link, Outlet, useLoaderData, useSearchParams } from "@remix-run/react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isSameDay, isSameMonth, isSameYear } from "date-fns";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";

import { Badge } from "@/components/ui/badge";
import HeaderButtons from "@/components/HeaderButtons";
import { cn } from "@/lib/utils";

export const handle = {
  breadcrumb: () => {
    return {
      title: "Schedules",
      to: "/schedules",
      grid: true,
    };
  },
};

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const user = await middleware.user.middleware({ params, context });

  const { DB } = context.cloudflare.env;

  const listSchedules = models.schedules.list.bind(null, DB);
  const listLocations = models.locations.list.bind(null, DB);

  const [schedulesResult, locationsResult] = await Promise.all([
    services.schedules.list(listSchedules, user).then(unwrap),
    services.locations.list(listLocations, user).then(unwrap),
  ]);

  const schedules: dtos.Schedule[] = schedulesResult.map((schedule) => {
    const location = locationsResult.find((l) => l.id === schedule.locationId);

    return dtos.fromScheduleEntity(schedule, location ?? null);
  });

  return json({ schedules });
};

export default function Page() {
  const { schedules } = useLoaderData<typeof loader>();

  const { user } = useOutletUserContext();

  const [searchParams] = useSearchParams();

  const highlightedPublicIds = searchParams.getAll("highlightedPublicId");

  return (
    <>
      <HeaderButtons>
        {schedules.length > 0 && (
          <>
            <Link to="../uploads/add" relative="path">
              <Button type="button" variant={"default"} size="sm">
                Upload a Schedule
              </Button>
            </Link>
            <Link to="add" relative="path">
              <Button type="button" variant={"default"} size="sm">
                Add Blank Schedule
              </Button>
            </Link>
          </>
        )}
      </HeaderButtons>

      <div
        className="flex flex-col items-center"
        style={{ gridArea: "main-content" }}
      >
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
              <Link to="add" relative="path">
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
                  <TableHead>Period</TableHead>
                  <TableHead className="text-center">Claimed</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedules.map((schedule) => (
                  <TableRow
                    className={cn(
                      highlightedPublicIds.includes(schedule.publicId) &&
                        "animate-color-pop",
                    )}
                    key={schedule.publicId}
                  >
                    <TableCell>{schedule.title}</TableCell>
                    <TableCell>
                      {buildPeriod(schedule, user.timeZone)}
                    </TableCell>
                    <TableCell className="text-center">
                      {schedule.numClaimedShifts} / {schedule.numShifts}
                    </TableCell>
                    <TableCell>{schedule.location?.title ?? "-"}</TableCell>
                    <TableCell>
                      {formatInTimeZone(
                        schedule.createdAt,
                        user.timeZone,
                        "PPp",
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {schedule.isDraft && (
                        <Badge
                          variant="outline"
                          className="text-chart5 border-chart5 bg-chart5/20"
                        >
                          Draft
                        </Badge>
                      )}
                      {!schedule.isDraft && (
                        <Badge
                          variant="outline"
                          className="text-chart4 border-chart4 bg-chart4/20"
                        >
                          Finalized
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="icon">
                            <DotsHorizontalIcon />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {schedule.numClaimedShifts < schedule.numShifts && (
                            <Link
                              to={schedule.publicId + "/mark-shifts-claimed"}
                            >
                              <DropdownMenuItem>
                                Mark All Shifts Claimed
                              </DropdownMenuItem>
                            </Link>
                          )}
                          {schedule.numUnclaimedShifts < schedule.numShifts && (
                            <Link
                              to={schedule.publicId + "/mark-shifts-unclaimed"}
                            >
                              <DropdownMenuItem>
                                Mark All Shifts Unclaimed
                              </DropdownMenuItem>
                            </Link>
                          )}
                          <Link to={schedule.publicId + "/edit"}>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                          </Link>
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
          </>
        )}
      </div>
    </>
  );
}

function buildPeriod(schedule: dtos.Schedule, timeZone: string): string {
  if (
    schedule.numShifts === 0 ||
    !schedule.firstShiftStart ||
    !schedule.lastShiftStart
  ) {
    return "-";
  }

  const zonedFirstShiftStart = toZonedTime(schedule.firstShiftStart, timeZone);
  const zonedLastShiftStart = toZonedTime(schedule.lastShiftStart, timeZone);

  if (isSameDay(zonedFirstShiftStart, zonedLastShiftStart)) {
    return formatInTimeZone(schedule.firstShiftStart, timeZone, "PP");
  }

  const formatter = buildFormatter(
    schedule.firstShiftStart,
    schedule.lastShiftStart,
    timeZone,
  );

  if (isSameMonth(zonedFirstShiftStart, zonedLastShiftStart)) {
    const firstFormat = "MMM d"; // Nov 15
    const lastFormat = "d yyyy";

    return formatter(firstFormat, lastFormat);
  }

  if (isSameYear(zonedFirstShiftStart, zonedLastShiftStart)) {
    const firstFormat = "MMM d";
    const lastFormat = "MMM d yyyy";

    return formatter(firstFormat, lastFormat);
  }

  const firstFormat = "MMM d yyyy";
  const lastFormat = "MMM d yyyy";

  return formatter(firstFormat, lastFormat);
}

function buildFormatter(
  firstShiftStart: string,
  lastShiftStart: string,
  timeZone: string,
) {
  return (firstFormat: string, lastFormat: string) => {
    return (
      formatInTimeZone(firstShiftStart, timeZone, firstFormat) +
      " - " +
      formatInTimeZone(lastShiftStart, timeZone, lastFormat)
    );
  };
}
