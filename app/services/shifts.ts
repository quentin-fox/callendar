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
