import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// Create Supabase client with service role key for admin operations
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('Delete user API called:', { method: req.method, query: req.query });
  
  if (req.method !== 'DELETE') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { userId } = req.query;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({ success: false, error: 'User ID is required' });
  }

  // Check if environment variables are available
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase environment variables');
    return res.status(500).json({ 
      success: false, 
      error: 'Server configuration error - missing Supabase credentials' 
    });
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
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Token verification failed:', authError);
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    console.log('User verified:', { userId: user.id, email: user.email });

    // Check if user has admin role
    console.log('Checking admin role...');
    const { data: roles, error: rolesError } = await supabaseAdmin
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

    // Delete the user - this will cascade delete all related records
    console.log('Deleting user:', userId);
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return res.status(500).json({ success: false, error: deleteError.message });
    }

    console.log('User deleted successfully');
    return res.status(200).json({ 
      success: true, 
      message: 'User deleted successfully' 
    });

  } catch (error: any) {
    console.error('Error in delete-user API:', error);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    });
  }
}
