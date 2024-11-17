import { unwrap } from "@/helpers/result";

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

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { differenceInHours, format } from "date-fns";
import TableFooterButtons from "@/components/TableFooterButtons";
import { toZonedTime } from "date-fns-tz";

export const handle = {
  breadcrumb: () => {
    return {
      title: "Shifts",
      to: "/shifts",
    };
  },
};

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { DB } = context.cloudflare.env;

  const user = await middleware.user.middleware({ context, params });

  const listLocations = models.locations.list.bind(null, DB);
  const listSchedules = models.schedules.list.bind(null, DB);
  const listShiftsByUser = models.shifts.listByUser.bind(null, DB);

  const [locationsResult, shiftsResult, schedulesResult] = await Promise.all([
    services.locations.list(listLocations, user).then(unwrap),
    services.shifts.listByUser(listShiftsByUser, user).then(unwrap),
    services.schedules.list(listSchedules, user).then(unwrap),
  ]);

  const shifts: dtos.Shift[] = shiftsResult.map((shift) => {
    const schedule = schedulesResult.find((s) => s.id === shift.scheduleId);

    const scheduleLocation =
      schedule && schedule.locationId
        ? locationsResult.find((l) => l.id === schedule.locationId)
        : null;

    const location = shift.locationId
      ? locationsResult.find((l) => l.id === shift.locationId)
      : null;

    return dtos.fromShiftEntity(
      shift,
      location ?? null,
      schedule ?? null,
      scheduleLocation ?? null,
    );
  });

  return json({ shifts });
};

export default function Page() {
  const { shifts } = useLoaderData<typeof loader>();

  const { user } = useOutletUserContext();

  return (
    <div className="flex flex-col items-center">
      <Outlet context={{ user }} />
      {shifts.length === 0 && (
        <TableEmptyCard.Spacing>
          <TableEmptyCard
            title="No Locations"
            description="Add a location to associate a schedule and/or shift with a hospital, clinic, etc."
          >
            <Link to="add">
              <Button type="button" variant={"default"}>
                Add a Location
              </Button>
            </Link>
          </TableEmptyCard>
        </TableEmptyCard.Spacing>
      )}
      {shifts.length > 0 && (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Summary</TableHead>
                <TableHead>Schedule</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.publicId}>
                  <TableCell>{buildSummary(shift, user.timeZone)}</TableCell>
                  <TableCell>{shift.schedule?.title ?? "-"}</TableCell>
                  <TableCell>{shift.location?.title ?? "-"}</TableCell>
                  <TableCell>
                    {shift.claimed ? "Claimed" : "Unclaimed"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <DotsHorizontalIcon />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <Link to={shift.publicId + "/edit"}>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                        </Link>
                        <DropdownMenuSeparator />
                        <Link to={shift.publicId + "/remove"}>
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
            <Link to="add">
              <Button type="button" variant={"default"}>
                Add a Location
              </Button>
            </Link>
          </TableFooterButtons>
        </>
      )}
    </div>
  );
}

function buildSummary(shift: dtos.Shift, timeZone: string): string {
  // 24h shift on Nov 12, 2024
  // 6pm - 10pm on Nov 5, 2024
  // 6pm - 10pm on Nov 5 - Nov 8, 2024

  const zonedStart = toZonedTime(shift.start, timeZone);

  const zonedEnd = toZonedTime(shift.end, timeZone);

  if (shift.isAllDay) {
    return format(zonedStart, "MMM d, yyyy") + " (all-day)";
  }

  const duration = differenceInHours(zonedEnd, zonedStart, {
    roundingMethod: "floor",
  });

  return (
    format(zonedStart, "MMM d, yyyy") +
    " (" +
    duration +
    "h at " +
    format(zonedStart, "h:mm a") +
    ")"
  );
}
