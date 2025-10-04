-- Allow organizers to view profiles of users who have registered for their events
CREATE POLICY "Organizers can view profiles of registered users"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.event_registrations er
    JOIN public.events e ON er.event_id = e.id
    WHERE er.user_id = profiles.user_id
    AND e.created_by = auth.uid()
  ) OR
  public.has_role(auth.uid(), 'admin')
);
