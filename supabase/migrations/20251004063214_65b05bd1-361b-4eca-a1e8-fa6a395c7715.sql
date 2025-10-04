-- Create volunteer assignments table for tracking volunteer tasks at events
CREATE TABLE public.volunteer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL,
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  task text NOT NULL,
  zone text,
  status text NOT NULL DEFAULT 'assigned',
  assigned_by uuid NOT NULL,
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('assigned', 'in-progress', 'completed', 'cancelled'))
);

-- Enable RLS
ALTER TABLE public.volunteer_assignments ENABLE ROW LEVEL SECURITY;

-- Volunteers can view their own assignments
CREATE POLICY "Volunteers can view their own assignments"
ON public.volunteer_assignments
FOR SELECT
USING (
  auth.uid() = volunteer_id OR
  has_role(auth.uid(), 'coordinator'::app_role) OR
  has_role(auth.uid(), 'organizer'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Coordinators and organizers can create assignments
CREATE POLICY "Coordinators can create volunteer assignments"
ON public.volunteer_assignments
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'coordinator'::app_role) OR
  has_role(auth.uid(), 'organizer'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Volunteers can update their own assignment status
CREATE POLICY "Volunteers can update their assignment status"
ON public.volunteer_assignments
FOR UPDATE
USING (
  auth.uid() = volunteer_id OR
  has_role(auth.uid(), 'coordinator'::app_role) OR
  has_role(auth.uid(), 'organizer'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add trigger for updated_at
CREATE TRIGGER update_volunteer_assignments_updated_at
BEFORE UPDATE ON public.volunteer_assignments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for performance
CREATE INDEX idx_volunteer_assignments_volunteer_id ON public.volunteer_assignments(volunteer_id);
CREATE INDEX idx_volunteer_assignments_event_id ON public.volunteer_assignments(event_id);
CREATE INDEX idx_volunteer_assignments_status ON public.volunteer_assignments(status);

-- Create check-in logs table for tracking participant check-ins
CREATE TABLE public.check_in_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  volunteer_id uuid NOT NULL,
  qr_code text NOT NULL,
  check_in_time timestamp with time zone NOT NULL DEFAULT now(),
  zone text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.check_in_logs ENABLE ROW LEVEL SECURITY;

-- Volunteers and coordinators can view check-in logs
CREATE POLICY "Staff can view check-in logs"
ON public.check_in_logs
FOR SELECT
USING (
  has_role(auth.uid(), 'volunteer'::app_role) OR
  has_role(auth.uid(), 'coordinator'::app_role) OR
  has_role(auth.uid(), 'organizer'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Volunteers can create check-in logs
CREATE POLICY "Volunteers can create check-in logs"
ON public.check_in_logs
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'volunteer'::app_role) OR
  has_role(auth.uid(), 'coordinator'::app_role) OR
  has_role(auth.uid(), 'staff'::app_role) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Add indexes for performance
CREATE INDEX idx_check_in_logs_event_id ON public.check_in_logs(event_id);
CREATE INDEX idx_check_in_logs_user_id ON public.check_in_logs(user_id);
CREATE INDEX idx_check_in_logs_volunteer_id ON public.check_in_logs(volunteer_id);