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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, userRoles } = useAuth();
  const { toast } = useToast();

  // Base navigation items for all users
  const baseNavigation = [
    { name: 'Events', href: '/events', icon: Calendar },
  ];

  // Role-based navigation items
  const getRoleBasedNavigation = () => {
    const roleNav = [];
    
    // Prefer a single Dashboard entry per user based on role priority
    // Priority: organizer/admin -> /dashboard (RoleDashboard renders Organizer), else volunteer -> /dashboard, else participant -> /dashboard
    if (user) {
      roleNav.push({ name: 'Dashboard', href: '/dashboard', icon: Users });
    } else {
      // Guest users should still see Dashboard (will route to protected page/sign-in flow)
      roleNav.push({ name: 'Dashboard', href: '/dashboard', icon: User });
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
    <nav className="fixed top-0 w-full z-50 bg-background/80 backdrop-blur-2xl border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-18">
          {/* Logo */}
          <Link to="/events" className="flex items-center space-x-2 sm:space-x-3 group">
            <div className="w-10 h-10 sm:w-11 sm:h-11 bg-gradient-to-br from-primary via-accent to-secondary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all group-hover:scale-110">
              <span className="text-white font-black text-lg sm:text-xl">V</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent">
                Vibranium
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold -mt-1">TECHFEST 5.0</span>
            </div>
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
                <span className="text-sm text-muted-foreground hidden md:inline">Hi, {(user.user_metadata?.first_name && user.user_metadata?.last_name) ? `${user.user_metadata.first_name}` : (user.email?.split('@')[0] || 'User')}</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="rounded-full overflow-hidden ring-1 ring-border/50 hover:ring-primary/40 transition focus:outline-none">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.user_metadata?.avatar_url || ''} alt="avatar" />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {((user.email || 'U').charAt(0) || 'U').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-background/95 backdrop-blur-md border-border/60">
                    <DropdownMenuLabel className="flex items-center gap-3 py-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.user_metadata?.avatar_url || ''} alt="avatar" />
                        <AvatarFallback className="bg-primary/20 text-primary">
                          {((user.email || 'U').charAt(0) || 'U').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="truncate text-sm">
                        {user.email?.split('@')[0] || 'Profile'}
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/account')} className="cursor-pointer">
                      <User className="w-4 h-4 mr-2" /> Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                      <LogOut className="w-4 h-4 mr-2" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                <>
                  <div className="flex items-center gap-3 px-2 text-sm text-muted-foreground">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.user_metadata?.avatar_url || ''} alt="avatar" />
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {((user.email || 'U').charAt(0) || 'U').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="truncate">Hi, {user.email?.split('@')[0] || 'User'}</div>
                  </div>
                  <Link to="/account" onClick={() => setIsOpen(false)}>
                    <Button variant="ghost" className="w-full justify-start h-12 text-base">
                      <User className="w-5 h-5 mr-3" />
                      Profile
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start h-12 text-base"
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                  >
                    <LogOut className="w-5 h-5 mr-3" />
                    Log out
                  </Button>
                </>
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
              {user && (
                <Link to="/account" onClick={() => setIsOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start h-12 text-base">
                    <User className="w-5 h-5 mr-3" />
                    Account
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;