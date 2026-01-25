-- Add internal_notes column to sponsors table
-- This column stores private notes about sponsors that are not shown publicly

ALTER TABLE sponsors
ADD COLUMN IF NOT EXISTS internal_notes TEXT;

-- Add comment to the column
COMMENT ON COLUMN sponsors.internal_notes IS 'Internal notes about the sponsor (not shown publicly)';
