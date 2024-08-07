-- Migration number: 0004 	 2024-08-07T03:16:16.902Z

ALTER TABLE users ADD COLUMN time_zone TEXT NOT NULL;
