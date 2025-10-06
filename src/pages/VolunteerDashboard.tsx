import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ClipboardList, QrCode, CheckCircle, Clock, MapPin, Users } from 'lucide-react';
import Navigation from '@/components/layout/Navigation';
import { format } from 'date-fns';
import QRScanner from '@/components/ui/QRScanner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Assignment {
  id: string;
  task: string;
  status: 'assigned' | 'in-progress' | 'completed';
  assigned_at: string;
  zone?: string;
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
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [eventDetails, setEventDetails] = useState<any | null>(null);
  const [eventCoordinators, setEventCoordinators] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchAssignments();
    }
  }, [user]);

  const fetchAssignments = async () => {
    try {
      // Read assignments from event_volunteers created by staff/coordinators
      const { data, error } = await (supabase as any)
        .from('event_volunteers')
        .select('id, created_at, events:events(id, title, start_date, location)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const mapped: Assignment[] = (data || []).map((row: any) => ({
        id: String(row.id),
        task: `Assist: ${row.events?.title || 'Event'}`,
        status: 'assigned',
        assigned_at: row.created_at,
        event: {
          id: row.events?.id,
          title: row.events?.title,
          start_date: row.events?.start_date,
          location: row.events?.location,
        },
      }));
      setAssignments(mapped);
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
  const openAssignmentDetails = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setDetailsOpen(true);
    try {
      // Load fresh event details
      const { data: ev } = await (supabase as any)
        .from('events')
        .select('*')
        .eq('id', assignment.event.id)
        .maybeSingle();
      setEventDetails(ev || assignment.event);

      // Load coordinators for this event
      const { data: ec } = await (supabase as any)
        .from('event_coordinators')
        .select('user_id')
        .eq('event_id', assignment.event.id);
      const ids = (ec || []).map((r: any) => r.user_id);
      if (ids.length > 0) {
        const { data: profs } = await (supabase as any)
          .from('profiles')
          .select('user_id, first_name, last_name, email, phone')
          .in('user_id', ids);
        setEventCoordinators(profs || []);
      } else {
        setEventCoordinators([]);
      }
    } catch (e) {
      console.error('Failed loading assignment details', e);
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

  const activeAssignments = assignments.filter(a => a.status !== 'completed');
  const completedAssignments = assignments.filter(a => a.status === 'completed');

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <Navigation />
      
      <div className="pt-16 sm:pt-20 pb-12 sm:pb-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Welcome + role pill */}
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Welcome back, <span className="text-primary">{user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Volunteer'}</span>!
              </h1>
              <span className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-3 py-1 bg-muted rounded-full w-fit">Volunteer</span>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">Volunteer Dashboard – Complete your assigned tasks</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
              Volunteer Tasks
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Button variant="hero" className="h-16 sm:h-20" onClick={() => setActiveTab('tasks')}>
                <ClipboardList className="w-5 h-5 mr-2" />
                View Assignments
              </Button>
              <Button variant="outline" className="h-16 sm:h-20" onClick={() => setActiveTab('checkin')}>
                <QrCode className="w-5 h-5 mr-2" />
                QR Check-in
              </Button>
            </div>
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
                <Card key={assignment.id} onClick={() => openAssignmentDetails(assignment)} className="cursor-pointer">
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
                    
                    {/* Completion workflow is not enabled for event_volunteers mapping */}

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
            <QRScanner onScanSuccess={fetchAssignments} />
          </TabsContent>
        </Tabs>
        
        {/* Assignment Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Assignment Details</DialogTitle>
              <DialogDescription>
                {selectedAssignment?.event.title || 'Event'} • {selectedAssignment ? format(new Date(selectedAssignment.assigned_at), 'PPP p') : ''}
              </DialogDescription>
            </DialogHeader>

            {selectedAssignment && (
              <div className="space-y-4">
                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="font-medium">Event</div>
                  <div className="text-sm text-muted-foreground">
                    <div>{eventDetails?.title || selectedAssignment.event.title}</div>
                    <div>{eventDetails?.location || selectedAssignment.event.location}</div>
                    <div>{format(new Date(eventDetails?.start_date || selectedAssignment.event.start_date), 'PPP p')}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="font-medium">Your Task</div>
                  <div className="text-sm text-muted-foreground">
                    <div>{selectedAssignment.task}</div>
                    <div>Status: {selectedAssignment.status.replace('-', ' ')}</div>
                    <div>Assigned: {format(new Date(selectedAssignment.assigned_at), 'PPP p')}</div>
                  </div>
                </div>

                <div className="p-3 rounded-lg border bg-muted/30">
                  <div className="font-medium mb-1">Event Coordinators</div>
                  {eventCoordinators.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No coordinators listed</div>
                  ) : (
                    <div className="space-y-2">
                      {eventCoordinators.map((c) => (
                        <div key={c.user_id} className="flex items-center justify-between text-sm">
                          <span className="truncate">{`${c.first_name || ''} ${c.last_name || ''}`.trim() || c.phone || 'Coordinator'}</span>
                          <span className="text-muted-foreground ml-2 truncate">{c.phone || '—'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </div>
  );
}
