import * as entities from "@/entities";

import { error, ok, Result } from "@/helpers/result";
import { slugify } from "@/helpers/url";
import { nanoid } from "nanoid";

export async function insert(
  listLocations: (options: { userId: number }) => Promise<entities.Location[]>,
  insertSchedule: (options: {
    publicId: string;
    userId: number;
    createdAt: number;
    title: string;
    description: string;
    locationId: number;
    isDraft: boolean;
  }) => Promise<number>,
  insertManyShifts: (
    options: {
      publicId: string;
      createdAt: number;
      title: string;
      description: string;
      locationId: number;
      scheduleId: number;
      userId: number;
      start: number;
      end: number;
      isAllDay: boolean;
      claimed: boolean;
    }[],
  ) => Promise<number[]>,
  user: entities.User,
  options: {
    publicLocationId: string;
    title: string;
    description: string;
    isDraft: boolean;
    shifts: (
      | {
          type: "all-day";
          date: string;
        }
      | {
          type: "timed";
          start: string;
          end: string;
        }
    )[];
  },
): Promise<Result<string, string>> {
  const locations = await listLocations({ userId: user.id });

  const location = locations.find(
    (l) => l.publicId === options.publicLocationId,
  );

  if (!location) {
    return error("Location does not exist.");
  }

  const createdAt = Date.now();

  const title = options.title.trim();
  const description = options.description.trim();

  const slug = slugify(title).substring(0, 30);

  const publicScheduleId = `sch_${slug}_${nanoid(12)}`;

  const scheduleId = await insertSchedule({
    publicId: publicScheduleId,
    title,
    description,
    isDraft: options.isDraft,
    userId: user.id,
    createdAt,
    locationId: location.id,
  });

  await insertManyShifts(
    options.shifts.flatMap((shift) => {
      if (shift.type === "all-day") {
        return [];
      }

      const publicShiftId = `shi_${nanoid(12)}`;

      const start = new Date(shift.start).getTime();
      const end = new Date(shift.end).getTime();

      return {
        publicId: publicShiftId,
        createdAt,
        title: "",
        description: "",
        locationId: location.id,
        scheduleId,
        userId: user.id,
        start,
        end,
        isAllDay: false,
        claimed: false,
      };
    }),
  );

  return ok(publicScheduleId);
}

export async function update(
  listLocations: (options: { userId: number }) => Promise<entities.Location[]>,
  listSchedules: (options: { userId: number }) => Promise<entities.Schedule[]>,
  updateSchedule: (options: {
    scheduleId: number;
    title: string;
    description: string;
    locationId: number;
    isDraft: boolean;
    modifiedAt: number;
  }) => Promise<void>,
  user: entities.User,
  options: {
    publicScheduleId: string;
    title: string;
    description: string;
    publicLocationId: string;
    isDraft: boolean;
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

  const locations = await listLocations({ userId: user.id });

  const location = locations.find(
    (l) => l.publicId === options.publicLocationId,
  );

  if (!location) {
    return error("Location does not exist.");
  }
  const title = options.title.trim();
  const description = options.description.trim();

  const modifiedAt = Date.now();

  await updateSchedule({
    scheduleId: schedule.id,
    title,
    description,
    locationId: location.id,
    isDraft: options.isDraft,
    modifiedAt,
  });

  return ok(options.publicScheduleId);
}

export async function remove(
  listSchedules: (options: { userId: number }) => Promise<entities.Schedule[]>,
  removeSchedule: (options: {
    scheduleId: number;
    removedAt: number;
  }) => Promise<void>,
  removeShiftsBySchedule: (options: {
    scheduleId: number;
    removedAt: number;
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

  const removedAt = Date.now();

  await removeSchedule({
    scheduleId: schedule.id,
    removedAt,
  });

  await removeShiftsBySchedule({
    scheduleId: schedule.id,
    removedAt,
  });

  return ok(options.publicScheduleId);
}

export async function list(
  listSchedules: (options: { userId: number }) => Promise<entities.Schedule[]>,
  user: entities.User,
): Promise<Result<entities.Schedule[], string>> {
  const schedules = await listSchedules({
    userId: user.id,
  });

  return ok(schedules);
}

export async function listOne(
  listSchedules: (options: { userId: number }) => Promise<entities.Schedule[]>,
  user: entities.User,
  options: { publicScheduleId: string },
): Promise<Result<entities.Schedule, string>> {
  const schedules = await listSchedules({
    userId: user.id,
  });

  const schedule = schedules.find(
    (s) => s.publicId === options.publicScheduleId,
  );

  if (!schedule) {
    return error("Schedule does not exist.");
  }

  return ok(schedule);
}
