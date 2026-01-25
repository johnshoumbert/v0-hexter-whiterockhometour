-- Add product type and item filters to coupons
ALTER TABLE discount_codes 
ADD COLUMN IF NOT EXISTS applies_to VARCHAR(20) DEFAULT 'cart', -- 'cart', 'ticket', 'shop'
ADD COLUMN IF NOT EXISTS applies_to_item_ids TEXT[]; -- Array of specific item IDs (optional)

-- Fixed coupon_id to use UUID type instead of INTEGER
-- Add column to track coupon usage by user
CREATE TABLE IF NOT EXISTS coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID REFERENCES discount_codes(id),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL,
  order_type VARCHAR(50), -- 'ticket', 'shop', 'donation', 'sponsor'
  order_id UUID,
  discount_applied DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_coupon_usage_coupon_id ON coupon_usage(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_usage_user_id ON coupon_usage(user_id);
