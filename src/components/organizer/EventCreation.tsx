import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar, MapPin, Users, DollarSign, Star, Edit, Trash2, Lock, Unlock, Eye } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';

export default function EventCreation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { events, refetchEvents } = useEvents();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventRegistrations, setEventRegistrations] = useState<{[key: string]: number}>({});
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    start_date: '',
    end_date: '',
    max_attendees: 50,
    registration_fee: 0,
    points_reward: 0,
    department: '',
    registration_closed: false
  });

  // Fetch registration counts for all events
  useEffect(() => {
    fetchRegistrationCounts();
  }, [events]);

  const fetchRegistrationCounts = useCallback(async () => {
    try {
      const registrationCounts: {[key: string]: number} = {};
      
      for (const event of events) {
        // Use the security definer function to get registration count
        const { data: countData } = await supabase
          .rpc('get_event_registration_count', { event_id_param: event.id });
        
        registrationCounts[event.id] = countData || 0;
      }
      
      setEventRegistrations(registrationCounts);
    } catch (error) {
      console.error('Error fetching registration counts:', error);
    }
  }, [events]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create events.",
        variant: "destructive"
      });
      return;
    }

    try {
      if (isEditMode && editingEvent) {
        // Update existing event - store registration_closed in metadata
        const updateData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          location: formData.location,
          start_date: new Date(formData.start_date).toISOString(), // Convert to ISO string for proper timezone handling
          end_date: formData.end_date ? new Date(formData.end_date).toISOString() : new Date(formData.start_date).toISOString(), // Convert to ISO string
          max_attendees: formData.max_attendees,
          registration_fee: formData.registration_fee,
          points_reward: formData.points_reward || 0, // Default to 0 if not provided
          department: formData.department,
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('events')
          .update(updateData)
          .eq('id', editingEvent.id);

        if (error) throw error;

        // Store registration status in localStorage as metadata
        const registrationStatus = {
          eventId: editingEvent.id,
          registrationClosed: formData.registration_closed,
          updatedAt: new Date().toISOString()
        };
        
        const existingStatuses = JSON.parse(localStorage.getItem('eventRegistrationStatus') || '[]');
        const updatedStatuses = existingStatuses.filter((status: any) => status.eventId !== editingEvent.id);
        updatedStatuses.push(registrationStatus);
        localStorage.setItem('eventRegistrationStatus', JSON.stringify(updatedStatuses));

        toast({
          title: "Event Updated!",
          description: "Your event has been successfully updated.",
        });
      } else {
        // Create new event - exclude registration_closed field
        const createData = {
          title: formData.title,
          description: formData.description,
          category: formData.category,
          location: formData.location,
          start_date: new Date(formData.start_date).toISOString(), // Convert to ISO string for proper timezone handling
          end_date: formData.end_date ? new Date(formData.end_date).toISOString() : new Date(formData.start_date).toISOString(), // Convert to ISO string
          max_attendees: formData.max_attendees,
          registration_fee: formData.registration_fee,
          points_reward: formData.points_reward || 0, // Default to 0 if not provided
          department: formData.department,
          created_by: user.id,
          created_at: new Date().toISOString(),
          status: 'upcoming'
        };

        const { error } = await supabase.from('events').insert(createData);

        if (error) throw error;

        toast({
          title: "Event Created!",
          description: "Your event has been successfully created.",
        });
      }

      resetForm();
      refetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: "Error",
        description: "Failed to save event. Please try again.",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      location: '',
      start_date: '',
      end_date: '',
      max_attendees: 50,
      registration_fee: 0,
      points_reward: 10,
      department: '',
      registration_closed: false
    });
    setIsDialogOpen(false);
    setIsEditMode(false);
    setEditingEvent(null);
  };

  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    setIsEditMode(true);
    
    // Get registration status from localStorage
    const existingStatuses = JSON.parse(localStorage.getItem('eventRegistrationStatus') || '[]');
    const eventStatus = existingStatuses.find((status: any) => status.eventId === event.id);
    
    setFormData({
      title: event.title,
      description: event.description,
      category: event.category,
      location: event.location,
      start_date: event.start_date ? new Date(event.start_date).toISOString().slice(0, 16) : '',
      end_date: event.end_date ? new Date(event.end_date).toISOString().slice(0, 16) : '',
      max_attendees: event.max_attendees,
      registration_fee: event.registration_fee,
      points_reward: event.points_reward,
      department: event.department,
      registration_closed: eventStatus?.registrationClosed || false
    });
    setIsDialogOpen(true);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }

    setDeletingEventId(eventId);
    try {
      console.log('Starting delete process for event:', eventId);
      
      // First delete all registrations for this event
      console.log('Deleting registrations for event:', eventId);
      const { error: registrationsError } = await supabase
        .from('event_registrations')
        .delete()
        .eq('event_id', eventId);

      if (registrationsError) {
        console.error('Error deleting registrations:', registrationsError);
        throw registrationsError;
      }
      console.log('Registrations deleted successfully');

      // Then delete the event
      console.log('Deleting event:', eventId);
      const { error: eventError } = await supabase
        .from('events')
        .delete()
        .eq('id', eventId);

      if (eventError) {
        console.error('Error deleting event:', eventError);
        throw eventError;
      }
      console.log('Event deleted successfully');

      toast({
        title: "Event Deleted",
        description: "The event has been successfully deleted.",
      });

      // Add a small delay to ensure database operation is complete
      console.log('Waiting for database operation to complete...');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Refresh the events list from database
      console.log('Refreshing events list from database...');
      await refetchEvents();
      console.log('Events list refreshed from database');
      
      // Double-check by fetching again after a short delay
      setTimeout(async () => {
        console.log('Double-checking events list...');
        await refetchEvents();
        console.log('Double-check complete');
      }, 1000);
    } catch (error: any) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: `Failed to delete event: ${error.message || 'Unknown error'}`,
        variant: "destructive"
      });
    } finally {
      setDeletingEventId(null);
    }
  };

  const handleToggleRegistration = async (eventId: string, currentStatus: boolean) => {
    try {
      // Update registration status in localStorage
      const existingStatuses = JSON.parse(localStorage.getItem('eventRegistrationStatus') || '[]');
      const updatedStatuses = existingStatuses.filter((status: any) => status.eventId !== eventId);
      
      const newStatus = {
        eventId: eventId,
        registrationClosed: !currentStatus,
        updatedAt: new Date().toISOString()
      };
      
      updatedStatuses.push(newStatus);
      localStorage.setItem('eventRegistrationStatus', JSON.stringify(updatedStatuses));

      toast({
        title: currentStatus ? "Registration Opened" : "Registration Closed",
        description: currentStatus ? 
          "Event registration is now open for participants." : 
          "Event registration has been closed.",
      });

      refetchEvents();
    } catch (error) {
      console.error('Error toggling registration:', error);
      toast({
        title: "Error",
        description: "Failed to update registration status. Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Event Management</h2>
          <p className="text-muted-foreground">Create and manage events for Vibranium TechFest 2024</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Event' : 'Create New Event'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Update the event details below' : 'Fill in the details to create a new event for Vibranium TechFest 2024'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Event Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter event title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workshop">Workshop</SelectItem>
                      <SelectItem value="competition">Competition</SelectItem>
                      <SelectItem value="seminar">Seminar</SelectItem>
                      <SelectItem value="exhibition">Exhibition</SelectItem>
                      <SelectItem value="networking">Networking</SelectItem>
                      <SelectItem value="hackathon">Hackathon</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe your event"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date & Time</Label>
                  <Input
                    id="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date & Time (Optional)</Label>
                  <Input
                    id="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Event location"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_attendees">Max Attendees</Label>
                  <Input
                    id="max_attendees"
                    type="number"
                    value={formData.max_attendees}
                    onChange={(e) => setFormData({ ...formData, max_attendees: parseInt(e.target.value) })}
                    min="1"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="registration_fee">Registration Fee (₹)</Label>
                  <Input
                    id="registration_fee"
                    type="number"
                    value={formData.registration_fee}
                    onChange={(e) => setFormData({ ...formData, registration_fee: parseInt(e.target.value) })}
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="points_reward">Points Reward (Optional)</Label>
                  <Input
                    id="points_reward"
                    type="number"
                    value={formData.points_reward}
                    onChange={(e) => setFormData({ ...formData, points_reward: parseInt(e.target.value) || 0 })}
                    min="0"
                    placeholder="Enter points reward (optional)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="computer-science">Computer Science</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="mechanical">Mechanical</SelectItem>
                    <SelectItem value="civil">Civil</SelectItem>
                    <SelectItem value="electrical">Electrical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isEditMode && (
                <div className="space-y-2">
                  <Label htmlFor="registration_closed">Registration Status</Label>
                  <Select 
                    value={formData.registration_closed ? 'closed' : 'open'} 
                    onValueChange={(value) => setFormData({ ...formData, registration_closed: value === 'closed' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select registration status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open for Registration</SelectItem>
                      <SelectItem value="closed">Registration Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-primary hover:bg-primary/90">
                  {isEditMode ? 'Update Event' : 'Create Event'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Events ({events.length})
          </CardTitle>
          <CardDescription>
            Manage and view all events
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No events created yet</p>
                <p className="text-sm">Click "Create Event" to get started</p>
              </div>
            ) : (
              events.map((event) => {
                const registrationCount = eventRegistrations[event.id] || 0;
                
                // Get registration status from localStorage
                const existingStatuses = JSON.parse(localStorage.getItem('eventRegistrationStatus') || '[]');
                const eventStatus = existingStatuses.find((status: any) => status.eventId === event.id);
                const isRegistrationClosed = eventStatus?.registrationClosed || false;
                
                return (
                  <div key={event.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{event.title}</h3>
                          <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground">
                            {event.category}
                          </span>
                          {isRegistrationClosed && (
                            <span className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Registration Closed
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{event.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(event.start_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{event.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{registrationCount}/{event.max_attendees} registered</span>
                          </div>
                          {event.registration_fee > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span>₹{event.registration_fee}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4" />
                            <span>{event.points_reward} pts</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <div className="text-right text-sm text-muted-foreground">
                          <p className="font-medium">{event.department}</p>
                          <p className="text-xs">{event.status}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditEvent(event)}
                            className="h-8 px-2"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleRegistration(event.id, isRegistrationClosed)}
                            className={`h-8 px-2 ${isRegistrationClosed ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
                          >
                            {isRegistrationClosed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                            className="h-8 px-2 text-red-600 hover:text-red-700"
                            disabled={deletingEventId === event.id}
                          >
                            {deletingEventId === event.id ? (
                              <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}