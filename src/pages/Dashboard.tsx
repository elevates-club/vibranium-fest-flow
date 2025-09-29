import { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { 
  User,
  Trophy,
  Calendar,
  QrCode,
  Star,
  Gift,
  Clock,
  MapPin,
  TrendingUp,
  Award,
  Zap
} from 'lucide-react';

const Dashboard = () => {
  const { user } = useAuth();
  const { events, registrations, getUserEvents } = useEvents();
  const [profile, setProfile] = useState<any>(null);
  const [userPoints, setUserPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchUserPoints();
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

  const fetchUserPoints = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_points')
        .select('points')
        .eq('user_id', user.id);
      
      if (error) throw error;
      const totalPoints = data?.reduce((sum, record) => sum + record.points, 0) || 0;
      setUserPoints(totalPoints);
    } catch (error) {
      console.error('Error fetching points:', error);
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
    points: userPoints,
    level: userPoints >= 1500 ? "Tech Master" : userPoints >= 1000 ? "Tech Expert" : userPoints >= 500 ? "Tech Explorer" : "Tech Novice",
    eventsAttended: completedEvents.length,
    badges: ['Early Bird', 'Workshop Warrior'], // These would be calculated based on actual achievements
    rank: Math.floor(Math.random() * 100) + 1, // This would be calculated from actual leaderboard
    totalParticipants: 500
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
    const endDate = new Date(event.end_date);
    const now = new Date();
    
    let status = 'registered';
    if (endDate < now) {
      status = 'completed';
    } else if (startDate <= now && endDate >= now) {
      status = 'ongoing';
    } else {
      status = 'upcoming';
    }

    return {
      title: event.title,
      date: startDate.toLocaleDateString(),
      time: startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status,
      location: event.location
    };
  });

  const recentActivity = [
    { type: 'points', message: 'Earned 50 points for attending Cybersecurity Talk', time: '2 hours ago' },
    { type: 'badge', message: 'Unlocked "Workshop Warrior" badge', time: '1 day ago' },
    { type: 'registration', message: 'Registered for AI/ML Workshop', time: '2 days ago' },
    { type: 'achievement', message: 'Reached Level: Tech Explorer', time: '3 days ago' }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'points': return <Star className="w-4 h-4 text-primary" />;
      case 'badge': return <Award className="w-4 h-4 text-secondary" />;
      case 'registration': return <Calendar className="w-4 h-4 text-accent" />;
      case 'achievement': return <Trophy className="w-4 h-4 text-primary" />;
      default: return <Zap className="w-4 h-4 text-foreground" />;
    }
  };

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
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back, <span className="text-primary">{userData.name}</span>!
            </h1>
            <p className="text-muted-foreground">
              Here's your Techfest journey so far. Keep participating to climb the leaderboard!
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-card p-6 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <Star className="w-8 h-8 text-primary" />
                <Badge variant="outline">{userData.level}</Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">{userData.points}</div>
              <div className="text-sm text-muted-foreground">Total Points</div>
            </div>

            <div className="bg-gradient-card p-6 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <Calendar className="w-8 h-8 text-secondary" />
                <Badge variant="outline">Active</Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">{userData.eventsAttended}</div>
              <div className="text-sm text-muted-foreground">Events Attended</div>
            </div>

            <div className="bg-gradient-card p-6 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <Trophy className="w-8 h-8 text-accent" />
                <Badge variant="outline">Rising</Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">#{userData.rank}</div>
              <div className="text-sm text-muted-foreground">Leaderboard Rank</div>
            </div>

            <div className="bg-gradient-card p-6 rounded-xl border border-border">
              <div className="flex items-center justify-between mb-4">
                <Award className="w-8 h-8 text-primary" />
                <Badge variant="outline">Collector</Badge>
              </div>
              <div className="text-2xl font-bold text-foreground">{userData.badges.length}</div>
              <div className="text-sm text-muted-foreground">Badges Earned</div>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            
            {/* My Events */}
            <div className="lg:col-span-2">
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
                      <Badge 
                        variant={event.status === 'completed' ? 'secondary' : 'outline'}
                        className={getStatusColor(event.status)}
                      >
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
                
                <Button variant="hero" className="w-full mt-4">
                  <QrCode className="w-4 h-4 mr-2" />
                  View My QR Pass
                </Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              
              {/* Progress Card */}
              <div className="bg-gradient-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-primary" />
                  Progress
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Next Level</span>
                      <span>{userData.points}/1500 XP</span>
                    </div>
                    <Progress value={(userData.points / 1500) * 100} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Leaderboard</span>
                      <span>Top {Math.round((userData.rank / userData.totalParticipants) * 100)}%</span>
                    </div>
                    <Progress value={100 - (userData.rank / userData.totalParticipants) * 100} className="h-2" />
                  </div>
                </div>
              </div>

              {/* Badges */}
              <div className="bg-gradient-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Award className="w-5 h-5 mr-2 text-primary" />
                  Latest Badges
                </h3>
                
                <div className="grid grid-cols-2 gap-3">
                  {userData.badges.map((badge, index) => (
                    <div key={index} className="text-center p-3 bg-background/50 rounded-lg border border-border/50">
                      <div className="w-8 h-8 bg-gradient-primary rounded-full mx-auto mb-2 flex items-center justify-center">
                        <Star className="w-4 h-4 text-primary-foreground" />
                      </div>
                      <div className="text-xs font-medium">{badge}</div>
                    </div>
                  ))}
                </div>
                
                <Button variant="outline" size="sm" className="w-full mt-4">
                  View All Badges
                </Button>
              </div>

              {/* Available Rewards */}
              <div className="bg-gradient-card p-6 rounded-xl border border-border">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Gift className="w-5 h-5 mr-2 text-primary" />
                  Available Rewards
                </h3>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                    <div>
                      <div className="font-medium text-sm">Food Coupon</div>
                      <div className="text-xs text-muted-foreground">500 points</div>
                    </div>
                    <Button size="sm" variant="outline">Claim</Button>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                    <div>
                      <div className="font-medium text-sm">Merch Discount</div>
                      <div className="text-xs text-muted-foreground">200 points</div>
                    </div>
                    <Button size="sm" variant="outline">Claim</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="mt-8 bg-gradient-card p-6 rounded-xl border border-border">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-primary" />
              Recent Activity
            </h2>
            
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-background/50 rounded-lg border border-border/50">
                  <div className="mt-1">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{activity.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;