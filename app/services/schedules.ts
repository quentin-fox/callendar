import * as entities from "@/entities";

import { error, ok, Result } from "@/helpers/result";
import { slugify } from "@/helpers/url";
import { nanoid } from "nanoid";

export async function insert(
  listOneUser: (options: {
    publicUserId: string;
  }) => Promise<entities.User | null>,
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
  options: {
    publicUserId: string;
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
  const user = await listOneUser({
    publicUserId: options.publicUserId,
  });

  if (!user) {
    return error("User does not exist.");
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

  const slug = slugify(title).substring(0, 30);

  const publicScheduleId = `sch_${slug}_${nanoid(12)}`;

  const scheduleId = await insertSchedule({
    publicId: publicScheduleId,
    title: options.title,
    description: options.description,
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

export async function list(
  listOneUser: (options: {
    publicUserId: string;
  }) => Promise<entities.User | null>,
  listSchedules: (options: { userId: number }) => Promise<entities.Schedule[]>,
  options: { publicUserId: string },
): Promise<Result<entities.Schedule[], string>> {
  const user = await listOneUser({
    publicUserId: options.publicUserId,
  });

  if (!user) {
    return error("User does not exist.");
  }

  const schedules = await listSchedules({
    userId: user.id,
  });

  return ok(schedules);
}
