import * as entities from "@/entities";

export async function generateShifts(): Promise<entities.UploadOutput> {
  return {
    shifts: [
      {
        type: "all-day",
        date: "2024-10-02",
      },
      {
        type: "all-day",
        date: "2024-10-06",
      },
      {
        type: "all-day",
        date: "2024-10-09",
      },
      {
        type: "timed",
        start: "2024-10-10T12:00",
        end: "2024-10-11T00:00",
      },
      {
        type: "all-day",
        date: "2024-10-15",
      },
      {
        type: "all-day",
        date: "2024-10-19",
      },
    ],
    errors: [],
  };
}
