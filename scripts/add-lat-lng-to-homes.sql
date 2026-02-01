-- Add latitude and longitude columns to homes table for interactive mapping
ALTER TABLE homes 
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Add index for geospatial queries
CREATE INDEX IF NOT EXISTS idx_homes_location ON homes(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
