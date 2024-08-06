import * as entities from "@/entities";
import { error, ok, Result } from "@/helpers/result";
import { slugify } from "@/helpers/url";
import { nanoid } from "nanoid";

export async function insert(
  listOneUser: (options: {
    publicUserId: string;
  }) => Promise<entities.User | null>,
  insertLocation: (options: {
    userId: number;
    publicId: string;
    title: string;
    createdAt: number;
  }) => Promise<number>,
  options: {
    publicUserId: string;
    title: string;
  },
): Promise<Result<string, string>> {
  const user = await listOneUser({
    publicUserId: options.publicUserId,
  });

  if (!user) {
    return error("User does not exist.");
  }

  const title = options.title.trim();

  const createdAt = Date.now();

  const slug = slugify(title).substring(0, 30);

  const publicId = `loc_${slug}_${nanoid(12)}`;

  await insertLocation({
    title,
    userId: user.id,
    createdAt,
    publicId,
  });

  return ok(publicId);
}

export async function list(
  listOneUser: (options: {
    publicUserId: string;
  }) => Promise<entities.User | null>,
  listLocations: (options: { userId: number }) => Promise<entities.Location[]>,
  options: { publicUserId: string },
): Promise<Result<entities.Location[], string>> {
  const user = await listOneUser({
    publicUserId: options.publicUserId,
  });

  if (!user) {
    return error("User does not exist.");
  }

  const locations = await listLocations({
    userId: user.id,
  });

  return ok(locations);
}
