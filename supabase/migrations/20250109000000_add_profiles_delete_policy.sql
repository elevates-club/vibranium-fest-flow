-- Add DELETE policy for profiles table to allow admins to delete user profiles
-- This fixes the issue where user deletion in Admin Dashboard was failing

CREATE POLICY "Admins can delete profiles"
ON public.profiles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));
