import * as entities from "@/entities";

type Row = {
  id: number;
  public_id: string;
  created_at: number;
  modified_at: number;
  removed_at: number;
  title: string;
  description: string;
  location_id: number;
  user_id: number;
  is_draft: boolean;
};

export async function insert(
  db: D1Database,
  options: {
    publicId: string;
    userId: string;
    createdAt: number;
    title: string;
    description: string;
    locationId: string;
    isDraft: boolean;
  },
): Promise<number> {
  const query = `
INSERT INTO schedules
  (public_id, user_id, created_at, title, description, location_id, is_draft)
VALUES
  (?, ?, ?, ?, ?, ?, ?)
RETURNING id;
`;

  const parameters = [
    options.publicId,
    options.userId,
    options.createdAt,
    options.title,
    options.description,
    options.locationId,
    options.isDraft,
  ];
  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<{ id: number }>();

  if (!result) {
    throw new Error("Could not insert schedule.");
  }

  return result.id;
}

function toEntity(row: Row): entities.Schedule {
  return {
    id: row.id,
    publicId: row.public_id,
    createdAt: new Date(row.created_at).toISOString(),
    modifiedAt: new Date(row.created_at).toISOString(),
    removedAt: new Date(row.created_at).toISOString(),
    title: row.title,
    description: row.description,
    locationId: row.location_id,
    userId: row.user_id,
    isDraft: row.is_draft,
  };
}

export async function listOne(
  db: D1Database,
  options: { publicScheduleId: string },
): Promise<entities.Schedule | null> {
  const query = `
SELECT
  id,
  public_id,
  created_at,
  modified_at,
  removed_at,
  title,
  description,
  location_id,
  user_id,
  is_draft
FROM
  schedules
WHERE
  public_id = ?;
`;

  const parameters = [options.publicScheduleId];

  const row = await db
    .prepare(query)
    .bind(...parameters)
    .first<Row>();

  if (!row) {
    return null;
  }

  return toEntity(row);
}

export async function list(
  db: D1Database,
  options: { userId: number },
): Promise<entities.Schedule[]> {
  const query = `
SELECT
  id,
  public_id,
  created_at,
  modified_at,
  removed_at,
  title,
  description,
  location_id,
  user_id,
  is_draft
FROM
  schedules
WHERE
  removed_at IS NULL AND
  user_id = ?;
`;

  const parameters = [options.userId];
  const { results } = await db
    .prepare(query)
    .bind(...parameters)
    .all<Row>();

  return results.map(toEntity);
}
