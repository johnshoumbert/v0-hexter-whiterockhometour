-- Add user_id column to sponsor_requests table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sponsor_requests' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE sponsor_requests 
    ADD COLUMN user_id UUID REFERENCES users(id);
    
    -- Add index for better query performance
    CREATE INDEX IF NOT EXISTS idx_sponsor_requests_user_id ON sponsor_requests(user_id);
  END IF;
END $$;

-- Add additional columns to sponsor_requests if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sponsor_requests' AND column_name = 'logo_url'
  ) THEN
    ALTER TABLE sponsor_requests 
    ADD COLUMN logo_url TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sponsor_requests' AND column_name = 'website'
  ) THEN
    ALTER TABLE sponsor_requests 
    ADD COLUMN website TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sponsor_requests' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE sponsor_requests 
    ADD COLUMN contact_phone TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'sponsor_requests' AND column_name = 'additional_info'
  ) THEN
    ALTER TABLE sponsor_requests 
    ADD COLUMN additional_info TEXT;
  END IF;
END $$;
