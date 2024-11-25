import * as entities from "@/entities";

export type User = {
  publicId: string;
  firstName: string;
  timeZone: string;
};

export function fromUserEntity(user: entities.User): User {
  return {
    publicId: user.publicId,
    firstName: user.firstName,
    timeZone: user.timeZone,
  };
}

export type Location = {
  publicId: string;
  title: string;
  createdAt: string;
};

export function fromLocationEntity(location: entities.Location): Location {
  return {
    publicId: location.publicId,
    title: location.title,
    createdAt: location.createdAt,
  };
}

export type Schedule = {
  publicId: string;
  createdAt: string; // ISO
  updatedAt: string | null;
  title: string;
  description: string;
  location: Location | null;
  isDraft: boolean;
  numShifts: number;
  numClaimedShifts: number;
  numUnclaimedShifts: number;
  firstShiftStart: string | null;
  lastShiftStart: string | null;
};

export function fromScheduleEntity(
  schedule: entities.Schedule,
  location: entities.Location | null,
): Schedule {
  return {
    publicId: schedule.publicId,
    createdAt: schedule.createdAt,
    updatedAt: schedule.updatedAt,
    title: schedule.title,
    description: schedule.description,
    location: location ? fromLocationEntity(location) : null,
    isDraft: schedule.isDraft,
    numShifts: schedule.numShifts,
    numClaimedShifts: schedule.numClaimedShifts,
    numUnclaimedShifts: schedule.numUnclaimedShifts,
    firstShiftStart: schedule.firstShiftStart,
    lastShiftStart: schedule.lastShiftStart,
  };
}

export type Shift = {
  publicId: string;
  createdAt: string; // ISO
  updatedAt: string | null;
  title: string;
  description: string;
  location: Location | null;
  schedule: Schedule | null;
  start: string; // ISO
  end: string; // ISO
  isAllDay: boolean;
  claimedAt: string | null;
};

export function fromShiftEntity(
  shift: entities.Shift,
  location: entities.Location | null,
  schedule: entities.Schedule | null,
  locationSchedule: entities.Location | null,
): Shift {
  return {
    publicId: shift.publicId,
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
    title: shift.title,
    description: shift.description,
    location: location ? fromLocationEntity(location) : null,
    schedule: schedule ? fromScheduleEntity(schedule, locationSchedule) : null,
    start: shift.start,
    end: shift.end,
    isAllDay: shift.isAllDay,
    claimedAt: shift.claimedAt,
  };
}

// these aren't created from entities
// so they don't need their own mappers
export type AllDayShiftOutput = {
  type: "all-day";
  date: string;
};

export type TimedShiftOutput = {
  type: "timed";
  start: string;
  end: string;
};
