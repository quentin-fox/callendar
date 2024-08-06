-- Migration number: 0003 	 2024-08-05T21:57:44.099Z

ALTER TABLE locations ADD COLUMN removed_at INTEGER;

ALTER TABLE schedules ADD COLUMN removed_at INTEGER;
