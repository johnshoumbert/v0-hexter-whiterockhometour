-- Create event_settings table for storing page-specific settings
CREATE TABLE IF NOT EXISTS event_settings (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  page TEXT NOT NULL,
  object TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, page, object)
);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_event_settings_event_id ON event_settings(event_id);
CREATE INDEX IF NOT EXISTS idx_event_settings_page_object ON event_settings(page, object);

-- Add default details hero image for existing events
INSERT INTO event_settings (event_id, page, object, value)
SELECT 
  id as event_id,
  'details' as page,
  'details_hero' as object,
  '"https://ubsxwry7ayqkssqp.public.blob.vercel-storage.com/wrth-details-hero-ftxV0yRz3Xh5u0wqHzgWxtaEYb3fsM"'::jsonb as value
FROM events
ON CONFLICT (event_id, page, object) DO NOTHING;

COMMENT ON TABLE event_settings IS 'Stores page-specific settings like hero images, text overlays, and custom content';
COMMENT ON COLUMN event_settings.page IS 'The page this setting applies to (e.g., details, home, gallery)';
COMMENT ON COLUMN event_settings.object IS 'The specific object/element this setting controls (e.g., details_hero, banner_text)';
COMMENT ON COLUMN event_settings.value IS 'JSON value storing the setting data (can be string, object, array, etc.)';
