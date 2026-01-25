-- Create po_requests_item table to store line items for invoices
CREATE TABLE IF NOT EXISTS po_requests_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_request_id UUID NOT NULL REFERENCES po_requests(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL,
  item_id UUID,
  item_name TEXT NOT NULL,
  item_description TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(10, 2) NOT NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_po_requests_item_po_request_id ON po_requests_item(po_request_id);
CREATE INDEX IF NOT EXISTS idx_po_requests_item_item_id ON po_requests_item(item_id);

-- Add comment
COMMENT ON TABLE po_requests_item IS 'Stores line items for invoices (po_requests), which are copied to payment_items when the invoice is paid';
