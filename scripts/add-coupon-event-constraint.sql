-- Add a composite unique constraint to ensure coupon codes are unique per event
-- This allows the same code to be used for different events

-- First, drop the old unique constraint on code if it exists
ALTER TABLE discount_codes DROP CONSTRAINT IF EXISTS discount_codes_code_key;

-- Add a composite unique constraint on (event_id, code)
ALTER TABLE discount_codes ADD CONSTRAINT discount_codes_event_code_unique UNIQUE (event_id, code);

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_discount_codes_event_code ON discount_codes(event_id, code);
