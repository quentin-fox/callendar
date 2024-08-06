export type User = {
  id: number;
  publicId: string;
  createdAt: string; // ISO
  firstName: string;
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
  title: string;
  description: string;
  locationId: string | null;
  isDraft: boolean;
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
};
