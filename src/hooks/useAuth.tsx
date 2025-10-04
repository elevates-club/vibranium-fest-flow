import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRoles: string[];
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  userRoles: [],
  signOut: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  const fetchUserRoles = async (userId: string) => {
    try {
      // Get roles from user_roles table
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching user roles:', error);
        // Fallback: try to get role from user metadata
        const session = await supabase.auth.getSession();
        if (session.data.session?.user?.user_metadata?.role) {
          setUserRoles([session.data.session.user.user_metadata.role]);
          return;
        }
        setUserRoles(['participant']);
        return;
      }
      
      const roles = data?.map(item => item.role) || [];
      setUserRoles(roles);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      setUserRoles([]);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserRoles(session.user.id);
        } else {
          setUserRoles([]);
        }
        setLoading(false);
      }
    );

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRoles(session.user.id);
      } else {
        setUserRoles([]);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // First, try to get the current session to check if it's valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('Session error during logout:', sessionError);
        // If there's a session error, clear local state anyway
        clearAuthState();
        return;
      }

      if (!session) {
        // No active session, just clear local state
        clearAuthState();
        return;
      }

      // Try to sign out with the current session
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.warn('Logout error:', error);
        // Even if logout fails on server, clear local state
        clearAuthState();
      } else {
        // Successful logout, clear local state
        clearAuthState();
      }
    } catch (error) {
      console.error('Unexpected error during logout:', error);
      // Clear local state regardless of server response
      clearAuthState();
    }
  };

  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setUserRoles([]);
    // Clear any stored auth data from localStorage
    localStorage.removeItem('sb-rqzklkmajrgfchsyvjgb-auth-token');
  };

  const value = {
    user,
    session,
    loading,
    userRoles,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};