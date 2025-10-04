-- Add qr_code column to profiles table (one QR per user)
ALTER TABLE public.profiles 
ADD COLUMN qr_code text UNIQUE;

-- Generate QR codes for existing profiles (using user_id as the unique identifier)
UPDATE public.profiles 
SET qr_code = 'QR-' || id 
WHERE qr_code IS NULL;

-- Remove qr_code column from event_registrations table
ALTER TABLE public.event_registrations 
DROP COLUMN IF EXISTS qr_code;

-- Add comment for clarity
COMMENT ON COLUMN public.profiles.qr_code IS 'Unique QR code for user, used for event check-ins across all events';