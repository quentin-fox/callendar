export async function insert(
  db: D1Database,
  options: { publicId: string; title: string; createdAt: number },
): Promise<number> {
  const query = `
INSERT INTO locations
  (public_id, title, created_at)
VALUES
  (?, ?, ?)
RETURNING id;
`;

  const parameters = [options.publicId, options.title, options.createdAt];
  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<{ id: number }>();

  if (!result) {
    throw new Error("Could not insert location.");
  }

  return result.id;
}

export async function list(
  db: D1Database,
): Promise<{ id: number; public_id: string; title: string }[]> {
  const query = `
SELECT
  id,
  public_id,
  title
FROM
  locations;
`;

  const result = await db
    .prepare(query)
    .all<{ id: number; public_id: string; title: string }>();

  return result.results;
}
