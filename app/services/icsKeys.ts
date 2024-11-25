import * as entities from "@/entities";
import { error, ok, Result } from "@/helpers/result";
import { nanoid } from "nanoid";

export async function insert(
  listSchedules: (options: { userId: number }) => Promise<entities.Schedule[]>,
  insertIcsKey: (options: {
    publicId: string;
    userId: number;
    scheduleId: number | null;
    createdAt: number;
    title: string;
  }) => Promise<number>,
  user: entities.User,
  options: {
    title: string;
    publicScheduleId: string | null;
  },
): Promise<Result<string, string>> {
  const createdAt = Date.now();

  const title = options.title.trim();

  let scheduleId: number | null;

  if (options.publicScheduleId) {
    const schedules = await listSchedules({ userId: user.id });

    const schedule = schedules.find(
      (s) => s.publicId === options.publicScheduleId,
    );

    if (!schedule) {
      return error("Schedule does not exist.");
    }

    scheduleId = schedule.id;
  } else {
    scheduleId = null;
  }

  const publicId = `key_${nanoid(12)}`;

  await insertIcsKey({
    publicId,
    userId: user.id,
    scheduleId,
    title,
    createdAt,
  });

  return ok(publicId);
}

export async function remove(
  listOneIcsKey: (options: {
    publicIcsKeyId: string;
  }) => Promise<entities.IcsKey>,
  removeIcsKey: (options: {
    icsKeyId: number;
    removedAt: number;
  }) => Promise<number>,
  user: entities.User,
  options: {
    publicIcsKeyId: string;
  },
): Promise<Result<string, string>> {
  const removedAt = Date.now();

  const icsKey = await listOneIcsKey({
    publicIcsKeyId: options.publicIcsKeyId,
  });

  if (icsKey.userId !== user.id) {
    return error("This ics key does not exist.");
  }

  await removeIcsKey({
    icsKeyId: icsKey.id,
    removedAt,
  });

  return ok(options.publicIcsKeyId);
}

export async function list(
  listIcsKeys: (options: { userId: number }) => Promise<entities.IcsKey[]>,
  user: entities.User,
): Promise<Result<entities.IcsKey[], string>> {
  const icsKeys = await listIcsKeys({
    userId: user.id,
  });

  return ok(icsKeys);
}

export async function listOne(
  listOneIcsKey: (options: {
    publicIcsKeyId: string;
  }) => Promise<entities.IcsKey>,
  user: null, // no user, since is not an authenticated request
  options: { publicIcsKeyId: string },
): Promise<Result<entities.IcsKey, string>> {
  const icsKeys = await listOneIcsKey({
    publicIcsKeyId: options.publicIcsKeyId,
  });

  return ok(icsKeys);
}
