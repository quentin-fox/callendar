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
  user_id: number;
  is_draft: number;
  num_shifts: number;
  first_shift_start: number | null;
  last_shift_start: number | null;
};

export async function insert(
  db: D1Database,
  options: {
    publicId: string;
    userId: number;
    createdAt: number;
    title: string;
    description: string;
    locationId: number;
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
    modifiedAt:
      row.modified_at === null ? null : new Date(row.modified_at).toISOString(),
    removedAt:
      row.removed_at === null ? null : new Date(row.removed_at).toISOString(),
    title: row.title,
    description: row.description,
    userId: row.user_id,
    isDraft: row.is_draft === 1,
    locationId: row.location_id,
    numShifts: row.num_shifts,
    firstShiftStart:
      row.first_shift_start === null
        ? null
        : new Date(row.first_shift_start).toISOString(),
    lastShiftStart:
      row.last_shift_start === null
        ? null
        : new Date(row.last_shift_start).toISOString(),
  };
}

export async function listOne(
  db: D1Database,
  options: { publicScheduleId: string },
): Promise<entities.Schedule | null> {
  const query = `
SELECT
  schedules.id,
  schedules.public_id,
  schedules.created_at,
  schedules.modified_at,
  schedules.removed_at,
  schedules.title,
  schedules.description,
  schedules.user_id,
  schedules.is_draft,
  location_id,
  (
    SELECT COUNT(*)
    FROM shifts
    WHERE
      shifts.schedule_id = schedules.id
      AND shifts.removed_at IS NULL
  ) as "num_shifts",
  (
    SELECT MIN(shifts.start)
    FROM shifts
    WHERE
      shifts.schedule_id = schedules.id
      AND shifts.removed_at IS NULL
  ) as "first_shift_start",
  (
    SELECT MAX(shifts.start)
    FROM shifts
    WHERE
      shifts.schedule_id = schedules.id
      AND shifts.removed_at IS NULL
  ) as "last_shift_start"
FROM
  schedules
WHERE
  schedules.public_id = ?;
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
  schedules.id,
  schedules.public_id,
  schedules.created_at,
  schedules.modified_at,
  schedules.removed_at,
  schedules.title,
  schedules.description,
  schedules.user_id,
  schedules.is_draft,
  location_id,
  (
    SELECT COUNT(*)
    FROM shifts
    WHERE
      shifts.schedule_id = schedules.id
      AND shifts.removed_at IS NULL
  ) as "num_shifts",
  (
    SELECT MIN(shifts.start)
    FROM shifts
    WHERE
      shifts.schedule_id = schedules.id
      AND shifts.removed_at IS NULL
  ) as "first_shift_start",
  (
    SELECT MAX(shifts.start)
    FROM shifts
    WHERE
      shifts.schedule_id = schedules.id
      AND shifts.removed_at IS NULL
  ) as "last_shift_start"
FROM
  schedules
WHERE
  schedules.removed_at IS NULL AND
  schedules.user_id = ?;
`;

  const parameters = [options.userId];
  const { results } = await db
    .prepare(query)
    .bind(...parameters)
    .all<Row>();

  return results.map(toEntity);
}

export async function update(
  db: D1Database,
  options: {
    scheduleId: number;
    title: string;
    description: string;
    locationId: number;
    isDraft: boolean;
    modifiedAt: number;
  },
): Promise<void> {
  const query = `
UPDATE schedules
SET
  title = $1,
  description = $2,
  location_id = $3,
  is_draft = $4,
  modified_at = $5
WHERE
  id = $6;
`;

  const parameters = [
    options.title,
    options.description,
    options.locationId,
    options.isDraft,
    options.modifiedAt,
    options.scheduleId,
  ];

  await db
    .prepare(query)
    .bind(...parameters)
    .run();
}

export async function remove(
  db: D1Database,
  options: {
    scheduleId: number;
    removedAt: number;
  },
): Promise<void> {
  const query = `
UPDATE schedules
SET
  removed_at = $1
WHERE
  id = $2;
`;

  const parameters = [options.removedAt, options.scheduleId];

  await db
    .prepare(query)
    .bind(...parameters)
    .run();
}
