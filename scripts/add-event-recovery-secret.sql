CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Add recovery_secret column to events table (8-character hash)
ALTER TABLE events
ADD COLUMN IF NOT EXISTS recovery_secret VARCHAR(8);

-- Generate unique 8-character secrets for existing events
UPDATE events
SET recovery_secret = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT) FROM 1 FOR 8))
WHERE recovery_secret IS NULL;

-- Make it NOT NULL after populating
ALTER TABLE events
ALTER COLUMN recovery_secret SET NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_recovery_secret ON events(recovery_secret);

-- Add reminder tracking columns to po_requests if not exists
ALTER TABLE po_requests
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP;

COMMIT;
