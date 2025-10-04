import { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Trophy, 
  Users, 
  Zap, 
  Medal,
  Crown,
  Star,
  Share2,
  TrendingUp
} from 'lucide-react';

const Leaderboard = () => {
  const [selectedCategory, setSelectedCategory] = useState('overall');
  const [topParticipants, setTopParticipants] = useState<any[]>([]);
  const [topDepartments, setTopDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      // Get users with their points from profiles
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id,
          first_name,
          last_name,
          department,
          points,
          year
        `)
        .order('points', { ascending: false })
        .limit(50);

      if (error) throw error;

      const participants = data?.map((profile, index) => ({
        rank: index + 1,
        name: `${profile.first_name} ${profile.last_name || ''}`.trim(),
        department: profile.department || 'Not specified',
        points: profile.points || 0,
        badges: 0, // Would need to calculate from achievements
        streak: 0, // Would need to calculate from activity
        events: 0, // Would need to calculate from registrations
        avatar: `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`.toUpperCase()
      })) || [];

      setTopParticipants(participants);

      // Calculate department stats
      const departmentStats = participants.reduce((acc: any, participant) => {
        const dept = participant.department;
        if (!acc[dept]) {
          acc[dept] = {
            name: dept,
            totalPoints: 0,
            participants: 0,
            events: 0
          };
        }
        acc[dept].totalPoints += participant.points;
        acc[dept].participants += 1;
        return acc;
      }, {});

      const departments = Object.values(departmentStats)
        .map((dept: any, index) => ({
          rank: index + 1,
          name: dept.name,
          totalPoints: dept.totalPoints,
          participants: dept.participants,
          avgPoints: Math.round(dept.totalPoints / dept.participants),
          events: 0 // Would need to calculate from events
        }))
        .sort((a: any, b: any) => b.totalPoints - a.totalPoints)
        .slice(0, 5);

      setTopDepartments(departments);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Trophy className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-muted-foreground font-bold">{rank}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              <span className="text-primary">Leaderboard</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See who's leading the charge in Vibranium TechFest 2024. Compete with fellow participants and departments!
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gradient-card border-border">
              <CardContent className="p-4 text-center">
                <Users className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">1,247</div>
                <div className="text-sm text-muted-foreground">Active Players</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border">
              <CardContent className="p-4 text-center">
                <Zap className="w-6 h-6 text-secondary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">386K</div>
                <div className="text-sm text-muted-foreground">Total Points</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border">
              <CardContent className="p-4 text-center">
                <Star className="w-6 h-6 text-accent mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">2,890</div>
                <div className="text-sm text-muted-foreground">Badges Earned</div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-card border-border">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold text-foreground">24hr</div>
                <div className="text-sm text-muted-foreground">Live Updates</div>
              </CardContent>
            </Card>
          </div>

          {/* Leaderboard Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-2">
              <TabsTrigger value="overall">Overall</TabsTrigger>
              <TabsTrigger value="departments">Departments</TabsTrigger>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="events">By Events</TabsTrigger>
            </TabsList>

            <TabsContent value="overall">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-2xl">Top Participants</CardTitle>
                  <Button variant="outline" size="sm">
                    <Share2 className="w-4 h-4 mr-2" />
                    Share
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topParticipants.map((participant) => (
                      <div key={participant.rank} className="flex items-center justify-between p-4 bg-gradient-subtle rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {getRankIcon(participant.rank)}
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {participant.avatar}
                            </div>
                            <div>
                              <div className="font-semibold text-foreground">{participant.name}</div>
                              <div className="text-sm text-muted-foreground">{participant.department}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-lg text-primary">{participant.points.toLocaleString()}</div>
                            <div className="text-muted-foreground">Points</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-secondary">{participant.badges}</div>
                            <div className="text-muted-foreground">Badges</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-accent">{participant.streak}</div>
                            <div className="text-muted-foreground">Streak</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-foreground">{participant.events}</div>
                            <div className="text-muted-foreground">Events</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="departments">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Department Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topDepartments.map((dept) => (
                      <div key={dept.rank} className="flex items-center justify-between p-4 bg-gradient-subtle rounded-lg border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            {getRankIcon(dept.rank)}
                          </div>
                          <div>
                            <div className="font-semibold text-foreground text-lg">{dept.name}</div>
                            <div className="text-sm text-muted-foreground">{dept.participants} participants</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-6 text-sm">
                          <div className="text-center">
                            <div className="font-bold text-lg text-primary">{dept.totalPoints.toLocaleString()}</div>
                            <div className="text-muted-foreground">Total Points</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-secondary">{dept.avgPoints}</div>
                            <div className="text-muted-foreground">Avg/Person</div>
                          </div>
                          <div className="text-center">
                            <div className="font-bold text-accent">{dept.events}</div>
                            <div className="text-muted-foreground">Events</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="daily">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Today's Champions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <div className="text-lg text-muted-foreground">Daily leaderboard updates at midnight</div>
                    <div className="text-sm text-muted-foreground mt-2">Check back tomorrow to see today's winners!</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="events">
              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">Event-wise Rankings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Medal className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <div className="text-lg text-muted-foreground">Event rankings coming soon</div>
                    <div className="text-sm text-muted-foreground mt-2">Track performance in individual competitions and workshops</div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Personal Stats Card */}
          <Card className="mt-8 bg-gradient-card border-border">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Star className="w-5 h-5 mr-2 text-primary" />
                Your Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">1,245</div>
                  <div className="text-sm text-muted-foreground">Your Points</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-secondary">#47</div>
                  <div className="text-sm text-muted-foreground">Your Rank</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">6</div>
                  <div className="text-sm text-muted-foreground">Your Badges</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">3</div>
                  <div className="text-sm text-muted-foreground">Day Streak</div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-border">
                <Button className="w-full">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share Your Progress
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;