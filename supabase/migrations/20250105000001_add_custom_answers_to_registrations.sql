-- Add custom answers column to event_registrations table
-- This stores the answers to custom selection questions for each registration

ALTER TABLE event_registrations 
ADD COLUMN custom_answers JSONB DEFAULT NULL;

-- Add comment to explain the structure
COMMENT ON COLUMN event_registrations.custom_answers IS 'JSON object storing answers to custom selection questions. Format: {"selection_id": "answer_value"}';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_custom_answers ON event_registrations USING GIN (custom_answers);
