export async function add(
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

  if (!result) {
    throw new Error("Could not add location.");
  }

  return result.id;
}

export async function edit(
  db: D1Database,
  options: { publicId: number; title: string },
): Promise<number> {
  const query = `
UPDATE
  locations
SET
  title = ?
WHERE
  id = ?
RETURNING id;
`;

  const parameters = [options.title, options.publicId];
  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<{ id: number }>();

  if (!result) {
    throw new Error("Could not edit location.");
  }

  return result.id;
}

export async function list(
  db: D1Database,
  options: { userId: number },
): Promise<{ id: number; public_id: string; title: string; userId: number }[]> {
  const query = `
SELECT
  id,
  public_id,
  title
FROM
  locations
WHERE
  removed_at IS NULL
  AND user_id = ?;
`;

  const { results } = await db
    .prepare(query)
    .bind(options.userId)
    .all<{ id: number; public_id: string; title: string }>();

  return results;
}

export async function listOne(
  db: D1Database,
  options: { publicId: string },
): Promise<{
  id: number;
  public_id: string;
  title: string;
  userId: number;
} | null> {}
