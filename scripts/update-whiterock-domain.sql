-- Update the White Rock Home Tour event to use the Vercel app domain
UPDATE events 
SET domain = 'v0-hexter-whiterockhometour.vercel.app'
WHERE id = 'd42fcc36-3f53-4a65-982c-373776747c44';
