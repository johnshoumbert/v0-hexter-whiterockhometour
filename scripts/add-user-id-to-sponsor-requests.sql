-- Add user_id column to sponsor_requests table to tie requests to authenticated users
ALTER TABLE sponsor_requests 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id);

-- Create index for faster lookups by user
CREATE INDEX IF NOT EXISTS idx_sponsor_requests_user_id ON sponsor_requests(user_id);

-- Backfill user_id for existing requests based on contact_email (optional)
-- This attempts to match existing sponsor requests to users by email
UPDATE sponsor_requests sr
SET user_id = u.id
FROM users u
WHERE sr.contact_email = u.email 
  AND sr.user_id IS NULL;
