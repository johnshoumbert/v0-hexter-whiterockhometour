-- Remove legacy donor columns and ensure proper foreign key relationship
-- This migration cleans up the auctions table to only store donor_user_id

DO $$ 
BEGIN
  -- Add donor_user_id if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'donor_user_id'
  ) THEN
    ALTER TABLE auctions 
    ADD COLUMN donor_user_id UUID REFERENCES users(id);
    
    CREATE INDEX IF NOT EXISTS idx_auctions_donor_user_id ON auctions(donor_user_id);
  END IF;

  -- Remove donor_name if it exists (should get from users table)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'donor_name'
  ) THEN
    ALTER TABLE auctions DROP COLUMN donor_name;
  END IF;

  -- Remove donor_email if it exists (should get from users table)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'donor_email'
  ) THEN
    ALTER TABLE auctions DROP COLUMN donor_email;
  END IF;

  -- Remove donor_phone if it exists (should get from users table)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'donor_phone'
  ) THEN
    ALTER TABLE auctions DROP COLUMN donor_phone;
  END IF;

  -- Remove donor_organization if it exists (should get from users table)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'donor_organization'
  ) THEN
    ALTER TABLE auctions DROP COLUMN donor_organization;
  END IF;

  -- Remove donor_address if it exists (should get from users table)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'donor_address'
  ) THEN
    ALTER TABLE auctions DROP COLUMN donor_address;
  END IF;

  -- Remove delivery_method if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'delivery_method'
  ) THEN
    ALTER TABLE auctions DROP COLUMN delivery_method;
  END IF;

  -- Remove donation_notes if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'donation_notes'
  ) THEN
    ALTER TABLE auctions DROP COLUMN donation_notes;
  END IF;

  -- Keep the donor column as a legacy text field for backward compatibility
  -- It can store the donor name as a simple string when donor_user_id is not set
  
END $$;
