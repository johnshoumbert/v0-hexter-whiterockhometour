-- Create payment_items table to store line items for payments
CREATE TABLE IF NOT EXISTS payment_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  item_type VARCHAR(50) NOT NULL, -- 'auction', 'shop', 'ticket', 'donation', etc.
  item_id UUID, -- Reference to auction_id, shop_item_id, etc.
  item_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10, 2) NOT NULL,
  total_amount NUMERIC(10, 2) NOT NULL,
  metadata JSONB, -- For additional item details
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_items_payment_id ON payment_items(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_item_id ON payment_items(item_id);
CREATE INDEX IF NOT EXISTS idx_payment_items_item_type ON payment_items(item_type);

-- Add payment_id column to po_requests to link invoices to payments
ALTER TABLE po_requests
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES payments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_po_requests_payment_id ON po_requests(payment_id);

-- Add comment
COMMENT ON TABLE payment_items IS 'Stores line items (individual products/services) for each payment transaction';
COMMENT ON COLUMN po_requests.payment_id IS 'Links invoice to the payment record. NULL if payment not yet created';
