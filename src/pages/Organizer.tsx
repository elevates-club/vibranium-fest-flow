import { useState, useEffect, useCallback } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import VolunteerManagement from '@/components/organizer/VolunteerManagement';
import EventCreation from '@/components/organizer/EventCreation';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { useEvents } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Users, 
  Calendar,
  QrCode,
  Settings,
  BarChart3,
  MessageSquare,
  UserCheck,
  Award,
  Palette,
  Download,
  Eye,
  Edit,
  Plus,
  Mail,
  Phone,
  GraduationCap,
  Clock,
  CheckCircle
} from 'lucide-react';

const Organizer = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegisteredMembersDialogOpen, setIsRegisteredMembersDialogOpen] = useState(false);
  const [selectedEventForMembers, setSelectedEventForMembers] = useState<any>(null);
  const [registeredMembers, setRegisteredMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const { events } = useEvents();
  const { toast } = useToast();

  const fetchRecentEvents = useCallback(async () => {
    try {
      // Get events with registration counts
      const eventsWithStats = await Promise.all(
        events.map(async (event) => {
          const { data: registrations } = await supabase
            .from('event_registrations')
            .select('*')
            .eq('event_id', event.id);

          const { data: checkins } = await supabase
            .from('event_registrations')
            .select('*')
            .eq('event_id', event.id)
            .eq('checked_in', true);

          return {
            id: event.id,
            title: event.title,
            registrations: registrations?.length || 0,
            checkins: checkins?.length || 0,
            status: new Date(event.end_date) < new Date() ? 'completed' : 
                   new Date(event.start_date) <= new Date() ? 'ongoing' : 'upcoming',
            qrCustomized: false // Would need to track this in database
          };
        })
      );

      setRecentEvents(eventsWithStats.slice(0, 5)); // Show only recent 5
    } catch (error) {
      console.error('Error fetching recent events:', error);
    } finally {
      setLoading(false);
    }
  }, [events]);

  useEffect(() => {
    fetchRecentEvents();
  }, [fetchRecentEvents]);

  const fetchRegisteredMembers = async (eventId: string) => {
    setMembersLoading(true);
    try {
      // First, get the registrations
      const { data: registrations, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('registration_date', { ascending: false });

      if (registrationsError) {
        console.error('Error fetching registrations:', registrationsError);
        toast({
          title: "Error",
          description: "Failed to fetch registrations.",
          variant: "destructive"
        });
        return;
      }

      if (!registrations || registrations.length === 0) {
        setRegisteredMembers([]);
        return;
      }

      // Then, get the user profiles for all registered users
      const userIds = registrations.map(reg => reg.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone, department, year, college')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          title: "Error",
          description: "Failed to fetch user profiles.",
          variant: "destructive"
        });
        return;
      }

      // Combine registrations with profile data
      const membersWithProfiles = registrations.map(registration => {
        const profile = profiles?.find(p => p.user_id === registration.user_id);
        return {
          ...registration,
          profiles: profile || null
        };
      });

      setRegisteredMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error fetching registered members:', error);
      toast({
        title: "Error",
        description: "Failed to fetch registered members.",
        variant: "destructive"
      });
    } finally {
      setMembersLoading(false);
    }
  };

  const handleViewRegisteredMembers = (event: any) => {
    setSelectedEventForMembers(event);
    setIsRegisteredMembersDialogOpen(true);
    fetchRegisteredMembers(event.id);
  };

  const departments = [
    { name: "Computer Science", events: 8, participants: 234, coordinator: "Dr. Smith" },
    { name: "Electronics", events: 6, participants: 187, coordinator: "Prof. Johnson" },
    { name: "Mechanical", events: 5, participants: 156, coordinator: "Dr. Brown" },
    { name: "Civil", events: 4, participants: 123, coordinator: "Prof. Davis" }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              Organizer <span className="text-primary">Dashboard</span>
            </h1>
            <p className="text-muted-foreground">
              Manage events, volunteers, and analytics for Vibranium TechFest 2024
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5 gap-2">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="events">Events</TabsTrigger>
              <TabsTrigger value="qr-management">QR Codes</TabsTrigger>
              <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <div className="space-y-6">
                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="p-4 text-center">
                      <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold text-foreground">25</div>
                      <div className="text-sm text-muted-foreground">Total Events</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="p-4 text-center">
                      <Users className="w-6 h-6 text-secondary mx-auto mb-2" />
                      <div className="text-2xl font-bold text-foreground">1,247</div>
                      <div className="text-sm text-muted-foreground">Registrations</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="p-4 text-center">
                      <UserCheck className="w-6 h-6 text-accent mx-auto mb-2" />
                      <div className="text-2xl font-bold text-foreground">89%</div>
                      <div className="text-sm text-muted-foreground">Check-in Rate</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="p-4 text-center">
                      <BarChart3 className="w-6 h-6 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold text-foreground">4.8</div>
                      <div className="text-sm text-muted-foreground">Avg Rating</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Events */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {recentEvents.map((event) => (
                        <div key={event.id} className="flex items-center justify-between p-4 bg-gradient-subtle rounded-lg border border-border">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <QrCode className={`w-5 h-5 ${event.qrCustomized ? 'text-primary' : 'text-muted-foreground'}`} />
                              <div>
                                <div className="font-semibold text-foreground">{event.title}</div>
                                <div className="text-sm text-muted-foreground">
                                  {event.registrations} registrations • {event.checkins} check-ins
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <Badge variant={event.status === 'ongoing' ? 'default' : event.status === 'upcoming' ? 'secondary' : 'outline'}>
                              {event.status}
                            </Badge>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewRegisteredMembers(event)}
                              title="View Registered Members"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Department Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Department Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {departments.map((dept) => (
                        <div key={dept.name} className="flex items-center justify-between p-4 bg-gradient-subtle rounded-lg border border-border">
                          <div>
                            <div className="font-semibold text-foreground">{dept.name}</div>
                            <div className="text-sm text-muted-foreground">Coordinator: {dept.coordinator}</div>
                          </div>
                          <div className="flex items-center space-x-6 text-sm">
                            <div className="text-center">
                              <div className="font-bold text-primary">{dept.events}</div>
                              <div className="text-muted-foreground">Events</div>
                            </div>
                            <div className="text-center">
                              <div className="font-bold text-secondary">{dept.participants}</div>
                              <div className="text-muted-foreground">Participants</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="events">
              <EventCreation />
            </TabsContent>

            <TabsContent value="qr-management">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <QrCode className="w-5 h-5 mr-2" />
                    QR Code Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="grid md:grid-cols-3 gap-6">
                      <Card className="bg-gradient-subtle border-border">
                        <CardContent className="p-6 text-center">
                          <Palette className="w-8 h-8 text-primary mx-auto mb-3" />
                          <h3 className="font-semibold mb-2">Custom Design</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Design unique QR codes for each event with custom colors and logos
                          </p>
                          <Button variant="outline" size="sm">
                            <Edit className="w-4 h-4 mr-2" />
                            Customize
                          </Button>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-subtle border-border">
                        <CardContent className="p-6 text-center">
                          <Download className="w-8 h-8 text-secondary mx-auto mb-3" />
                          <h3 className="font-semibold mb-2">Bulk Generate</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Generate QR codes for all participants at once
                          </p>
                          <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-2" />
                            Generate
                          </Button>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-subtle border-border">
                        <CardContent className="p-6 text-center">
                          <Settings className="w-8 h-8 text-accent mx-auto mb-3" />
                          <h3 className="font-semibold mb-2">Security Settings</h3>
                          <p className="text-sm text-muted-foreground mb-4">
                            Configure dynamic QR codes and anti-fraud measures
                          </p>
                          <Button variant="outline" size="sm">
                            <Settings className="w-4 h-4 mr-2" />
                            Configure
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="text-center py-8 text-muted-foreground">
                      QR code customization tools will be integrated here
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="volunteers">
              <VolunteerManagement />
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 mr-2" />
                    Analytics & Reports
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    Detailed analytics dashboard will be available here
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Registered Members Dialog */}
      <Dialog open={isRegisteredMembersDialogOpen} onOpenChange={setIsRegisteredMembersDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Registered Members - {selectedEventForMembers?.title}
            </DialogTitle>
            <DialogDescription>
              View all registered participants for this event
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh]">
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-muted-foreground">Loading members...</span>
              </div>
            ) : registeredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No registered members found for this event.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Total registered: {registeredMembers.length} members
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {registeredMembers.filter(member => member.checked_in).length} checked in
                    </span>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>College</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registeredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.profiles?.first_name && member.profiles?.last_name 
                            ? `${member.profiles.first_name} ${member.profiles.last_name}`.trim()
                            : member.profiles?.first_name || member.profiles?.last_name || 'Profile Incomplete'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {member.profiles?.email || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {member.profiles?.phone || 'Not provided'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            {member.profiles?.department || 'Not provided'}
                          </div>
                        </TableCell>
                        <TableCell>{member.profiles?.year || 'Not provided'}</TableCell>
                        <TableCell>{member.profiles?.college || 'Not provided'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={member.checked_in ? 'default' : member.status === 'registered' ? 'secondary' : 'outline'}
                          >
                            {member.checked_in ? 'Checked In' : member.status || 'Registered'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {new Date(member.registration_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Organizer;