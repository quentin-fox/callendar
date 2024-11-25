-- Migration number: 0001 	 2024-11-24T21:18:00.000Z

CREATE TABLE users (
  id integer not null primary key,
  public_id text not null unique,
  created_at integer not null,
  updated_at integer,
  removed_at integer,
  first_name text not null,
  time_zone TEXT NOT NULL
);

CREATE TABLE locations (
  id integer not null primary key,
  public_id text not null unique, -- generated, gets used in URL
  user_id integer not null,
  created_at integer not null,
  updated_at integer,
  removed_at integer,
  title text not null
);

CREATE TABLE schedules (
  id integer not null primary key,
  public_id text not null unique, -- generated, gets used in URL
  user_id integer not null,
  location_id integer,
  created_at integer not null,
  updated_at integer, -- nullable
  removed_at integer,
  title text not null,
  description text not null,
  is_draft boolean not null,
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE shifts (
  id integer not null primary key,
  public_id text not null unique, -- generated, gets used in url
  user_id integer not null,
  schedule_id integer, -- nullable, can add shifts not part of a schedule
  location_id integer not null,
  created_at integer not null,
  updated_at integer,
  removed_at integer, -- use this for if we should delete it
  title text not null,
  description text not null,
  start integer not null,
  end integer not null,
  is_all_day boolean not null,
  claimed_at integer,
  FOREIGN KEY (schedule_id) REFERENCES schedules(id),
  FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE ics_keys (
  id integer not null primary key,
  public_id text not null unique,
  user_id integer not null,
  schedule_id integer,
  created_at integer not null,
  updated_at integer,
  removed_at integer,
  title text not null,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (schedule_id) REFERENCES schedules(id)
);
