-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create temporary logins table for testing different roles
CREATE TABLE public.temp_logins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role app_role NOT NULL,
  name text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  last_login timestamp with time zone,
  is_active boolean DEFAULT true
);

-- Enable RLS on temp_logins
ALTER TABLE public.temp_logins ENABLE ROW LEVEL SECURITY;

-- Only allow system/admin access to temp_logins
CREATE POLICY "Only system can manage temp logins"
ON public.temp_logins
FOR ALL
USING (false); -- This table is only accessible via functions

-- Create dummy credentials for all roles with simple password "1234"
INSERT INTO public.temp_logins (
  email,
  password_hash,
  role,
  name,
  expires_at
) VALUES 
-- Admin role
(
  'admin@vibranium.com',
  crypt('1234', gen_salt('bf')),
  'admin',
  'Admin User',
  now() + interval '30 days'
),
-- Organizer role
(
  'organizer@vibranium.com',
  crypt('1234', gen_salt('bf')),
  'organizer',
  'Event Organizer',
  now() + interval '30 days'
),
-- Coordinator role
(
  'coordinator@vibranium.com',
  crypt('1234', gen_salt('bf')),
  'coordinator',
  'Event Coordinator',
  now() + interval '30 days'
),
-- Staff role
(
  'staff@vibranium.com',
  crypt('1234', gen_salt('bf')),
  'staff',
  'Staff Member',
  now() + interval '30 days'
),
-- Volunteer role
(
  'volunteer@vibranium.com',
  crypt('1234', gen_salt('bf')),
  'volunteer',
  'Volunteer Helper',
  now() + interval '30 days'
),
-- Participant role
(
  'participant@vibranium.com',
  crypt('1234', gen_salt('bf')),
  'participant',
  'Regular Participant',
  now() + interval '30 days'
);

-- Create function to authenticate temp users
CREATE OR REPLACE FUNCTION public.authenticate_temp_user(
  p_email text,
  p_password text
)
RETURNS TABLE (
  user_id uuid,
  user_email text,
  user_role app_role,
  user_name text,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  temp_record record;
  temp_user_id uuid;
BEGIN
  -- Check if temp login exists and is valid
  SELECT * INTO temp_record
  FROM public.temp_logins
  WHERE email = p_email
    AND expires_at > now()
    AND is_active = true
    AND password_hash = crypt(p_password, password_hash);
  
  IF temp_record.id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::app_role, NULL::text, false;
    RETURN;
  END IF;
  
  -- Update last login
  UPDATE public.temp_logins 
  SET last_login = now()
  WHERE id = temp_record.id;
  
  -- Return temp user info
  temp_user_id := temp_record.id;
  
  RETURN QUERY SELECT 
    temp_user_id,
    temp_record.email,
    temp_record.role,
    temp_record.name,
    true;
END;
$$;