-- Make end_date column nullable in events table
-- This allows events to be created without an end date

ALTER TABLE events 
ALTER COLUMN end_date DROP NOT NULL;

-- Add a comment to document the change
COMMENT ON COLUMN events.end_date IS 'Optional end date and time for the event. If NULL, event has no specific end time.';
