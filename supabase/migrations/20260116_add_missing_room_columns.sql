-- Add missing columns to rooms table
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS selected_topic TEXT;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS game_mode TEXT DEFAULT 'relative';
