import { LoaderFunctionArgs } from "@remix-run/server-runtime";

import * as models from "@/models";
import * as services from "@/services";
import * as middleware from "@/middleware/index.server";
import * as ics from "ics";
import * as dtos from "@/dtos";
import { unwrap } from "@/helpers/result";
import { getDate, getHours, getMinutes, getMonth, getYear } from "date-fns";

export const loader = async ({ params, context }: LoaderFunctionArgs) => {
  const user = await middleware.user.middleware({ params, context });

  const { DB } = context.cloudflare.env;

  const listLocations = models.locations.list.bind(null, DB);
  const listSchedules = models.schedules.list.bind(null, DB);
  const listShiftsByUser = models.shifts.listByUser.bind(null, DB);

  const [locationsResult, shiftsResult, schedulesResult] = await Promise.all([
    services.locations.list(listLocations, user).then(unwrap),
    services.shifts.listByUser(listShiftsByUser, user).then(unwrap),
    services.schedules.list(listSchedules, user).then(unwrap),
  ]);

  // go to dto shift so that we know we're not exposing anything we shouldn't
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

  const events = shifts.map((shift): ics.EventAttributes => {
    return {
      title: shift.schedule?.title ?? "Standalone Shift",
      location: shift.location?.title,
      productId: "net.callendar/ics",
      calName: "Callendar",
      startInputType: "utc",
      startOutputType: "utc",
      endInputType: "utc",
      endOutputType: "utc",
      status:
        shift.schedule && shift.schedule.isDraft ? "TENTATIVE" : "CONFIRMED",
      uid: shift.publicId + "@callendar", // on the off chance there is some weird collision
      start: buildDateArray(shift.start, shift.isAllDay),
      end: buildDateArray(shift.end, shift.isAllDay),
    };
  });

  const result = ics.createEvents(events);

  if (result.error) {
    throw result.error;
  }

  if (!result.value) {
    throw new Error("Could not create calendar events.");
  }

  const response = new Response(result.value, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=calendar.ics",
    },
  });

  return response;
};

// value is iso string
function buildDateArray(value: string, isAllDay: boolean): ics.DateArray {
  const date = new Date(value);

  const ymd: ics.DateArray = [getYear(date), getMonth(date) + 1, getDate(date)];

  if (isAllDay) {
    // ics wants 1-12
    // but Date/date-fns goes 0-11
    return ymd;
  }

  return [...ymd, getHours(date), getMinutes(date)];
}
