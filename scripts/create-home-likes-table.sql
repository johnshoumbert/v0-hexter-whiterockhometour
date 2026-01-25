-- Create home_likes table
CREATE TABLE IF NOT EXISTS home_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(home_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_home_likes_home_id ON home_likes(home_id);
CREATE INDEX IF NOT EXISTS idx_home_likes_user_id ON home_likes(user_id);
