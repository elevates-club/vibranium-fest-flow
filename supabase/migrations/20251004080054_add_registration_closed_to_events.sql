-- Add registration_closed column to events table
ALTER TABLE public.events 
ADD COLUMN registration_closed BOOLEAN DEFAULT FALSE;

-- Add comment for clarity
COMMENT ON COLUMN public.events.registration_closed IS 'Whether registration is closed for this event';
