-- Migration number: 0002 	 2024-08-05T14:09:43.093Z

DROP TABLE locations;
DROP TABLE schedules;
DROP TABLE shifts;

CREATE TABLE users (
  id integer not null primary key,
  public_id text not null,
  created_at integer not null,
  first_name text not null
);

CREATE TABLE locations (
	id integer not null primary key,
	public_id text not null, -- generated, gets used in URL
	created_at integer not null,
  user_id integer not null,
	title text not null
);

CREATE TABLE schedules (
	id integer not null primary key,
	public_id text not null, -- generated, gets used in URL
	created_at integer not null,
	modified_at integer, -- nullable
  user_id integer not null,
	title text not null,
	description text not null,
	location_id integer,
	is_draft boolean not null,
	FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE shifts (
	id integer not null primary key,
	public_id text not null, -- generated, gets used in url
	schedule_id integer, -- nullable, can add shifts not part of a schedule
	created_at integer not null,
	modified_at integer,
  user_id integer not null,
	removed_at integer, -- use this for if we should delete it
	title text not null,
	description text not null,
	location_id integer not null,
	start integer not null,
	end integer not null,
	is_all_day boolean not null,
	FOREIGN KEY (schedule_id) REFERENCES schedules(id),
	FOREIGN KEY (location_id) REFERENCES locations(id)
);
