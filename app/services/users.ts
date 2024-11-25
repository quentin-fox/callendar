import { Result, ok, error } from "@/helpers/result";

import * as entities from "@/entities";

import { v4 } from "uuid";

export async function insert(
  insertUser: (options: {
    publicId: string;
    createdAt: number;
    firstName: string;
    timeZone: string;
  }) => Promise<number>,
  options: {
    firstName: string;
    code: string;
    timeZone: string;
  },
): Promise<Result<string, string>> {
  if (options.code !== "callmemaybe") {
    return error("Invalid signup code.");
  }

  const publicId = v4();
  const createdAt = Date.now();

  await insertUser({
    publicId,
    createdAt,
    firstName: options.firstName.trim(),
    timeZone: options.timeZone,
  });

  return ok(publicId);
}

export async function listOne(
  listOneUser: (options: {
    publicUserId: string;
  }) => Promise<entities.User | null>,
  options: { publicUserId: string },
): Promise<entities.User | null> {
  return listOneUser(options);
}

export async function internalListOne(
  internalListOneUser: (options: {
    userId: number;
  }) => Promise<entities.User | null>,
  options: { userId: number },
): Promise<Result<entities.User | null, string>> {
  const result = await internalListOneUser(options);
  return ok(result);
}
