import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Use the same Supabase configuration as the frontend
const SUPABASE_URL = "https://rqzklkmajrgfchsyvjgb.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJxemtsa21hanJnZmNoc3l2amdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwNDg3MDMsImV4cCI6MjA3NDYyNDcwM30.BF-5YenFGTusvl8905oIBAFlVlCu-bHuRNDDCj693TQ";

// Create Supabase client with anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Delete user API called:', { method: req.method, query: req.query });
  
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }


  try {
    // Verify the requesting user is an admin
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No authorization header provided');
      return res.status(401).json({ success: false, error: 'Authorization token required' });
    }

    const token = authHeader.substring(7);
    console.log('Verifying user token...');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Token verification failed:', authError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    console.log('User verified:', { userId: user.id, email: user.email });

    // Check if user has admin role
    console.log('Checking admin role...');
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin');

    if (rolesError) {
      console.error('Error checking roles:', rolesError);
      return res.status(500).json({ success: false, error: 'Failed to verify admin privileges' });
    }

    if (!roles || roles.length === 0) {
      console.log('User does not have admin role');
      return res.status(403).json({ success: false, error: 'Admin privileges required' });
    }

    console.log('Admin privileges verified, proceeding with user deletion');

    // Since we can't delete from auth.users with anon key, we'll delete all related data
    // This effectively removes the user from the application
    console.log('Deleting user data:', userId);
    
    // Delete user roles
    const { error: rolesDeleteError } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId);
    
    if (rolesDeleteError) {
      console.error('Error deleting user roles:', rolesDeleteError);
      return res.status(500).json({ success: false, error: 'Failed to delete user roles' });
    }

    // Delete user profile
    const { error: profileDeleteError } = await supabase
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    
    if (profileDeleteError) {
      console.error('Error deleting user profile:', profileDeleteError);
      return res.status(500).json({ success: false, error: 'Failed to delete user profile' });
    }

    // Delete user points
    const { error: pointsDeleteError } = await supabase
      .from('user_points')
      .delete()
      .eq('user_id', userId);
    
    if (pointsDeleteError) {
      console.error('Error deleting user points:', pointsDeleteError);
      // Don't fail the entire operation for this
    }

    // Delete event registrations
    const { error: registrationsDeleteError } = await supabase
      .from('event_registrations')
      .delete()
      .eq('user_id', userId);
    
    if (registrationsDeleteError) {
      console.error('Error deleting event registrations:', registrationsDeleteError);
      // Don't fail the entire operation for this
    }

    console.log('User data deleted successfully');
    return res.status(200).json({ 
      success: true, 
      message: 'User data deleted successfully. Note: User account remains in auth system but is effectively removed from the application.' 
    });

  } catch (error: any) {
    console.error('Error in delete-user API:', error);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    });
  }
}
