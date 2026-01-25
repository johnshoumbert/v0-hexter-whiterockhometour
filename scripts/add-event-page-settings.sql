-- Add page_settings column to events table for storing customizable page configurations
ALTER TABLE events ADD COLUMN IF NOT EXISTS page_settings JSONB DEFAULT '{}'::jsonb;

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_page_settings ON events USING GIN (page_settings);

COMMENT ON COLUMN events.page_settings IS 'Stores page-specific settings like hero images, text overlays, and custom content for different pages';
