-- Migration number: 0005 	 2024-08-07T16:03:37.068Z

ALTER TABLE shifts ADD COLUMN "claimed" boolean not null;
