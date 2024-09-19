import * as entities from "@/entities";

type Row = {
  id: number;
  public_id: string;
  created_at: number;
  modified_at: number | null;
  removed_at: number | null;
  title: string;
  description: string;
  location_id: number;
  schedule_id: number;
  start: number;
  end: number;
  is_all_day: boolean;
  claimed: boolean;
};

const INSERT_QUERY = `
INSERT INTO schedules
  (public_id, user_id, created_at, title, description, location_id, is_draft)
VALUES
  (?, ?, ?, ?, ?, ?, ?)
RETURNING id;
`;

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
    .prepare(INSERT_QUERY)
    .bind(...parameters)
    .first<{ id: number }>();

  if (!result) {
    throw new Error("Could not insert schedule.");
  }

  return result.id;
}

export async function insertMany(
  db: D1Database,
  options: {
    publicId: string;
    userId: string;
    createdAt: number;
    title: string;
    description: string;
    locationId: string;
    isDraft: boolean;
  }[],
): Promise<number[]> {
  const statement = db.prepare(INSERT_QUERY);

  const batchResults = await db.batch<{ id: number }>(
    options.map((o) =>
      statement.bind([
        o.publicId,
        o.userId,
        o.createdAt,
        o.title,
        o.description,
        o.locationId,
        o.isDraft,
      ]),
    ),
  );

  const shiftIds = batchResults.flatMap((result) =>
    result.results.map((row) => row.id),
  );

  return shiftIds;
}

function toEntity(row: Row): entities.Shift {
  return {
    id: row.id,
    publicId: row.public_id,
    createdAt: new Date(row.created_at).toISOString(),
    modifiedAt:
      row.modified_at === null ? null : new Date(row.created_at).toISOString(),
    removedAt:
      row.removed_at === null ? null : new Date(row.created_at).toISOString(),
    title: row.title,
    description: row.description,
    locationId: row.location_id,
    scheduleId: row.schedule_id,
    start: new Date(row.start).toISOString(),
    end: new Date(row.end).toISOString(),
    isAllDay: row.is_all_day,
    claimed: row.claimed,
  };
}

export async function listOne(
  db: D1Database,
  options: { publicShiftId: string },
): Promise<entities.Shift | null> {
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
  schedule_id,
  start,
  end,
  is_all_day,
  claimed
FROM
  shifts
WHERE
  public_id = ?;
`;

  const parameters = [options.publicShiftId];

  const row = await db
    .prepare(query)
    .bind(...parameters)
    .first<Row>();

  if (!row) {
    return null;
  }

  return toEntity(row);
}

export async function listBySchedule(
  db: D1Database,
  options: { scheduleId: number },
): Promise<entities.Shift[]> {
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
  schedule_id,
  start,
  end,
  is_all_day,
  claimed
FROM
  shifts
WHERE
  removed_at IS NOT NULL
  AND schedule_id = ?;
`;

  const parameters = [options.scheduleId];
  const { results } = await db
    .prepare(query)
    .bind(...parameters)
    .all<Row>();

  return results.map(toEntity);
}

export async function listByUser(
  db: D1Database,
  options: { userId: number },
): Promise<entities.Shift[]> {
  const query = `
SELECT
  shifts.id,
  shifts.public_id,
  shifts.created_at,
  shifts.modified_at,
  shifts.removed_at,
  shifts.title,
  shifts.description,
  shifts.location_id,
  shifts.schedule_id,
  shifts.start,
  shifts.end,
  shifts.is_all_day,
  shifts.claimed
FROM
  shifts JOIN locations ON shifts.location_id = locations.id
WHERE
  shifts.removed_at IS NOT NULL
  AND schedules.user_id = ?;
`;

  const parameters = [options.userId];
  const { results } = await db
    .prepare(query)
    .bind(...parameters)
    .all<Row>();

  return results.map(toEntity);
}
