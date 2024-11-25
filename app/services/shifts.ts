import * as entities from "@/entities";

import { error, ok, Result } from "@/helpers/result";

import { addDays, parse, isValid } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
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
    claimedAt: number | null;
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

  const claimedAt = options.claimed ? Date.now() : null;

  if (options.shift.type === "all-day") {
    // this will give us the start of the day in UTC
    // i.e. it will actually be 00:00 at UTC
    const date = parse(options.shift.date, "yyyy-MM-dd", new Date());

    if (!isValid(date)) {
      return error("Invalid date.");
    }

    const utcStart = fromZonedTime(date, user.timeZone);
    const utcEnd = addDays(utcStart, 1);

    start = utcStart.getTime();
    end = utcEnd.getTime();
    isAllDay = true;
  } else {
    const zonedStart = parse(
      options.shift.start,
      "yyyy-MM-dd'T'HH:mm",
      new Date(),
    );

    if (!isValid(zonedStart)) {
      return error("Invalid start.");
    }

    const zonedEnd = parse(options.shift.end, "yyyy-MM-dd'T'HH:mm", new Date());

    if (!isValid(zonedEnd)) {
      return error("Invalid end.");
    }

    const utcStart = fromZonedTime(zonedStart, user.timeZone);
    const utcEnd = fromZonedTime(zonedEnd, user.timeZone);

    start = utcStart.getTime();
    end = utcEnd.getTime();
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
    claimedAt,
  });

  return ok(publicShiftId);
}

export async function update(
  listLocations: (options: { userId: number }) => Promise<entities.Location[]>,
  listSchedules: (options: { userId: number }) => Promise<entities.Schedule[]>,
  listShiftsByUser: (options: { userId: number }) => Promise<entities.Shift[]>,
  updateShift: (options: {
    shiftId: number;
    updatedAt: number;
    title: string;
    description: string;
    locationId: number;
    scheduleId: number | null;
    start: number;
    end: number;
    isAllDay: boolean;
    claimedAt: number | null;
  }) => Promise<number>,
  user: entities.User,
  options: {
    publicShiftId: string;
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
  const claimedAt = options.claimed ? Date.now() : null;

  const shifts = await listShiftsByUser({ userId: user.id });

  const shift = shifts.find((s) => s.publicId === options.publicShiftId);

  if (!shift) {
    return error("Shift does not exist.");
  }

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

    const utcStart = fromZonedTime(date, user.timeZone);
    const utcEnd = addDays(utcStart, 1);

    start = utcStart.getTime();
    end = utcEnd.getTime();
    isAllDay = true;
  } else {
    const zonedStart = parse(
      options.shift.start,
      "yyyy-MM-dd'T'HH:mm",
      new Date(),
    );

    if (!isValid(zonedStart)) {
      return error("Invalid start.");
    }

    const zonedEnd = parse(options.shift.end, "yyyy-MM-dd'T'HH:mm", new Date());

    if (!isValid(zonedEnd)) {
      return error("Invalid end.");
    }

    const utcStart = fromZonedTime(zonedStart, user.timeZone);
    const utcEnd = fromZonedTime(zonedEnd, user.timeZone);

    start = utcStart.getTime();
    end = utcEnd.getTime();
    isAllDay = false;
  }

  const publicShiftId = `shi_${nanoid(12)}`;
  const updatedAt = Date.now();

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

  await updateShift({
    shiftId: shift.id,
    updatedAt,
    title: "",
    description: "",
    locationId,
    scheduleId,
    start,
    end,
    isAllDay,
    claimedAt,
  });

  return ok(publicShiftId);
}

export async function listOne(
  listShiftsByUser: (options: { userId: number }) => Promise<entities.Shift[]>,
  user: entities.User,
  options: { publicShiftId: string },
): Promise<Result<entities.Shift, string>> {
  const shifts = await listShiftsByUser({
    userId: user.id,
  });

  const shift = shifts.find((s) => s.publicId === options.publicShiftId);

  if (!shift) {
    return error("Shift does not exist.");
  }

  return ok(shift);
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
  markShiftClaimed: (options: {
    shiftId: number;
    claimedAt: number;
  }) => Promise<void>,
  user: entities.User,
  options: {
    publicShiftId: string;
  },
): Promise<Result<string, string>> {
  const claimedAt = Date.now();

  const shifts = await listShiftsByUser({
    userId: user.id,
  });

  const shift = shifts.find((s) => s.publicId === options.publicShiftId);

  if (!shift) {
    return error("Shift does not exist.");
  }

  await markShiftClaimed({ shiftId: shift.id, claimedAt });

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
  markManyShiftsClaimed: (options: {
    shiftIds: number[];
    claimedAt: number;
  }) => Promise<void>,
  user: entities.User,
  options: {
    publicShiftIds: string[];
  },
): Promise<Result<string[], string>> {
  const claimedAt = Date.now();

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

  await markManyShiftsClaimed({ shiftIds, claimedAt });

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
    claimedAt: number;
  }) => Promise<void>,
  user: entities.User,
  options: {
    publicScheduleId: string;
  },
): Promise<Result<string, string>> {
  const claimedAt = Date.now();

  const schedules = await listSchedules({
    userId: user.id,
  });

  const schedule = schedules.find(
    (s) => s.publicId === options.publicScheduleId,
  );

  if (!schedule) {
    return error("Schedule does not exist.");
  }

  await markShiftClaimedBySchedule({ scheduleId: schedule.id, claimedAt });

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
