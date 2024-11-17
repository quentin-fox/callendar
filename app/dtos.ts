export type User = {
  publicId: string;
  firstName: string;
  timeZone: string;
};

export type Location = {
  publicId: string;
  title: string;
  createdAt: string;
};

export type Schedule = {
  publicId: string;
  createdAt: string; // ISO
  modifiedAt: string | null;
  title: string;
  description: string;
  location: Location | null;
  isDraft: boolean;
  numShifts: number;
  firstShiftStart: string | null;
  lastShiftStart: string | null;
};

export type Shift = {
  publicId: string;
  createdAt: string; // ISO
  modifiedAt: string | null;
  title: string;
  description: string;
  location: Location | null;
  start: string; // ISO
  end: string; // ISO
  isAllDay: boolean;
};

export type AllDayShiftOutput = {
  type: "all-day";
  date: string;
};

export type TimedShiftOutput = {
  type: "timed";
  start: string;
  end: string;
};
