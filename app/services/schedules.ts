import * as entities from "@/entities";

import { error, ok, Result } from "@/helpers/result";
import { slugify } from "@/helpers/url";
import { addDays, isValid, parse } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
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
      claimedAt: number | null;
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
          date: string; // YYYY-MM-DD
        }
      | {
          type: "timed";
          start: string; // YYYY-MM-DDTHH:mm
          end: string; // YYYY-MM-DDTHH:mm
        }
    )[];
  },
): Promise<Result<string, string>> {
  if (options.shifts.length === 0) {
    return error("You must provide at least one shift.");
  }

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
      let start: number;
      let end: number;
      let isAllDay: boolean;

      if (shift.type === "all-day") {
        // this will give us the start of the day in UTC
        // i.e. it will actually be 00:00 at UTC
        const date = parse(shift.date, "yyyy-MM-dd", new Date());

        if (!isValid(date)) {
          return [];
        }

        const utcStart = fromZonedTime(date, user.timeZone);
        const utcEnd = addDays(utcStart, 1);

        start = utcStart.getTime();
        end = utcEnd.getTime();
        isAllDay = true;
      } else {
        const zonedStart = parse(shift.start, "yyyy-MM-dd'T'HH:mm", new Date());

        if (!isValid(zonedStart)) {
          return [];
        }

        const zonedEnd = parse(shift.end, "yyyy-MM-dd'T'HH:mm", new Date());

        if (!isValid(zonedEnd)) {
          return [];
        }

        const utcStart = fromZonedTime(zonedStart, user.timeZone);
        const utcEnd = fromZonedTime(zonedEnd, user.timeZone);

        start = utcStart.getTime();
        end = utcEnd.getTime();
        isAllDay = false;
      }

      const publicShiftId = `shi_${nanoid(12)}`;

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
        isAllDay,
        claimedAt: null,
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
    updatedAt: number;
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

  const updatedAt = Date.now();

  await updateSchedule({
    scheduleId: schedule.id,
    title,
    description,
    locationId: location.id,
    isDraft: options.isDraft,
    updatedAt,
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
