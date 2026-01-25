-- Create invoice_tracking table for tracking invoice views and interactions
CREATE TABLE IF NOT EXISTS invoice_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL,
  user_id UUID,
  event_id UUID,
  event_type VARCHAR(50) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT fk_invoice_tracking_invoice FOREIGN KEY (invoice_id) REFERENCES po_requests(id) ON DELETE CASCADE,
  CONSTRAINT fk_invoice_tracking_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_invoice_tracking_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoice_tracking_invoice_id ON invoice_tracking(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_tracking_event_type ON invoice_tracking(event_type);
CREATE INDEX IF NOT EXISTS idx_invoice_tracking_created_at ON invoice_tracking(created_at);
CREATE INDEX IF NOT EXISTS idx_invoice_tracking_user_id ON invoice_tracking(user_id);

-- Add comment
COMMENT ON TABLE invoice_tracking IS 'Tracks invoice views and user interactions for analytics and follow-up';
