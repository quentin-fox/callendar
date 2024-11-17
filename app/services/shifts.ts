import * as entities from "@/entities";

import { error, ok, Result } from "@/helpers/result";

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
