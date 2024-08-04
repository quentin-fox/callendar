-- Migration number: 0001 	 2024-08-04T17:48:29.516Z

CREATE TABLE locations (
	id integer not null primary key,
	public_id text not null, -- generated, gets used in URL
	created_at integer not null,
	title text not null
);

CREATE TABLE schedules (
	id integer not null primary key,
	public_id text not null, -- generated, gets used in URL
	created_at integer not null,
	modified_at integer, -- nullable
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
