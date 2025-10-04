-- Fix QR Code Index Issue
-- Run this SQL in your Supabase SQL Editor

-- Drop the problematic constraint on qr_code_data
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_qr_code_key;

-- The qr_code_data column should not have a unique constraint
-- since QR codes can be large base64 strings
-- We'll rely on participant_id for uniqueness instead

-- Verify the fix
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('qr_code_data', 'participant_id', 'qr_code_generated_at')
ORDER BY column_name;
