import * as entities from "@/entities";

type Row = {
  id: number;
  public_id: string;
  user_id: number;
  schedule_id: number | null;
  created_at: number;
  updated_at: number;
  removed_at: number | null;
  title: string;
};

function toEntity(row: Row): entities.IcsKey {
  return {
    id: row.id,
    publicId: row.public_id,
    userId: row.user_id,
    scheduleId: row.schedule_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt:
      row.updated_at === null ? null : new Date(row.updated_at).toISOString(),
    removedAt:
      row.removed_at === null ? null : new Date(row.removed_at).toISOString(),
    title: row.title,
  };
}

export async function insert(
  db: D1Database,
  options: {
    publicId: string;
    userId: number;
    scheduleId: number | null;
    createdAt: number;
    title: string;
  },
): Promise<number> {
  const query = `
INSERT INTO ics_keys
  (public_id, user_id, schedule_id, created_at, title)
VALUES
  (?, ?, ?, ?, ?)
RETURNING id;
`;

  const parameters = [
    options.publicId,
    options.userId,
    options.scheduleId,
    options.createdAt,
    options.title,
  ];

  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<{ id: number }>();

  if (!result) {
    throw new Error("Could not insert ics key.");
  }

  return result.id;
}

export async function listOne(
  db: D1Database,
  options: {
    publicIcsKeyId: string;
  },
): Promise<entities.IcsKey | null> {
  const query = `
SELECT
  id,
  public_id,
  user_id,
  schedule_id,
  created_at,
  updated_at,
  removed_at,
  title
FROM
  ics_keys
WHERE
  public_id = ?
  AND removed_at IS NULL;
`;

  const parameters = [options.publicIcsKeyId];

  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<Row>();

  if (!result) {
    return null;
  }

  return toEntity(result);
}

export async function list(
  db: D1Database,
  options: {
    userId: number;
  },
): Promise<entities.IcsKey[]> {
  const query = `
SELECT
  id,
  public_id,
  user_id,
  schedule_id,
  created_at,
  updated_at,
  removed_at,
  title
FROM
  ics_keys
WHERE
  user_id = ?
  AND removed_at IS NULL;
`;

  const parameters = [options.userId];

  const result = await db
    .prepare(query)
    .bind(...parameters)
    .all<Row>();

  return result.results.map(toEntity);
}

export async function remove(
  db: D1Database,
  options: {
    icsKeyId: number;
    removedAt: number;
  },
): Promise<number> {
  const query = `
UPDATE ics_keys
SET
  removed_at = ?
WHERE
  id = ?
RETURNING id;
`;

  const parameters = [options.removedAt, options.icsKeyId];

  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<{ id: number }>();

  if (!result) {
    throw new Error("Could not remove ics key.");
  }

  return result.id;
}
