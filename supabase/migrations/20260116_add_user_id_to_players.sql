-- Add user_id to players table to link them to profiles for rewards
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
