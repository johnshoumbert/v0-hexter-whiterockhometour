-- Create testimonials table for White Rock Home Tour
CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  author_name VARCHAR(255) NOT NULL,
  author_title VARCHAR(255),
  author_avatar TEXT,
  quote TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create index on event_id for faster queries
CREATE INDEX IF NOT EXISTS idx_testimonials_event_id ON testimonials(event_id);

-- Create index on display_order for sorting
CREATE INDEX IF NOT EXISTS idx_testimonials_display_order ON testimonials(display_order);
