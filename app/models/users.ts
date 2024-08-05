import { User } from "~/entities";

export async function insert(
  db: D1Database,
  options: { publicId: string; firstName: string; createdAt: number },
): Promise<number> {
  const query = `
INSERT INTO users
  (public_id, first_name, created_at)
VALUES
  (?, ?, ?)
RETURNING id;
`;

  const parameters = [options.publicId, options.firstName, options.createdAt];
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
  publicId: string,
): Promise<User | null> {
  const query = `
SELECT
  id,
  public_id,
  created_at,
  first_name
FROM
  users
WHERE
  public_id = ?;
`;

  const parameters = [publicId];
  const result = await db
    .prepare(query)
    .bind(...parameters)
    .first<{
      id: number;
      public_id: string;
      created_at: number;
      first_name: string;
    }>();

  if (!result) {
    return null;
  }

  return {
    id: result.id,
    publicId: result.public_id,
    createdAt: new Date(result.created_at).toISOString(),
    firstName: result.first_name,
  };
}
