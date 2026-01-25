-- Create table to track invoice views and checkout attempts
CREATE TABLE IF NOT EXISTS invoice_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES po_requests(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'viewed', 'checkout_started', 'payment_completed'
  metadata JSONB, -- Additional tracking data (IP, user agent, etc.)
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_invoice_tracking_invoice_id ON invoice_tracking(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tracking_user_id ON invoice_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tracking_event_type ON invoice_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_invoice_tracking_created_at ON invoice_tracking(created_at);

-- Composite index for abandoned invoice queries
CREATE INDEX IF NOT EXISTS idx_invoice_tracking_lookup ON invoice_tracking(invoice_id, event_type, created_at);

-- Add reminder tracking columns to po_requests
ALTER TABLE po_requests
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

COMMENT ON TABLE invoice_tracking IS 'Tracks invoice views, checkout attempts, and payment completions for abandonment recovery';
COMMENT ON COLUMN po_requests.last_reminder_sent_at IS 'Timestamp of last abandonment reminder email sent';
COMMENT ON COLUMN po_requests.reminder_count IS 'Number of abandonment reminder emails sent';
