import * as entities from "@/entities";
import { error, ok, Result } from "@/helpers/result";
import { slugify } from "@/helpers/url";
import { nanoid } from "nanoid";

export async function insert(
  listOneUser: (options: {
    publicUserId: string;
  }) => Promise<entities.User | null>,
  listLocations: (options: { userId: number }) => Promise<entities.Location[]>,
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
  listOneUser: (options: {
    publicUserId: string;
  }) => Promise<entities.User | null>,
  listLocations: (options: { userId: number }) => Promise<entities.Location[]>,
  updateLocation: (options: {
    locationId: number;
    title: string;
  }) => Promise<number>,
  options: {
    publicLocationId: string;
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
  });

  return ok(location.publicId);
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

export async function listOne(
  listOneUser: (options: {
    publicUserId: string;
  }) => Promise<entities.User | null>,
  listOneLocation: (options: {
    publicLocationId: string;
  }) => Promise<entities.Location | null>,
  options: { publicUserId: string; publicLocationId: string },
): Promise<Result<entities.Location, string>> {
  const user = await listOneUser({
    publicUserId: options.publicUserId,
  });

  if (!user) {
    return error("User does not exist.");
  }

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
  listOneUser: (options: {
    publicUserId: string;
  }) => Promise<entities.User | null>,
  listOneLocation: (options: {
    publicLocationId: string;
  }) => Promise<entities.Location | null>,
  removeLocation: (options: {
    locationId: number;
    removedAt: number;
  }) => Promise<number>,
  options: {
    publicLocationId: string;
    publicUserId: string;
  },
): Promise<Result<void, string>> {
  const user = await listOneUser({
    publicUserId: options.publicUserId,
  });

  if (!user) {
    return error("User does not exist.");
  }

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
