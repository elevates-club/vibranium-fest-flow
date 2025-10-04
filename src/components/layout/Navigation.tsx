import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { 
  Menu, 
  X, 
  Calendar, 
  Users, 
  User,
  LogIn,
  UserPlus,
  LogOut 
} from 'lucide-react';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, userRoles } = useAuth();
  const { toast } = useToast();

  // Base navigation items for all users
  const baseNavigation = [
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Dashboard', href: '/dashboard', icon: User },
  ];

  // Role-based navigation items
  const getRoleBasedNavigation = () => {
    const roleNav = [];
    
    // Only show Organizer link if user has organizer or admin role
    if (userRoles.includes('organizer') || userRoles.includes('admin')) {
      roleNav.push({ name: 'Organizer', href: '/organizer', icon: Users });
    }
    
    // Only show Volunteer link if user has volunteer or admin role
    if (userRoles.includes('volunteer') || userRoles.includes('admin')) {
      roleNav.push({ name: 'Volunteer', href: '/volunteer', icon: Users });
    }
    
    return roleNav;
  };

  // Combine base navigation with role-based navigation
  const navigation = [...baseNavigation, ...getRoleBasedNavigation()];

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    try {
      await signOut();
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
      navigate('/events');
    } catch (error) {
      toast({
        title: "Logout completed",
        description: "You have been logged out locally.",
        variant: "default",
      });
      navigate('/events');
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-14 sm:h-16">
          {/* Logo */}
          <Link to="/events" className="flex items-center space-x-1 sm:space-x-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm sm:text-lg">V</span>
            </div>
            <span className="text-lg sm:text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Vibranium
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-300 ${
                    isActive(item.href)
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3 lg:space-x-4">
            {user ? (
              <>
                <span className="text-xs lg:text-sm text-muted-foreground hidden lg:inline">
                  Welcome back!
                </span>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-1 lg:mr-2" />
                  <span className="hidden lg:inline">Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm">
                    <LogIn className="w-4 h-4 mr-1 lg:mr-2" />
                    <span className="hidden lg:inline">Login</span>
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="hero" size="sm">
                    <UserPlus className="w-4 h-4 mr-1 lg:mr-2" />
                    <span className="hidden lg:inline">Register</span>
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-3 space-y-1 border-t border-border bg-background/95 backdrop-blur-md">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg mx-2 transition-all duration-300 ${
                    isActive(item.href)
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}
            <div className="pt-3 px-2 space-y-2 border-t border-border mt-3">
              {user ? (
                <Button 
                  variant="ghost" 
                  className="w-full justify-start h-12 text-base"
                  onClick={() => {
                    handleLogout();
                    setIsOpen(false);
                  }}
                >
                  <LogOut className="w-5 h-5 mr-3" />
                  Logout
                </Button>
              ) : (
                <>
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start h-12 text-base">
                      <LogIn className="w-5 h-5 mr-3" />
                      Login
                    </Button>
                  </Link>
                  <Link to="/auth" onClick={() => setIsOpen(false)}>
                    <Button variant="hero" className="w-full justify-start h-12 text-base">
                      <UserPlus className="w-5 h-5 mr-3" />
                      Register
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;