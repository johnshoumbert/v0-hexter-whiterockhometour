-- Create abandoned_cart_tracking table
CREATE TABLE IF NOT EXISTS abandoned_cart_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  user_email VARCHAR(255),
  user_name VARCHAR(255),
  cart_data JSONB NOT NULL,
  cart_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  last_activity_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reminder_sent_at TIMESTAMP WITHOUT TIME ZONE,
  reminder_count INTEGER DEFAULT 0,
  converted BOOLEAN DEFAULT FALSE,
  converted_at TIMESTAMP WITHOUT TIME ZONE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_abandoned_cart_event_id ON abandoned_cart_tracking(event_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_cart_user_id ON abandoned_cart_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_abandoned_cart_converted ON abandoned_cart_tracking(converted);
CREATE INDEX IF NOT EXISTS idx_abandoned_cart_last_activity ON abandoned_cart_tracking(last_activity_at);

-- Insert abandoned-cart email template if it doesn't exist
INSERT INTO email_templates (
  id,
  email_task,
  template_id,
  subject,
  description,
  required_fields,
  optional_fields,
  example_data,
  is_active,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  'abandoned-cart',
  'd-abandoned-cart-reminder',
  'Complete Your Purchase - {{event_name}}',
  'Email sent to users who have items in their cart but have not completed checkout',
  '["user_name", "event_name", "cart_items", "cart_total", "cart_url"]'::jsonb,
  '["discount_code", "support_email"]'::jsonb,
  '{"user_name": "John Doe", "event_name": "Spring Auction 2024", "cart_items": [{"name": "Item 1", "price": 25.00}], "cart_total": "25.00", "cart_url": "https://example.com/shop"}'::jsonb,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email_task) DO NOTHING;
