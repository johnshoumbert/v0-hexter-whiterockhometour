-- Add release tracking columns to bids table
DO $$ 
BEGIN
  -- Add delivered column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bids' AND column_name = 'delivered') THEN
    ALTER TABLE bids ADD COLUMN delivered BOOLEAN DEFAULT FALSE;
  END IF;

  -- Add release_code column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bids' AND column_name = 'release_code') THEN
    ALTER TABLE bids ADD COLUMN release_code VARCHAR(10);
  END IF;

  -- Add released_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'bids' AND column_name = 'released_at') THEN
    ALTER TABLE bids ADD COLUMN released_at TIMESTAMP;
  END IF;
END $$;

COMMIT;
