import * as entities from "@/entities";

import { Result, error, ok } from "@/helpers/result";
export async function process(
  generateShifts: (
    options: entities.UploadInput,
  ) => Promise<entities.UploadOutput>,
  options: entities.UploadInput,
): Promise<Result<entities.ShiftOutput[], string[]>> {
  const result = await generateShifts(options);

  if (result.errors.length > 0) {
    return error(result.errors);
  }

  return ok(result.shifts);
}
