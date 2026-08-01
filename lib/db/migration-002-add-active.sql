-- Run this in Neon's SQL Editor if you already ran seed.sql before this update.
-- Safe to run even if the column already exists.
ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
