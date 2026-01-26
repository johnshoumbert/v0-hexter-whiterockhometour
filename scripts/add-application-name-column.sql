-- Add application_name column to events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS application_name VARCHAR(255) DEFAULT 'myschoolauction';

-- Set all existing events to 'myschoolauction'
UPDATE events 
SET application_name = 'myschoolauction' 
WHERE application_name IS NULL;

-- Set the specific event to 'hometour'
UPDATE events 
SET application_name = 'hometour' 
WHERE id = 'd42fcc36-3f53-4a65-982c-373776747c44';

-- Verify the changes
SELECT id, event_name, domain, application_name 
FROM events 
ORDER BY application_name, event_name;
