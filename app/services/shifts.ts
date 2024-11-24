import * as entities from "@/entities";

import { error, ok, Result } from "@/helpers/result";

import { addDays, parse, isValid } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { nanoid } from "nanoid";

export async function insert(
  listLocations: (options: { userId: number }) => Promise<entities.Location[]>,
  listSchedules: (options: { userId: number }) => Promise<entities.Schedule[]>,
  insertShift: (options: {
    publicId: string;
    createdAt: number;
    title: string;
    description: string;
    locationId: number;
    scheduleId: number | null;
    userId: number;
    start: number;
    end: number;
    isAllDay: boolean;
    claimed: boolean;
  }) => Promise<number>,
  user: entities.User,
  options: {
    publicLocationId: string | null;
    publicScheduleId: string | null;
    shift:
      | {
          type: "all-day";
          date: string;
        }
      | {
          type: "timed";
          start: string;
          end: string;
        };
    claimed: boolean;
  },
): Promise<Result<string, string>> {
  let start: number;
  let end: number;
  let isAllDay: boolean;

  if (options.shift.type === "all-day") {
    // this will give us the start of the day in UTC
    // i.e. it will actually be 00:00 at UTC
    const date = parse(options.shift.date, "yyyy-MM-dd", new Date());

    if (!isValid(date)) {
      return error("Invalid date.");
    }

    // this will change the timestamp to represent the start date in UTC
    const zonedStart = toZonedTime(date, user.timeZone);

    // do this once localized... might matter?
    const zonedEnd = addDays(zonedStart, 1);

    start = zonedStart.getTime();
    end = zonedEnd.getTime();
    isAllDay = true;
  } else {
    // this will get us the start/end that the user input
    // but as though we were in UTC
    // i.e. if they entered 16:00, this will be 16:00 in UTC
    // since the server runs on UTC
    const utcStart = parse(
      options.shift.start,
      "yyyy-MM-dd'T'HH:mm",
      new Date(),
    );

    if (!isValid(utcStart)) {
      return error("Invalid start.");
    }

    const utcEnd = parse(options.shift.end, "yyyy-MM-dd'T'HH:mm", new Date());

    if (!isValid(utcEnd)) {
      return error("Invalid end.");
    }

    const zonedStart = toZonedTime(utcStart, user.timeZone);
    const zonedEnd = toZonedTime(utcEnd, user.timeZone);

    start = zonedStart.getTime();
    end = zonedEnd.getTime();
    isAllDay = false;
  }

  const publicShiftId = `shi_${nanoid(12)}`;
  const createdAt = Date.now();

  let scheduleId: number | null;
  let locationId: number;

  if (options.publicScheduleId && options.publicLocationId) {
    return error("You cannot give a shift a schedule and a location.");
  } else if (options.publicScheduleId) {
    const schedules = await listSchedules({
      userId: user.id,
    });

    const schedule = schedules.find(
      (s) => s.publicId === options.publicScheduleId,
    );

    if (!schedule) {
      return error("Schedule does not exist.");
    }

    scheduleId = schedule.id;
    locationId = schedule.locationId;
  } else if (options.publicLocationId) {
    const locations = await listLocations({
      userId: user.id,
    });

    const location = locations.find(
      (s) => s.publicId === options.publicLocationId,
    );

    if (!location) {
      return error("Location does not exist.");
    }

    locationId = location.id;
    scheduleId = null;
  } else {
    return error("You must give a shift a schedule or a location.");
  }

  await insertShift({
    publicId: publicShiftId,
    createdAt,
    title: "",
    description: "",
    locationId,
    scheduleId,
    userId: user.id,
    start,
    end,
    isAllDay,
    claimed: options.claimed,
  });

  return ok(publicShiftId);
}

export async function listByUser(
  listShiftsByUser: (options: { userId: number }) => Promise<entities.Shift[]>,
  user: entities.User,
): Promise<Result<entities.Shift[], string>> {
  const shifts = await listShiftsByUser({
    userId: user.id,
  });

  return ok(shifts);
}

export async function listBySchedule(
  listSchedules: (options: { userId: number }) => Promise<entities.Schedule[]>,
  listShiftsBySchedule: (options: {
    scheduleId: number;
  }) => Promise<entities.Shift[]>,
  user: entities.User,
  options: { publicScheduleId: string },
): Promise<Result<entities.Shift[], string>> {
  const schedules = await listSchedules({
    userId: user.id,
  });

  const schedule = schedules.find(
    (s) => s.publicId === options.publicScheduleId,
  );

  if (!schedule) {
    return error("Schedule does not exist.");
  }

  const shifts = await listShiftsBySchedule({
    scheduleId: schedule.id,
  });

  return ok(shifts);
}

export async function remove(
  listShiftsByUser: (options: { userId: number }) => Promise<entities.Shift[]>,
  removeShift: (options: {
    shiftId: number;
    removedAt: number;
  }) => Promise<void>,
  user: entities.User,
  options: {
    publicShiftId: string;
  },
): Promise<Result<string, string>> {
  const shifts = await listShiftsByUser({
    userId: user.id,
  });

  const shift = shifts.find((s) => s.publicId === options.publicShiftId);

  if (!shift) {
    return error("Shift does not exist.");
  }

  const removedAt = Date.now();

  await removeShift({
    shiftId: shift.id,
    removedAt,
  });

  return ok(options.publicShiftId);
}

export async function markClaimed(
  listShiftsByUser: (options: { userId: number }) => Promise<entities.Shift[]>,
  markShiftClaimed: (options: { shiftId: number }) => Promise<void>,
  user: entities.User,
  options: {
    publicShiftId: string;
  },
): Promise<Result<string, string>> {
  const shifts = await listShiftsByUser({
    userId: user.id,
  });

  const shift = shifts.find((s) => s.publicId === options.publicShiftId);

  if (!shift) {
    return error("Shift does not exist.");
  }

  await markShiftClaimed({ shiftId: shift.id });

  return ok(options.publicShiftId);
}

export async function markUnclaimed(
  listShiftsByUser: (options: { userId: number }) => Promise<entities.Shift[]>,
  markShiftUnclaimed: (options: { shiftId: number }) => Promise<void>,
  user: entities.User,
  options: {
    publicShiftId: string;
  },
): Promise<Result<string, string>> {
  const shifts = await listShiftsByUser({
    userId: user.id,
  });

  const shift = shifts.find((s) => s.publicId === options.publicShiftId);

  if (!shift) {
    return error("Shift does not exist.");
  }

  await markShiftUnclaimed({ shiftId: shift.id });

  return ok(options.publicShiftId);
}

export async function markManyClaimed(
  listShiftsByUser: (options: { userId: number }) => Promise<entities.Shift[]>,
  markManyShiftsClaimed: (options: { shiftIds: number[] }) => Promise<void>,
  user: entities.User,
  options: {
    publicShiftIds: string[];
  },
): Promise<Result<string[], string>> {
  const shifts = await listShiftsByUser({
    userId: user.id,
  });

  const shiftIds = options.publicShiftIds.flatMap((publicShiftId) => {
    const shift = shifts.find((s) => s.publicId === publicShiftId);

    return shift ? shift.id : [];
  });

  if (shiftIds.length !== options.publicShiftIds.length) {
    return error("One or more shifts do not exist.");
  }

  await markManyShiftsClaimed({ shiftIds });

  return ok(options.publicShiftIds);
}

export async function markManyUnclaimed(
  listShiftsByUser: (options: { userId: number }) => Promise<entities.Shift[]>,
  markManyShiftsUnclaimed: (options: { shiftIds: number[] }) => Promise<void>,
  user: entities.User,
  options: {
    publicShiftIds: string[];
  },
): Promise<Result<string[], string>> {
  const shifts = await listShiftsByUser({
    userId: user.id,
  });

  const shiftIds = options.publicShiftIds.flatMap((publicShiftId) => {
    const shift = shifts.find((s) => s.publicId === publicShiftId);

    return shift ? shift.id : [];
  });

  if (shiftIds.length !== options.publicShiftIds.length) {
    return error("One or more shifts do not exist.");
  }

  await markManyShiftsUnclaimed({ shiftIds });

  return ok(options.publicShiftIds);
}

export async function markClaimedBySchedule(
  listSchedules: (options: { userId: number }) => Promise<entities.Schedule[]>,
  markShiftClaimedBySchedule: (options: {
    scheduleId: number;
  }) => Promise<void>,
  user: entities.User,
  options: {
    publicScheduleId: string;
  },
): Promise<Result<string, string>> {
  const schedules = await listSchedules({
    userId: user.id,
  });

  const schedule = schedules.find(
    (s) => s.publicId === options.publicScheduleId,
  );

  if (!schedule) {
    return error("Schedule does not exist.");
  }

  await markShiftClaimedBySchedule({ scheduleId: schedule.id });

  return ok(options.publicScheduleId);
}

export async function markUnclaimedBySchedule(
  listSchedules: (options: { userId: number }) => Promise<entities.Schedule[]>,
  markShiftUnclaimedBySchedule: (options: {
    scheduleId: number;
  }) => Promise<void>,
  user: entities.User,
  options: {
    publicScheduleId: string;
  },
): Promise<Result<string, string>> {
  const schedules = await listSchedules({
    userId: user.id,
  });

  const schedule = schedules.find(
    (s) => s.publicId === options.publicScheduleId,
  );

  if (!schedule) {
    return error("Schedule does not exist.");
  }

  await markShiftUnclaimedBySchedule({ scheduleId: schedule.id });

  return ok(options.publicScheduleId);
}
