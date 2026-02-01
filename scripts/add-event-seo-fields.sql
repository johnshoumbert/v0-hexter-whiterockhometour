-- Add SEO fields to events table
-- This migration adds fields for managing SEO meta tags including page title, description,
-- Open Graph tags for social sharing, canonical URL, and indexing control

-- Check if columns exist before adding them to prevent errors on re-run
DO $$ 
BEGIN
    -- Add seo_title column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='seo_title') THEN
        ALTER TABLE events ADD COLUMN seo_title TEXT;
    END IF;

    -- Add seo_description column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='seo_description') THEN
        ALTER TABLE events ADD COLUMN seo_description TEXT;
    END IF;

    -- Add seo_og_title column (Open Graph title for social sharing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='seo_og_title') THEN
        ALTER TABLE events ADD COLUMN seo_og_title TEXT;
    END IF;

    -- Add seo_og_description column (Open Graph description for social sharing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='seo_og_description') THEN
        ALTER TABLE events ADD COLUMN seo_og_description TEXT;
    END IF;

    -- Add seo_og_image column (Open Graph image URL for social sharing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='seo_og_image') THEN
        ALTER TABLE events ADD COLUMN seo_og_image TEXT;
    END IF;

    -- Add seo_canonical_url column (canonical URL for avoiding duplicate content)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='seo_canonical_url') THEN
        ALTER TABLE events ADD COLUMN seo_canonical_url TEXT;
    END IF;

    -- Add seo_no_index column (prevent search engine indexing)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='events' AND column_name='seo_no_index') THEN
        ALTER TABLE events ADD COLUMN seo_no_index BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add comments to document the columns
COMMENT ON COLUMN events.seo_title IS 'SEO page title that appears in browser tabs and search results (recommended: 50-60 characters)';
COMMENT ON COLUMN events.seo_description IS 'Meta description for search results (recommended: 150-160 characters)';
COMMENT ON COLUMN events.seo_og_title IS 'Open Graph title for social media sharing (falls back to seo_title if null)';
COMMENT ON COLUMN events.seo_og_description IS 'Open Graph description for social media sharing (falls back to seo_description if null)';
COMMENT ON COLUMN events.seo_og_image IS 'Open Graph image URL for social media sharing preview (recommended: 1200x630px)';
COMMENT ON COLUMN events.seo_canonical_url IS 'Canonical URL to avoid duplicate content issues in search engines';
COMMENT ON COLUMN events.seo_no_index IS 'When true, adds noindex robots meta tag to prevent search engine indexing';
