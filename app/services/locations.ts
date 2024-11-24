import * as entities from "@/entities";
import { error, ok, Result } from "@/helpers/result";
import { slugify } from "@/helpers/url";
import { nanoid } from "nanoid";

export async function insert(
  listLocations: (options: { userId: number }) => Promise<entities.Location[]>,
  insertLocation: (options: {
    userId: number;
    publicId: string;
    title: string;
    createdAt: number;
  }) => Promise<number>,
  user: entities.User,
  options: {
    title: string;
  },
): Promise<Result<string, string>> {
  const title = options.title.trim();

  const locations = await listLocations({ userId: user.id });

  if (locations.some((l) => l.title === title)) {
    return error("A location with this title already exists!");
  }

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

export async function update(
  listLocations: (options: { userId: number }) => Promise<entities.Location[]>,
  updateLocation: (options: {
    locationId: number;
    title: string;
    updatedAt: number;
  }) => Promise<number>,
  user: entities.User,
  options: {
    publicLocationId: string;
    title: string;
  },
): Promise<Result<string, string>> {
  const title = options.title.trim();

  const updatedAt = Date.now();

  const locations = await listLocations({ userId: user.id });

  const location = locations.find(
    (l) => l.publicId === options.publicLocationId,
  );

  if (!location) {
    return error("Location does not exist.");
  }

  if (location.userId !== user.id) {
    return error("You are not the creator of this location.");
  }

  const locationId = location.id;

  if (locations.some((l) => l.title === title && l.id !== location.id)) {
    return error("Another location with this title already exists!");
  }

  await updateLocation({
    locationId,
    title,
    updatedAt,
  });

  return ok(location.publicId);
}

export async function list(
  listLocations: (options: { userId: number }) => Promise<entities.Location[]>,
  user: entities.User,
): Promise<Result<entities.Location[], string>> {
  const locations = await listLocations({
    userId: user.id,
  });

  return ok(locations);
}

export async function listOne(
  listOneLocation: (options: {
    publicLocationId: string;
  }) => Promise<entities.Location | null>,
  user: entities.User,
  options: { publicLocationId: string },
): Promise<Result<entities.Location, string>> {
  const location = await listOneLocation({
    publicLocationId: options.publicLocationId,
  });

  if (!location) {
    return error("Location does not exist.");
  }

  if (location.userId !== user.id) {
    return error("You are not the creator of this location.");
  }

  return ok(location);
}

export async function remove(
  listOneLocation: (options: {
    publicLocationId: string;
  }) => Promise<entities.Location | null>,
  removeLocation: (options: {
    locationId: number;
    removedAt: number;
  }) => Promise<number>,
  user: entities.User,
  options: {
    publicLocationId: string;
  },
): Promise<Result<void, string>> {
  const location = await listOneLocation({
    publicLocationId: options.publicLocationId,
  });

  if (!location) {
    return error("Location does not exist.");
  }

  if (location.userId !== user.id) {
    return error("You are not the creator of this location.");
  }

  await removeLocation({ locationId: location.id, removedAt: Date.now() });

  return ok(undefined);
}
