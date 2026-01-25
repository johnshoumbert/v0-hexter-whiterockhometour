-- Create auction_donors table to store donor information separately
-- This allows one donor to donate multiple items

CREATE TABLE IF NOT EXISTS auction_donors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_name VARCHAR(255),
  donor_email VARCHAR(255),
  donor_phone VARCHAR(50),
  donor_organization VARCHAR(255),
  donor_address TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_auction_donors_email ON auction_donors(donor_email);

-- Add donor_id to auctions table (foreign key to auction_donors)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'donor_id'
  ) THEN
    ALTER TABLE auctions 
    ADD COLUMN donor_id UUID REFERENCES auction_donors(id);
    
    CREATE INDEX IF NOT EXISTS idx_auctions_donor_id ON auctions(donor_id);
  END IF;
END $$;

-- Ensure delivery_method and donation_notes columns exist on auctions table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'delivery_method'
  ) THEN
    ALTER TABLE auctions ADD COLUMN delivery_method TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'auctions' AND column_name = 'donation_notes'
  ) THEN
    ALTER TABLE auctions ADD COLUMN donation_notes TEXT;
  END IF;
END $$;
