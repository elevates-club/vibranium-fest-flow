-- Update the handle_new_user function to include all profile fields from user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    user_id, 
    email, 
    first_name, 
    last_name,
    phone,
    department,
    year,
    college
  )
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'department',
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'year' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'year')::integer 
      ELSE NULL 
    END,
    NEW.raw_user_meta_data ->> 'college'
  );
  
  -- Assign default participant role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'participant');
  
  RETURN NEW;
END;
$$;
