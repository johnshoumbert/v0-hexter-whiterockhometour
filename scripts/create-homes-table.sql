-- Create homes table for White Rock Home Tour
CREATE TABLE IF NOT EXISTS homes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  address VARCHAR(500),
  sponsor VARCHAR(255),
  short_description TEXT,
  full_description TEXT,
  item_images TEXT[], -- Array of image URLs
  display_order INTEGER DEFAULT 0,
  directions_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on event_id for faster queries
CREATE INDEX IF NOT EXISTS idx_homes_event_id ON homes(event_id);

-- Create index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_homes_display_order ON homes(display_order);
