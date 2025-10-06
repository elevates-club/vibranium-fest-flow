-- Add custom selection options to events table
-- This allows organizers to create custom selection fields for event registration

ALTER TABLE events 
ADD COLUMN custom_selection_options JSONB DEFAULT NULL;

-- Add comment to explain the structure
COMMENT ON COLUMN events.custom_selection_options IS 'JSON array of custom selection options for event registration. Format: [{"label": "Question", "type": "select|radio|checkbox", "options": ["Option 1", "Option 2"], "required": true}]';

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_custom_selection_options ON events USING GIN (custom_selection_options);
