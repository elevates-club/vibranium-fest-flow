import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, QrCode, CheckCircle, Clock, MapPin } from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import { format } from 'date-fns';
import QRScanner from '@/components/volunteer/QRScanner';

interface Assignment {
  id: string;
  task: string;
  zone?: string;
  status: string;
  assigned_at: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  event: {
    id: string;
    title: string;
    start_date: string;
    location: string;
  };
}

export default function VolunteerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('volunteer_assignments')
        .select(`
          *,
          event:events(id, title, start_date, location)
        `)
        .eq('volunteer_id', user?.id)
        .order('assigned_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast({
        title: "Error",
        description: "Failed to load assignments",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAssignmentStatus = async (id: string, status: string) => {
    try {
      const updates: any = { status };
      
      if (status === 'in-progress') {
        updates.started_at = new Date().toISOString();
      } else if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('volunteer_assignments')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Task marked as ${status}`,
      });
      
      fetchAssignments();
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: "Error",
        description: "Failed to update task status",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any }> = {
      'assigned': { variant: 'secondary', icon: Clock },
      'in-progress': { variant: 'default', icon: ClipboardList },
      'completed': { variant: 'outline', icon: CheckCircle },
    };

    const config = variants[status] || variants['assigned'];
    const Icon = config.icon;

    return (
      <span className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
        status === 'assigned' ? 'bg-secondary text-secondary-foreground' :
        status === 'in-progress' ? 'bg-primary text-primary-foreground' :
        'bg-muted text-muted-foreground'
      }`}>
        <Icon className="h-3 w-3" />
        {status.replace('-', ' ')}
      </span>
    );
  };

  const activeAssignments = assignments.filter(a => a.status !== 'completed' && a.status !== 'cancelled');
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Volunteer Dashboard</h1>
          <p className="text-muted-foreground">Manage your tasks and check-in participants</p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeAssignments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedAssignments.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assignments.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="tasks">My Tasks</TabsTrigger>
            <TabsTrigger value="checkin">QR Check-in</TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-4">
            {activeAssignments.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active tasks assigned yet</p>
                </CardContent>
              </Card>
            ) : (
              activeAssignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle>{assignment.task}</CardTitle>
                        <CardDescription>
                          {assignment.event.title} • {format(new Date(assignment.event.start_date), 'PPP')}
                        </CardDescription>
                      </div>
                      {getStatusBadge(assignment.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {assignment.zone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        <span>Zone: {assignment.zone}</span>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      {assignment.status === 'assigned' && (
                        <Button 
                          onClick={() => updateAssignmentStatus(assignment.id, 'in-progress')}
                          size="sm"
                        >
                          Start Task
                        </Button>
                      )}
                      {assignment.status === 'in-progress' && (
                        <Button 
                          onClick={() => updateAssignmentStatus(assignment.id, 'completed')}
                          size="sm"
                          variant="outline"
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>

                    {assignment.notes && (
                      <p className="text-sm text-muted-foreground border-l-2 border-primary pl-4">
                        {assignment.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))
            )}

            {completedAssignments.length > 0 && (
              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Completed Tasks</h3>
                <div className="space-y-4">
                  {completedAssignments.map((assignment) => (
                    <Card key={assignment.id} className="opacity-60">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base">{assignment.task}</CardTitle>
                            <CardDescription className="text-sm">
                              {assignment.event.title}
                            </CardDescription>
                          </div>
                          {getStatusBadge(assignment.status)}
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="checkin">
            <QRScanner onCheckInSuccess={fetchAssignments} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
