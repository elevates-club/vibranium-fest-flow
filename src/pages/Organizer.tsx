import { useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
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
  Plus
} from 'lucide-react';

const Organizer = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const recentEvents = [
    {
      id: 1,
      title: "AI/ML Workshop",
      registrations: 45,
      checkins: 42,
      status: "ongoing",
      qrCustomized: true
    },
    {
      id: 2,
      title: "Hackathon Finals",
      registrations: 120,
      checkins: 115,
      status: "upcoming",
      qrCustomized: false
    },
    {
      id: 3,
      title: "Tech Talk: Web3",
      registrations: 80,
      checkins: 78,
      status: "completed",
      qrCustomized: true
    }
  ];

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
                            <Button variant="outline" size="sm">
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Event Management</CardTitle>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Event
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex space-x-4">
                      <Input placeholder="Search events..." className="flex-1" />
                      <Button variant="outline">Filter</Button>
                    </div>
                    <div className="text-center py-12 text-muted-foreground">
                      Event management interface will be available here
                    </div>
                  </div>
                </CardContent>
              </Card>
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
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Volunteer Management</CardTitle>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Volunteer
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    Volunteer management interface coming soon
                  </div>
                </CardContent>
              </Card>
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
    </div>
  );
};

export default Organizer;