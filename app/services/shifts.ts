import * as entities from "@/entities";

import { error, ok, Result } from "@/helpers/result";

export async function listByUser(
  listOneUser: (options: {
    publicUserId: string;
  }) => Promise<entities.User | null>,
  listShiftsByUser: (options: { userId: number }) => Promise<entities.Shift[]>,
  options: { publicUserId: string },
): Promise<Result<entities.Shift[], string>> {
  const user = await listOneUser({
    publicUserId: options.publicUserId,
  });

  if (!user) {
    return error("User does not exist.");
  }

  const shifts = await listShiftsByUser({
    userId: user.id,
  });

  return ok(shifts);
}
