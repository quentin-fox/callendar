export type User = {
  id: number;
  publicId: string;
  createdAt: string; // ISO
  firstName: string;
  timeZone: string;
};

export type Location = {
  id: number;
  publicId: string;
  createdAt: string; // ISO
  title: string;
  userId: number;
};

export type Schedule = {
  id: number;
  publicId: string;
  createdAt: string; // ISO
  modifiedAt: string | null;
  removedAt: string | null;
  title: string;
  description: string;
  locationId: number;
  userId: number;
  isDraft: boolean;
  numShifts: number;
  firstShiftStart: string | null;
  lastShiftStart: string | null;
};

export type UploadImage = {
  data: string;
  mediaType: ValidMediaType;
};

export type Shift = {
  id: number;
  publicId: string;
  scheduleId: number | null;
  createdAt: string; // ISO
  modifiedAt: string | null;
  removedAt: string | null;
  title: string;
  description: string;
  locationId: number;
  start: string; // ISO
  end: string; // ISO
  isAllDay: boolean;
  claimed: boolean;
};

export const validMediaTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export type ValidMediaType = (typeof validMediaTypes)[number];

export type UploadInput = {
  name: string;
  extra: string | null;
  contents: {
    data: string;
    mediaType: ValidMediaType;
  }[];
};

type AllDayShiftOutput = {
  type: "all-day";
  date: string;
};

type TimedShiftOutput = {
  type: "timed";
  start: string;
  end: string;
};

export type ShiftOutput = AllDayShiftOutput | TimedShiftOutput;

export type UploadOutput = {
  errors: string[];
  shifts: ShiftOutput[];
};
