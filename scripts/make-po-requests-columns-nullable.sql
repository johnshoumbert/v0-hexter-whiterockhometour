-- Make the deprecated columns in po_requests nullable since we're using foreign keys now
-- This allows us to use user_id/sponsor_id instead of duplicating contact data

ALTER TABLE po_requests
ALTER COLUMN name DROP NOT NULL,
ALTER COLUMN email DROP NOT NULL,
ALTER COLUMN phone DROP NOT NULL,
ALTER COLUMN school_name DROP NOT NULL;

-- Add comments to indicate these are deprecated
COMMENT ON COLUMN po_requests.name IS 'DEPRECATED - Use user_id and join with users table instead';
COMMENT ON COLUMN po_requests.email IS 'DEPRECATED - Use user_id and join with users table instead';
COMMENT ON COLUMN po_requests.phone IS 'DEPRECATED - Use user_id and join with users table instead';
COMMENT ON COLUMN po_requests.school_name IS 'DEPRECATED - Use event_id and join with events table instead';
