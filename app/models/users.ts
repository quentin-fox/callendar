import * as entities from "@/entities";

export async function insert(
  db: D1Database,
  options: {
    publicId: string;
    firstName: string;
    createdAt: number;
    timeZone: string;
  },
): Promise<number> {
  const query = `
INSERT INTO users
  (public_id, first_name, created_at, time_zone)
VALUES
  (?, ?, ?, ?)
RETURNING id;
`;

  const parameters = [
    options.publicId,
    options.firstName,
    options.createdAt,
    options.timeZone,
  ];
  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<{ id: number }>();

  if (!result) {
    throw new Error("Could not insert user.");
  }

  return result.id;
}

export async function listOne(
  db: D1Database,
  options: { publicUserId: string },
): Promise<entities.User | null> {
  const query = `
SELECT
  id,
  public_id,
  created_at,
  first_name,
  time_zone
FROM
  users
WHERE
  public_id = ?;
`;

  const parameters = [options.publicUserId];
  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<{
      id: number;
      public_id: string;
      created_at: number;
      first_name: string;
      time_zone: string;
    }>();

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    publicId: result.public_id,
    createdAt: new Date(result.created_at).toISOString(),
    firstName: result.first_name,
    timeZone: result.time_zone,
  };
}

export async function internalListOne(
  db: D1Database,
  options: { userId: number },
): Promise<entities.User | null> {
  const query = `
SELECT
  id,
  public_id,
  created_at,
  first_name,
  time_zone
FROM
  users
WHERE
  id = ?;
`;

  const parameters = [options.userId];
  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<{
      id: number;
      public_id: string;
      created_at: number;
      first_name: string;
      time_zone: string;
    }>();

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    publicId: result.public_id,
    createdAt: new Date(result.created_at).toISOString(),
    firstName: result.first_name,
    timeZone: result.time_zone,
  };
}
