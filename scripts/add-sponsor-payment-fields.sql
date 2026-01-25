-- Add payment tracking fields to sponsor_requests table
ALTER TABLE sponsor_requests 
ADD COLUMN IF NOT EXISTS payment_status VARCHAR DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id VARCHAR,
ADD COLUMN IF NOT EXISTS invoice_generated_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS invoice_sent_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS payment_due_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS reminder_emails_sent INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_reminder_sent_at TIMESTAMP;

-- Add index for faster payment status queries
CREATE INDEX IF NOT EXISTS idx_sponsor_requests_payment_status 
ON sponsor_requests(payment_status);

CREATE INDEX IF NOT EXISTS idx_sponsor_requests_payment_method 
ON sponsor_requests(payment_method);
