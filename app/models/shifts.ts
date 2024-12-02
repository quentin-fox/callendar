import * as entities from "@/entities";

type Row = {
  id: number;
  public_id: string;
  created_at: number;
  updated_at: number | null;
  removed_at: number | null;
  title: string;
  description: string;
  location_id: number;
  schedule_id: number | null;
  start: number;
  end: number;
  is_all_day: number;
  claimed_at: number | null;
};

function toParameters(options: {
  publicId: string;
  createdAt: number;
  title: string;
  description: string;
  locationId: number;
  scheduleId: number | null;
  userId: number;
  start: number;
  end: number;
  isAllDay: boolean;
  claimedAt: number | null;
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
    options.claimedAt,
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
    claimed_at
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
    scheduleId: number | null;
    userId: number;
    start: number;
    end: number;
    isAllDay: boolean;
    claimedAt: number | null;
  },
): Promise<number> {
  const result = await db
    .prepare(INSERT_QUERY)
    .bind(...toParameters(options))
    .first<{ id: number }>();

  if (!result) {
    throw new Error("Could not insert shift.");
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
    scheduleId: number | null;
    userId: number;
    start: number;
    end: number;
    isAllDay: boolean;
    claimedAt: number | null;
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

export async function update(
  db: D1Database,
  options: {
    shiftId: number;
    updatedAt: number;
    title: string;
    description: string;
    locationId: number;
    scheduleId: number | null;
    start: number;
    end: number;
    isAllDay: boolean;
    claimedAt: number | null;
  },
): Promise<number> {
  const query = `
UPDATE shifts
SET
  updated_at = ?,
  title = ?,
  description = ?,
  location_id = ?,
  schedule_id = ?,
  start = ?,
  end = ?,
  is_all_day = ?,
  claimed_at = ?
WHERE id = ?
RETURNING id;
  `;

  const result = await db
    .prepare(query)
    .bind(
      options.updatedAt,
      options.title,
      options.description,
      options.locationId,
      options.scheduleId,
      options.start,
      options.end,
      options.isAllDay,
      options.claimedAt,
      options.shiftId,
    )
    .first<{ id: number }>();

  if (!result) {
    throw new Error("Could not update shift.");
  }

  return result.id;
}

function toEntity(row: Row): entities.Shift {
  return {
    id: row.id,
    publicId: row.public_id,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt:
      row.updated_at === null ? null : new Date(row.created_at).toISOString(),
    removedAt:
      row.removed_at === null ? null : new Date(row.removed_at).toISOString(),
    title: row.title,
    description: row.description,
    locationId: row.location_id,
    scheduleId: row.schedule_id,
    start: new Date(row.start).toISOString(),
    end: new Date(row.end).toISOString(),
    isAllDay: row.is_all_day === 1,
    claimedAt:
      row.claimed_at === null ? null : new Date(row.claimed_at).toISOString(),
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
  updated_at,
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
  updated_at,
  removed_at,
  title,
  description,
  location_id,
  schedule_id,
  start,
  end,
  is_all_day,
  claimed_at
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
  id,
  public_id,
  created_at,
  updated_at,
  removed_at,
  title,
  description,
  location_id,
  schedule_id,
  start,
  end,
  is_all_day,
  claimed_at
FROM
  shifts
WHERE
  shifts.removed_at IS NULL
  AND shifts.user_id = ?
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
SET removed_at = ?
WHERE id = ?;
`;

  const parameters = [options.removedAt, options.shiftId];

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
SET removed_at = ?
WHERE removed_at IS NULL AND schedule_id = ?;
`;

  const parameters = [options.removedAt, options.scheduleId];

  await db
    .prepare(query)
    .bind(...parameters)
    .run();
}

export async function markClaimed(
  db: D1Database,
  options: { shiftId: number; claimedAt: number },
): Promise<void> {
  const query = `
UPDATE shifts
SET claimed_at = ?
WHERE removed_at IS NULL AND id = ?;
  `;

  const parameters = [options.claimedAt, options.shiftId];

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
SET claimed_at = NULL
WHERE removed_at IS NULL AND id = ?;
  `;

  const parameters = [options.shiftId];

  await db
    .prepare(query)
    .bind(...parameters)
    .run();
}

export async function markManyClaimed(
  db: D1Database,
  options: { shiftIds: number[]; claimedAt: number },
): Promise<void> {
  const query = `
UPDATE shifts
SET claimed_at = ?
WHERE removed_at IS NULL AND id = ?;
  `;

  const statement = db.prepare(query);

  await db.batch(
    options.shiftIds.map((shiftId) =>
      statement.bind(options.claimedAt, shiftId),
    ),
  );
}

export async function markManyUnclaimed(
  db: D1Database,
  options: { shiftIds: number[] },
): Promise<void> {
  const query = `
UPDATE shifts
SET claimed_at = NULL
WHERE removed_at IS NULL AND id = ?;
  `;

  const statement = db.prepare(query);

  await db.batch(options.shiftIds.map((shiftId) => statement.bind(shiftId)));
}

export async function markClaimedBySchedule(
  db: D1Database,
  options: { scheduleId: number; claimedAt: number },
): Promise<void> {
  const query = `
UPDATE shifts
SET claimed_at = ?
WHERE removed_at IS NULL AND schedule_id = ?;
  `;

  const parameters = [options.claimedAt, options.scheduleId];

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
SET claimed_at = NULL
WHERE removed_at IS NULL AND schedule_id = ?;
  `;

  const parameters = [options.scheduleId];

  await db
    .prepare(query)
    .bind(...parameters)
    .run();
}
