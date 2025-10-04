import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Users, Trash2 } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';

interface Volunteer {
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Assignment {
  id: string;
  task: string;
  zone?: string;
  status: string;
  volunteer: {
    first_name: string;
    last_name: string;
  };
  event: {
    title: string;
  };
}

export default function VolunteerManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { events } = useEvents();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    volunteer_id: '',
    event_id: '',
    task: '',
    zone: '',
    notes: ''
  });

  useEffect(() => {
    fetchVolunteers();
    fetchAssignments();
  }, []);

  const fetchVolunteers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select(`
          user_id,
          profiles!inner(
            user_id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('role', 'volunteer');

      if (error) throw error;

      const volunteersList = data.map((item: any) => ({
        user_id: item.user_id,
        first_name: item.profiles.first_name,
        last_name: item.profiles.last_name,
        email: item.profiles.email
      }));

      setVolunteers(volunteersList);
    } catch (error) {
      console.error('Error fetching volunteers:', error);
    }
  };

  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('volunteer_assignments')
        .select('*')
        .order('assigned_at', { ascending: false });

      if (error) throw error;

      // Fetch related data separately
      const enrichedAssignments = await Promise.all(
        (data || []).map(async (assignment) => {
          const [volunteerRes, eventRes] = await Promise.all([
            supabase.from('profiles').select('first_name, last_name').eq('user_id', assignment.volunteer_id).single(),
            supabase.from('events').select('title').eq('id', assignment.event_id).single()
          ]);

          return {
            ...assignment,
            volunteer: volunteerRes.data || { first_name: '', last_name: '' },
            event: eventRes.data || { title: '' }
          };
        })
      );

      setAssignments(enrichedAssignments as Assignment[]);
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  const handleAssignVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.volunteer_id || !formData.event_id || !formData.task) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('volunteer_assignments')
        .insert({
          volunteer_id: formData.volunteer_id,
          event_id: formData.event_id,
          task: formData.task,
          zone: formData.zone || null,
          notes: formData.notes || null,
          assigned_by: user?.id,
          status: 'assigned'
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Volunteer assigned successfully",
      });

      setIsDialogOpen(false);
      setFormData({
        volunteer_id: '',
        event_id: '',
        task: '',
        zone: '',
        notes: ''
      });
      fetchAssignments();
    } catch (error: any) {
      console.error('Error assigning volunteer:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to assign volunteer",
        variant: "destructive"
      });
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('volunteer_assignments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Assignment deleted successfully",
      });
      
      fetchAssignments();
    } catch (error: any) {
      console.error('Error deleting assignment:', error);
      toast({
        title: "Error",
        description: "Failed to delete assignment",
        variant: "destructive"
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'assigned': 'secondary',
      'in-progress': 'default',
      'completed': 'outline',
      'cancelled': 'destructive'
    };

    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Volunteer Management</h2>
          <p className="text-muted-foreground">Assign and manage volunteer tasks</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Assign Volunteer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign Volunteer</DialogTitle>
              <DialogDescription>
                Assign a volunteer to an event task
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAssignVolunteer} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="volunteer">Volunteer *</Label>
                <Select 
                  value={formData.volunteer_id} 
                  onValueChange={(value) => setFormData({...formData, volunteer_id: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select volunteer" />
                  </SelectTrigger>
                  <SelectContent>
                    {volunteers.map((vol) => (
                      <SelectItem key={vol.user_id} value={vol.user_id}>
                        {vol.first_name} {vol.last_name} ({vol.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="event">Event *</Label>
                <Select 
                  value={formData.event_id} 
                  onValueChange={(value) => setFormData({...formData, event_id: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="task">Task *</Label>
                <Select 
                  value={formData.task} 
                  onValueChange={(value) => setFormData({...formData, task: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select task" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Check-in Management">Check-in Management</SelectItem>
                    <SelectItem value="Zone Monitoring">Zone Monitoring</SelectItem>
                    <SelectItem value="Participant Guidance">Participant Guidance</SelectItem>
                    <SelectItem value="Registration Desk">Registration Desk</SelectItem>
                    <SelectItem value="Technical Support">Technical Support</SelectItem>
                    <SelectItem value="Event Setup">Event Setup</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone">Zone (Optional)</Label>
                <Input
                  id="zone"
                  value={formData.zone}
                  onChange={(e) => setFormData({...formData, zone: e.target.value})}
                  placeholder="e.g., Main Hall, Lab A"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Additional instructions..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full">Assign Volunteer</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Volunteers List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registered Volunteers ({volunteers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {volunteers.map((vol) => (
              <div 
                key={vol.user_id} 
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div>
                  <p className="font-medium">{vol.first_name} {vol.last_name}</p>
                  <p className="text-sm text-muted-foreground">{vol.email}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Assignments List */}
      <Card>
        <CardHeader>
          <CardTitle>Current Assignments ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {assignments.map((assignment) => (
              <div 
                key={assignment.id} 
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{assignment.task}</p>
                    {getStatusBadge(assignment.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {assignment.volunteer.first_name} {assignment.volunteer.last_name} • {assignment.event.title}
                  </p>
                  {assignment.zone && (
                    <p className="text-xs text-muted-foreground">Zone: {assignment.zone}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAssignment(assignment.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
