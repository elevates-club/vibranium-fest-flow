-- Add policy to allow volunteers to update event_registrations for check-in purposes
-- This allows volunteers to update checked_in and check_in_time fields

-- Add UPDATE policy for volunteers to update check-in status
CREATE POLICY "Volunteers can update check-in status"
ON public.event_registrations
FOR UPDATE
USING (
  has_role(auth.uid(), 'volunteer'::app_role) OR
  has_role(auth.uid(), 'coordinator'::app_role) OR
  has_role(auth.uid(), 'organizer'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'volunteer'::app_role) OR
  has_role(auth.uid(), 'coordinator'::app_role) OR
  has_role(auth.uid(), 'organizer'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);
