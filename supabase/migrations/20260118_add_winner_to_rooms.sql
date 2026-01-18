-- Add winner column to rooms table for syncing winner state across clients
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS winner TEXT;
