-- Fix RLS policy to allow everyone to view registration counts for events
-- This is needed for displaying registration counts on the events page

-- Create a security definer function to get registration count
-- This bypasses RLS and only returns the count, not sensitive data
CREATE OR REPLACE FUNCTION public.get_event_registration_count(event_id_param UUID)
RETURNS INTEGER
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.event_registrations
  WHERE event_id = event_id_param
$$;

-- Add comment for clarity
COMMENT ON FUNCTION public.get_event_registration_count(UUID) IS 'Returns the count of registrations for an event, bypassing RLS for display purposes';
