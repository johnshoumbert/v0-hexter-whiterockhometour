-- Refactor po_requests table to use foreign keys instead of duplicate data
-- Add user_id and sponsor_id columns, remove duplicate contact fields

-- Add foreign key columns
ALTER TABLE po_requests
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS sponsor_id UUID REFERENCES sponsors(id),
ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_po_requests_user_id ON po_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_po_requests_sponsor_id ON po_requests(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_po_requests_event_id ON po_requests(event_id);

-- Migrate existing data: try to match by email to users table
UPDATE po_requests pr
SET user_id = u.id
FROM users u
WHERE pr.email = u.email
AND pr.user_id IS NULL;

-- Drop the duplicate columns (keep them for now in case data needs to be preserved)
-- You can run these after verifying the migration worked:
-- ALTER TABLE po_requests DROP COLUMN IF EXISTS name;
-- ALTER TABLE po_requests DROP COLUMN IF EXISTS email;
-- ALTER TABLE po_requests DROP COLUMN IF EXISTS phone;
-- ALTER TABLE po_requests DROP COLUMN IF EXISTS school_name;

-- For now, just comment that these columns are deprecated
COMMENT ON COLUMN po_requests.name IS 'DEPRECATED - Use user_id and join with users table';
COMMENT ON COLUMN po_requests.email IS 'DEPRECATED - Use user_id and join with users table';
COMMENT ON COLUMN po_requests.phone IS 'DEPRECATED - Use user_id and join with users table';
COMMENT ON COLUMN po_requests.school_name IS 'DEPRECATED - Use event_id and join with events table';
