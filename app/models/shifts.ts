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
  is_all_day: number;
  claimed: number;
};

function toParameters(options: {
  publicId: string;
  createdAt: number;
  title: string;
  description: string;
  locationId: number;
  scheduleId: number;
  userId: number;
  start: number;
  end: number;
  isAllDay: boolean;
  claimed: boolean;
}) {
  return [
    options.publicId,
    options.createdAt,
    options.title,
    options.description,
    options.locationId,
    options.scheduleId,
    options.userId,
    options.start,
    options.end,
    options.isAllDay,
    options.claimed,
  ];
}

const INSERT_QUERY = `
INSERT INTO shifts
  (
    public_id,
    created_at,
    title,
    description,
    location_id,
    schedule_id,
    user_id,
    start,
    end,
    is_all_day,
    claimed
  )
VALUES
  (
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?,
    ?
  )
RETURNING id;
`;

export async function insert(
  db: D1Database,
  options: {
    publicId: string;
    createdAt: number;
    title: string;
    description: string;
    locationId: number;
    scheduleId: number;
    userId: number;
    start: number;
    end: number;
    isAllDay: boolean;
    claimed: boolean;
  },
): Promise<number> {
  const result = await db
    .prepare(INSERT_QUERY)
    .bind(...toParameters(options))
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
    createdAt: number;
    title: string;
    description: string;
    locationId: number;
    scheduleId: number;
    userId: number;
    start: number;
    end: number;
    isAllDay: boolean;
    claimed: boolean;
  }[],
): Promise<number[]> {
  const statement = db.prepare(INSERT_QUERY);

  const batchResults = await db.batch<{ id: number }>(
    options.map((o) => statement.bind(...toParameters(o))),
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
    isAllDay: row.is_all_day === 1,
    claimed: row.claimed === 1,
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
  removed_at IS NULL
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
  shifts JOIN schedules ON shifts.schedule_id = schedules.id
WHERE
  shifts.removed_at IS NULL
  AND schedules.user_id = ?
ORDER BY shifts.start ASC, shifts.id ASC;
`;

  const parameters = [options.userId];
  const { results } = await db
    .prepare(query)
    .bind(...parameters)
    .all<Row>();

  return results.map(toEntity);
}

export async function remove(
  db: D1Database,
  options: { shiftId: number; removedAt: number },
): Promise<void> {
  const query = `
UPDATE shifts
SET removed_at = $2
WHERE id = $1;
`;

  const parameters = [options.shiftId, options.removedAt];

  await db
    .prepare(query)
    .bind(...parameters)
    .run();
}

export async function removeBySchedule(
  db: D1Database,
  options: { scheduleId: number; removedAt: number },
): Promise<void> {
  const query = `
UPDATE shifts
SET removed_at = $2
WHERE removed_at IS NULL AND schedule_id = $1;
`;

  const parameters = [options.scheduleId, options.removedAt];

  await db
    .prepare(query)
    .bind(...parameters)
    .run();
}

export async function markClaimed(
  db: D1Database,
  options: { shiftId: number },
): Promise<void> {
  const query = `
UPDATE shifts
SET claimed = TRUE
WHERE removed_at IS NULL AND id = $1;
  `;

  const parameters = [options.shiftId];

  await db
    .prepare(query)
    .bind(...parameters)
    .run();
}

export async function markUnclaimed(
  db: D1Database,
  options: { shiftId: number },
): Promise<void> {
  const query = `
UPDATE shifts
SET claimed = FALSE
WHERE removed_at IS NULL AND id = $1;
  `;

  const parameters = [options.shiftId];

  await db
    .prepare(query)
    .bind(...parameters)
    .run();
}

export async function markClaimedBySchedule(
  db: D1Database,
  options: { scheduleId: number },
): Promise<void> {
  const query = `
UPDATE shifts
SET claimed = TRUE
WHERE removed_at IS NULL AND schedule_id = $1;
  `;

  const parameters = [options.scheduleId];

  await db
    .prepare(query)
    .bind(...parameters)
    .run();
}

export async function markUnclaimedBySchedule(
  db: D1Database,
  options: { scheduleId: number },
): Promise<void> {
  const query = `
UPDATE shifts
SET claimed = FALSE
WHERE removed_at IS NULL AND schedule_id = $1;
  `;

  const parameters = [options.scheduleId];

  await db
    .prepare(query)
    .bind(...parameters)
    .run();
}
