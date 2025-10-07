-- Add foreign key constraints to check_in_logs table
-- This will establish proper relationships for Supabase queries

-- Add foreign key constraint for user_id -> profiles.user_id
ALTER TABLE public.check_in_logs 
ADD CONSTRAINT check_in_logs_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add foreign key constraint for volunteer_id -> auth.users(id)
ALTER TABLE public.check_in_logs 
ADD CONSTRAINT check_in_logs_volunteer_id_fkey 
FOREIGN KEY (volunteer_id) 
REFERENCES auth.users(id) 
ON DELETE SET NULL;

-- Add foreign key constraint for event_id -> events(id) (if not already exists)
-- This might already exist, but adding it to be safe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'check_in_logs_event_id_fkey'
    ) THEN
        ALTER TABLE public.check_in_logs 
        ADD CONSTRAINT check_in_logs_event_id_fkey 
        FOREIGN KEY (event_id) 
        REFERENCES public.events(id) 
        ON DELETE CASCADE;
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_check_in_logs_user_id ON public.check_in_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_volunteer_id ON public.check_in_logs(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_event_id ON public.check_in_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_check_in_logs_check_in_time ON public.check_in_logs(check_in_time);
