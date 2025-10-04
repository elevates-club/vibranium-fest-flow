import { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { 
  User,
  Calendar,
  QrCode,
  Clock,
  MapPin,
  Users,
  BarChart3,
  ClipboardList
} from 'lucide-react';

const Dashboard = () => {
  const { user, userRoles } = useAuth();
  const { events, registrations, getUserEvents } = useEvents();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const userEvents = getUserEvents();
  const upcomingEvents = userEvents.filter(event => new Date(event.start_date) > new Date());
  const completedEvents = userEvents.filter(event => new Date(event.end_date) < new Date());

  const userData = {
    name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : user?.email?.split('@')[0] || 'User',
    email: user?.email || '',
    department: profile?.department || 'Not specified',
    year: profile?.year ? `${profile.year}${profile.year === 1 ? 'st' : profile.year === 2 ? 'nd' : profile.year === 3 ? 'rd' : 'th'} Year` : 'Not specified',
    eventsAttended: completedEvents.length,
    roles: userRoles,
    primaryRole: userRoles.includes('admin') ? 'Admin' : 
                 userRoles.includes('organizer') ? 'Organizer' : 
                 userRoles.includes('volunteer') ? 'Volunteer' : 
                 userRoles.includes('coordinator') ? 'Coordinator' : 
                 userRoles.includes('staff') ? 'Staff' : 'Participant'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-20 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  const myEvents = userEvents.slice(0, 3).map(event => {
    const startDate = new Date(event.start_date);
    const endDate = event.end_date ? new Date(event.end_date) : null;
    const now = new Date();
    
    let status = 'registered';
    if (endDate) {
      if (endDate < now) {
        status = 'completed';
      } else if (startDate <= now && endDate >= now) {
        status = 'ongoing';
      } else {
        status = 'upcoming';
      }
    } else {
      // If no end date, only check if event has started
      if (startDate <= now) {
        status = 'ongoing';
      } else {
        status = 'upcoming';
      }
    }

    // Format time based on whether end_date exists
    const timeString = endDate 
      ? `${startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })} - ${endDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone })}`
      : startDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone });

    return {
      title: event.title,
      date: startDate.toLocaleDateString(),
      time: timeString,
      status,
      location: event.location
    };
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'upcoming': return 'text-accent';
      case 'registered': return 'text-secondary';
      case 'completed': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Welcome Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-3xl md:text-4xl font-bold">
                Welcome back, <span className="text-primary">{userData.name}</span>!
              </h1>
              <span className="text-sm text-muted-foreground px-3 py-1">
                {userData.primaryRole}
              </span>
            </div>
            <p className="text-muted-foreground">
              {userData.primaryRole === 'Admin' ? 'Admin Dashboard - Manage the entire techfest platform' :
               userData.primaryRole === 'Organizer' ? 'Organizer Dashboard - Create and manage events' :
               userData.primaryRole === 'Volunteer' ? 'Volunteer Dashboard - Complete your assigned tasks' :
               userData.primaryRole === 'Coordinator' ? 'Coordinator Dashboard - Coordinate event logistics' :
               userData.primaryRole === 'Staff' ? 'Staff Dashboard - Support techfest operations' :
               'Here\'s your Techfest journey so far. Keep participating to climb the leaderboard!'}
            </p>
            {userData.roles.length > 1 && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground">
                  Additional roles: {userData.roles.filter(role => role !== userData.primaryRole.toLowerCase()).join(', ')}
                </p>
              </div>
            )}
          </div>

          {/* Role-specific Quick Actions */}
          {(userData.primaryRole === 'Organizer' || userData.primaryRole === 'Admin') && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2 text-primary" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/organizer">
                  <Button variant="hero" className="w-full h-20 flex flex-col items-center justify-center">
                    <Calendar className="w-6 h-6 mb-2" />
                    <span className="text-sm">Manage Events</span>
                  </Button>
                </Link>
                <Link to="/organizer">
                  <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                    <Users className="w-6 h-6 mb-2" />
                    <span className="text-sm">Manage Volunteers</span>
                  </Button>
                </Link>
                <Link to="/events">
                  <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                    <BarChart3 className="w-6 h-6 mb-2" />
                    <span className="text-sm">View Analytics</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {(userData.primaryRole === 'Volunteer' || userData.primaryRole === 'Admin') && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-primary" />
                Volunteer Tasks
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link to="/volunteer">
                  <Button variant="hero" className="w-full h-20 flex flex-col items-center justify-center">
                    <ClipboardList className="w-6 h-6 mb-2" />
                    <span className="text-sm">View Assignments</span>
                  </Button>
                </Link>
                <Link to="/volunteer">
                  <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                    <QrCode className="w-6 h-6 mb-2" />
                    <span className="text-sm">QR Check-in</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-card p-6 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-8 h-8 text-secondary" />
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{userData.eventsAttended}</div>
              <div className="text-sm text-muted-foreground">Events Attended</div>
            </div>

            <div className="bg-gradient-card p-6 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <User className="w-8 h-8 text-primary" />
                <span className="text-sm text-muted-foreground">Profile</span>
              </div>
              <div className="text-2xl font-bold text-foreground">{userData.department}</div>
              <div className="text-sm text-muted-foreground">Department</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-1 gap-8">
            
            {/* My Events */}
            <div>
              <div className="bg-gradient-card p-6 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-primary" />
                    My Events
                  </h2>
                  <Link to="/events">
                    <Button variant="outline" size="sm">View All</Button>
                  </Link>
                </div>
                
                <div className="space-y-4">
                  {myEvents.map((event, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-background/50 rounded-lg border border-border/50">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{event.title}</h3>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{event.date} at {event.time}</span>
                          <MapPin className="w-4 h-4 ml-3 mr-1" />
                          <span>{event.location}</span>
                        </div>
                      </div>
                      <span 
                        className={`text-sm px-2 py-1 rounded ${
                          event.status === 'completed' ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </div>
                  ))}
                </div>
                
                <Button variant="hero" className="w-full mt-4">
                  <QrCode className="w-4 h-4 mr-2" />
                  View My QR Pass
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;