-- QR Code Migration for Vibranium 5.0
-- Run this SQL in your Supabase SQL Editor

-- Add QR code related columns to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS qr_code_data TEXT,
ADD COLUMN IF NOT EXISTS participant_id VARCHAR(50) UNIQUE,
ADD COLUMN IF NOT EXISTS qr_code_generated_at TIMESTAMP WITH TIME ZONE;

-- Create index for participant_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_participant_id ON profiles(participant_id);

-- Add comment for clarity
COMMENT ON COLUMN profiles.qr_code_data IS 'Base64 encoded QR code image data for the user';
COMMENT ON COLUMN profiles.participant_id IS 'Unique participant ID for QR code generation (e.g., VIB123ABC)';
COMMENT ON COLUMN profiles.qr_code_generated_at IS 'Timestamp when the QR code was last generated';

-- Create a function to generate unique participant IDs
CREATE OR REPLACE FUNCTION generate_participant_id()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    new_id TEXT;
    exists_count INTEGER;
BEGIN
    LOOP
        -- Generate a shorter unique ID with format VIB + random string
        new_id := 'VIB' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8));
        
        -- Check if this ID already exists
        SELECT COUNT(*) INTO exists_count FROM profiles WHERE participant_id = new_id;
        
        -- If it doesn't exist, we can use it
        IF exists_count = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    
    RETURN new_id;
END;
$$;

-- Add comment for the function
COMMENT ON FUNCTION generate_participant_id() IS 'Generates a unique participant ID for QR code generation';

-- Create a trigger to automatically generate participant_id when a new profile is created
CREATE OR REPLACE FUNCTION set_participant_id()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only set participant_id if it's not already set
    IF NEW.participant_id IS NULL THEN
        NEW.participant_id := generate_participant_id();
    END IF;
    
    RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_set_participant_id ON profiles;
CREATE TRIGGER trigger_set_participant_id
    BEFORE INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION set_participant_id();

-- Update existing profiles that don't have participant_id
UPDATE profiles 
SET participant_id = generate_participant_id()
WHERE participant_id IS NULL;

-- Verify the migration worked
SELECT 
    id, 
    participant_id, 
    qr_code_data, 
    qr_code_generated_at,
    first_name,
    last_name,
    email
FROM profiles 
LIMIT 5;
