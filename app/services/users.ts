import { Result, ok, error } from "@/helpers/result";

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
