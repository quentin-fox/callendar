import React, { useCallback, useState, useRef, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";

import { useOutletUserContext } from "@/context";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { differenceInHours, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckedState } from "@radix-ui/react-checkbox";
import HeaderButtons from "@/components/HeaderButtons";
import { cn } from "@/lib/utils";

export const handle = {
  breadcrumb: () => {
    return {
      title: "Shifts",
      to: "/shifts",
      grid: true,
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

function getAllCheckedState(
  ids: string[],
  selected: Record<string, boolean>,
): CheckedState {
  const numChecked = Object.values(selected).filter(Boolean).length;

  switch (numChecked) {
    case 0:
      return false;
    case ids.length:
      return true;
    default:
      return "indeterminate";
  }
}

function useSelection(
  ids: string[],
  hash: string,
  initialState: Record<string, boolean> = {},
) {
  const [selectedMap, setSelectedMap] = useState(initialState);

  const lastSelectedIndexRef = useRef<number>(0); // To track the last selected item

  useEffect(() => {
    return () => {
      setSelectedMap({});
    };
  }, [hash]);

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, index: number) => {
      const currentChecked = event.currentTarget.value === "on";
      const checked = !currentChecked;

      if (!event.shiftKey) {
        lastSelectedIndexRef.current = index;
        setSelectedMap((prev) => ({ ...prev, [ids[index]]: checked }));
        return;
      }

      const startIndex = Math.min(lastSelectedIndexRef.current, index);
      const endIndex = Math.max(lastSelectedIndexRef.current, index);

      const selectedOverride = ids
        .slice(startIndex, endIndex + 1)
        .reduce<
          Record<string, boolean>
        >((prev, curr) => ({ ...prev, [curr]: checked }), {});

      lastSelectedIndexRef.current = index;

      setSelectedMap((prev) => ({ ...prev, ...selectedOverride }));
    },
    [ids],
  );

  const onAllCheckedChange = useCallback(
    (checked: CheckedState) => {
      if (checked === "indeterminate") {
        return;
      }

      if (checked === false) {
        setSelectedMap({});
      }

      if (checked === true) {
        const publicIds = ids.reduce(
          (prev, curr) => ({
            ...prev,
            [curr]: true,
          }),
          {},
        );

        setSelectedMap(publicIds);
      }
    },
    [ids],
  );

  return [
    selectedMap,
    onClick,
    getAllCheckedState(ids, selectedMap),
    onAllCheckedChange,
  ] as const;
}

export default function Page() {
  const { shifts } = useLoaderData<typeof loader>();

  const { user } = useOutletUserContext();

  const [searchParams] = useSearchParams();

  const hash = searchParams.get("hash") ?? "initial";

  const [publicIdSelectedMap, onClick, allCheckedState, onAllCheckedChange] =
    useSelection(
      shifts.map((s) => s.publicId),
      hash,
    );

  const unclaimedSelectedShifts = shifts.filter(
    (s) => publicIdSelectedMap[s.publicId] === true && s.claimed === false,
  );

  const claimedSelectedShifts = shifts.filter(
    (s) => publicIdSelectedMap[s.publicId] === true && s.claimed,
  );

  const numSelectedShifts =
    unclaimedSelectedShifts.length + claimedSelectedShifts.length;

  const selectedSearchParams = new URLSearchParams();

  for (const publicId in publicIdSelectedMap) {
    if (publicIdSelectedMap[publicId]) {
      selectedSearchParams.append("publicShiftId", publicId);
    }
  }

  const markAsUnclaimedDisabled = claimedSelectedShifts.length === 0;
  const markAsClaimedDisabled = unclaimedSelectedShifts.length === 0;

  const highlightedPublicIds = searchParams.getAll("highlightedPublicId");

  return (
    <>
      <HeaderButtons>
        {numSelectedShifts > 0 && (
          <p className="text-sm text-muted-foreground">
            {numSelectedShifts} selected
          </p>
        )}
        <Link
          to={"mark-many-claimed?" + selectedSearchParams.toString()}
          className={cn(markAsClaimedDisabled && "pointer-events-none")}
        >
          <Button
            type="button"
            variant={"default"}
            size="sm"
            disabled={markAsClaimedDisabled}
          >
            Mark as Claimed
          </Button>
        </Link>
        <Link
          to={"mark-many-unclaimed?" + selectedSearchParams.toString()}
          className={cn(markAsUnclaimedDisabled && "pointer-events-none")}
        >
          <Button
            type="button"
            variant={"default"}
            size="sm"
            disabled={markAsUnclaimedDisabled}
          >
            Mark as Unclaimed
          </Button>
        </Link>
        <Link to={"add"}>
          <Button type="button" variant={"default"} size="sm">
            Add a Shift
          </Button>
        </Link>
      </HeaderButtons>
      <div
        className="flex flex-col items-center"
        style={{ gridArea: "main-content" }}
      >
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
                  <TableHead className="w-[40px]">
                    <div className="flex items-center justify-start">
                      <Checkbox
                        id={"selected-all"}
                        name={"selected-all"}
                        checked={allCheckedState}
                        onCheckedChange={onAllCheckedChange}
                      />
                    </div>
                  </TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift, index) => (
                  <TableRow
                    className={cn(
                      highlightedPublicIds.includes(shift.publicId) &&
                        "animate-color-pop",
                    )}
                    key={shift.publicId}
                  >
                    <TableCell className="w-[40px]">
                      <div className="flex items-center justify-start">
                        <Checkbox
                          id={"selected" + shift.publicId}
                          name={"selected" + shift.publicId}
                          value={
                            publicIdSelectedMap[shift.publicId] ? "on" : "off"
                          }
                          checked={publicIdSelectedMap[shift.publicId] ?? false}
                          onClick={(e) => onClick(e, index)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>{buildSummary(shift, user.timeZone)}</TableCell>
                    <TableCell>{shift.schedule?.title ?? "-"}</TableCell>
                    <TableCell>{shift.location?.title ?? "-"}</TableCell>
                    <TableCell className="text-center">
                      {shift.claimed && (
                        <Badge
                          variant="outline"
                          className="text-chart1 border-chart1 bg-chart1/20"
                        >
                          Claimed
                        </Badge>
                      )}
                      {!shift.claimed && (
                        <Badge
                          variant="outline"
                          className="text-chart3 border-chart3 bg-chart3/20"
                        >
                          Unclaimed
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
                          <Link to={shift.publicId + "/edit"}>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                          </Link>
                          {!shift.claimed && (
                            <Link to={shift.publicId + "/mark-claimed"}>
                              <DropdownMenuItem>Mark Claimed</DropdownMenuItem>
                            </Link>
                          )}
                          {shift.claimed && (
                            <Link to={shift.publicId + "/mark-unclaimed"}>
                              <DropdownMenuItem>
                                Mark Unclaimed
                              </DropdownMenuItem>
                            </Link>
                          )}
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
          </>
        )}
      </div>
    </>
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
