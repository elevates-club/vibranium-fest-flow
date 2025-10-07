-- Add DELETE policy for check-in logs
-- Volunteers and coordinators can delete check-in logs

CREATE POLICY "Staff can delete check-in logs"
ON public.check_in_logs
FOR DELETE
USING (
  has_role(auth.uid(), 'volunteer'::app_role) OR
  has_role(auth.uid(), 'coordinator'::app_role) OR
  has_role(auth.uid(), 'organizer'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);
