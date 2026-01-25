-- Add page_settings column to events table for storing page-specific configurations
-- This allows customization of hero images, text, and other page elements

ALTER TABLE events ADD COLUMN IF NOT EXISTS page_settings JSONB DEFAULT '{}';

-- Create index for faster JSONB queries
CREATE INDEX IF NOT EXISTS idx_events_page_settings ON events USING gin(page_settings);

COMMENT ON COLUMN events.page_settings IS 'Stores page-specific settings like hero images, text overlays, and custom content for different pages (home, the-homes, etc.)';
