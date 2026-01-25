-- Create home_comments table
CREATE TABLE IF NOT EXISTS home_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  home_id UUID NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_home_comments_home_id ON home_comments(home_id);
CREATE INDEX IF NOT EXISTS idx_home_comments_user_id ON home_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_home_comments_created_at ON home_comments(created_at DESC);
