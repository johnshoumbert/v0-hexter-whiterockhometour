-- Add attachments column to email_queue table for file attachments
ALTER TABLE email_queue 
ADD COLUMN IF NOT EXISTS attachments JSONB;

COMMENT ON COLUMN email_queue.attachments IS 'Array of attachment objects with filename, content (base64), and contentType';

-- Example structure:
-- [{"filename": "invoice.html", "content": "base64string", "contentType": "text/html"}]
