-- Update the White Rock Home Tour 2025 event to use the production domain
-- This enables the event to be found when accessing whiterock-2025.ourneighborhoodtour.com

-- First, let's see all hometour events to identify the correct one
-- SELECT id, event_name, domain, application_name FROM events WHERE application_name = 'hometour';

-- Update the domain for the 2025 White Rock Home Tour event
-- The event ID 63c3a678-2a30-4777-93b4-4522095fe0aa is the dev/demo event
-- We need to update the production event with the correct domain

UPDATE events 
SET domain = 'whiterock-2025.ourneighborhoodtour.com'
WHERE application_name = 'hometour'
  AND (
    event_name ILIKE '%2025%White Rock%' 
    OR event_name ILIKE '%White Rock%2025%'
    OR id = 'd42fcc36-3f53-4a65-982c-373776747c44'
  );

-- If no rows updated, check if we need to create the mapping
-- SELECT * FROM events WHERE application_name = 'hometour';
