import invariant from "tiny-invariant";

import * as entities from "@/entities";

type Row = {
  id: number;
  public_id: string;
  created_at: number;
  title: string;
  user_id: number;
};

export async function insert(
  db: D1Database,
  options: {
    userId: number;
    publicId: string;
    title: string;
    createdAt: number;
  },
): Promise<number> {
  const query = `
INSERT INTO locations
  (user_id, public_id, title, created_at)
VALUES
  (?, ?, ?, ?)
RETURNING id;
`;

  const parameters = [
    options.userId,
    options.publicId,
    options.title,
    options.createdAt,
  ];

  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<{ id: number }>();

  invariant(result, "Could not add location.");

  return result.id;
}

export async function update(
  db: D1Database,
  options: { locationId: number; updatedAt: number; title: string },
): Promise<number> {
  const query = `
UPDATE
  locations
SET
  title = ?,
  updated_at = ?
WHERE
  id = ?
RETURNING id;
`;

  const parameters = [options.title, options.updatedAt, options.locationId];
  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<{ id: number }>();

  invariant(result, "Could not edit location.");

  return result.id;
}

export async function remove(
  db: D1Database,
  options: { locationId: number; removedAt: number },
): Promise<number> {
  const query = `
UPDATE
  locations
SET
  removed_at = ?
WHERE
  id = ?
RETURNING id;
`;

  const parameters = [options.removedAt, options.locationId];

  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<{ id: number }>();

  invariant(result, "Could not remove location.");

  return result.id;
}

function toEntity(row: Row): entities.Location {
  return {
    id: row.id,
    publicId: row.public_id,
    createdAt: new Date(row.created_at).toISOString(),
    title: row.title,
    userId: row.user_id,
  };
}

export async function list(
  db: D1Database,
  options: { userId: number },
): Promise<entities.Location[]> {
  const query = `
SELECT
  id,
  public_id,
  created_at,
  title,
  user_id
FROM
  locations
WHERE
  removed_at IS NULL
  AND user_id = ?;
`;

  const { results } = await db.prepare(query).bind(options.userId).all<Row>();

  return results.map(toEntity);
}

export async function listOne(
  db: D1Database,
  options: { publicLocationId: string },
): Promise<entities.Location | null> {
  const query = `
SELECT
  id,
  public_id,
  created_at,
  title,
  user_id
FROM
  locations
WHERE
  removed_at IS NULL
  AND public_id = ?;
`;

  const row = await db
    .prepare(query)
    .bind(options.publicLocationId)
    .first<Row>();

  if (!row) {
    return null;
  }

  return toEntity(row);
}
