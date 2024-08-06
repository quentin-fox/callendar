export type User = {
  publicId: string;
  firstName: string;
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
