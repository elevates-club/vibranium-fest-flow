import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar, MapPin, Users, DollarSign, Star, Edit, Trash2, Lock, Unlock, Eye, Mail, Phone, GraduationCap, Clock, CheckCircle, Maximize2, Minimize2, Eye as EyeIcon } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEvents } from '@/hooks/useEvents';

export default function EventCreation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { events, refetchEvents } = useEvents();
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [eventRegistrations, setEventRegistrations] = useState<{[key: string]: number}>({});
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [isDescFullscreen, setIsDescFullscreen] = useState(false);
  const [showDescPreview, setShowDescPreview] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const descriptionFsRef = useRef<HTMLTextAreaElement>(null);

  const applyFormat = (
    targetRef: React.RefObject<HTMLTextAreaElement>,
    action: 'bold' | 'strike' | 'ul' | 'ol' | 'quote' | 'code'
  ) => {
    const el = targetRef.current;
    if (!el) return;
    const value = el.value;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = value.slice(start, end);

    const wrap = (pre: string, post: string, placeholder = 'text') => {
      const content = selected || placeholder;
      return value.slice(0, start) + pre + content + post + value.slice(end);
    };

    const prefixLines = (fn: (line: string, idx: number) => string) => {
      const content = (selected || 'item').split('\n');
      const withPrefix = content.map((l, i) => fn(l, i)).join('\n');
      return value.slice(0, start) + withPrefix + value.slice(end);
    };

    let newValue = value;
    switch (action) {
      case 'bold':
        newValue = wrap('**', '**');
        break;
      case 'strike':
        newValue = wrap('~~', '~~');
        break;
      case 'quote':
        newValue = prefixLines((l) => `> ${l}`);
        break;
      case 'ul':
        newValue = prefixLines((l) => `- ${l}`);
        break;
      case 'ol':
        newValue = prefixLines((l, i) => `${i + 1}. ${l}`);
        break;
      case 'code':
        newValue = wrap('\n```\n', '\n```\n', 'code');
        break;
    }

    setFormData((prev) => ({ ...prev, description: newValue }));

    // restore caret position after update
    requestAnimationFrame(() => {
      const pos = start + (newValue.length - value.length);
      try {
        el.focus();
        el.setSelectionRange(pos, pos);
      } catch {}
    });
  };
  const [isRegisteredMembersDialogOpen, setIsRegisteredMembersDialogOpen] = useState(false);
  const [selectedEventForMembers, setSelectedEventForMembers] = useState<any>(null);
  const [registeredMembers, setRegisteredMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
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

  const fetchRegisteredMembers = async (eventId: string) => {
    setMembersLoading(true);
    try {
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
          <p className="text-muted-foreground">Create and manage events for Vibranium 5.0</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90">
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{isEditMode ? 'Edit Event' : 'Create New Event'}</DialogTitle>
              <DialogDescription>
                {isEditMode ? 'Update the event details below' : 'Fill in the details to create a new event for Vibranium 5.0'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="description">Description</Label>
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowDescPreview(v => !v)}>
                      <EyeIcon className="w-4 h-4 mr-2" /> {showDescPreview ? 'Hide Preview' : 'Preview'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsDescFullscreen(true)}>
                      <Maximize2 className="w-4 h-4 mr-2" /> Expand
                    </Button>
                  </div>
                </div>
                <div className="rounded-md border">
                  <ReactQuill
                    theme="snow"
                    value={formData.description}
                    onChange={(html) => setFormData({ ...formData, description: html })}
                    modules={{
                      toolbar: [
                        [{ header: [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ list: 'ordered' }, { list: 'bullet' }],
                        [{ align: [] }],
                        ['blockquote', 'code-block'],
                        ['link'],
                        ['clean']
                      ],
                    }}
                    className="min-h-[240px] bg-background"
                  />
                </div>
                {showDescPreview && (
                  <div className="p-3 rounded-md border bg-muted/30 text-sm prose prose-invert max-w-none">
                    {formData.description ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.description}</ReactMarkdown>
                    ) : 'Nothing to preview yet.'}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date & Time</Label>
                  <div className="relative">
                    <Input
                      id="start_date"
                      ref={startInputRef}
                      type="datetime-local"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        try { (startInputRef.current as any)?.showPicker?.(); } catch {}
                        startInputRef.current?.focus();
                      }}
                      aria-label="Open start date picker"
                    >
                      📅
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date & Time (Optional)</Label>
                  <div className="relative">
                    <Input
                      id="end_date"
                      ref={endInputRef}
                      type="datetime-local"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        try { (endInputRef.current as any)?.showPicker?.(); } catch {}
                        endInputRef.current?.focus();
                      }}
                      aria-label="Open end date picker"
                    >
                      📅
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
                <Button type="button" variant="outline" onClick={resetForm} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                  {isEditMode ? 'Update Event' : 'Create Event'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Fullscreen Description Editor */}
      <Dialog open={isDescFullscreen} onOpenChange={setIsDescFullscreen}>
        <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center justify-between w-full">
              <span>Edit Description</span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setShowDescPreview(v => !v)}>
                  <EyeIcon className="w-4 h-4 mr-2" /> {showDescPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsDescFullscreen(false)}>
                  <Minimize2 className="w-4 h-4 mr-2" /> Close
                </Button>
              </div>
            </DialogTitle>
            <DialogDescription>Write the full event details. Supports new lines; toggle preview on or off.</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-3">
            <div className="rounded-md border">
              <ReactQuill
                theme="snow"
                value={formData.description}
                onChange={(html) => setFormData({ ...formData, description: html })}
                modules={{
                  toolbar: [
                    [{ header: [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ list: 'ordered' }, { list: 'bullet' }],
                    [{ align: [] }],
                    ['blockquote', 'code-block'],
                    ['link'],
                    ['clean']
                  ],
                }}
                className="min-h-[40vh] bg-background"
              />
            </div>
            {showDescPreview && (
              <div className="p-3 rounded-md border bg-muted/30 text-sm prose prose-invert max-w-none">
                {formData.description ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{formData.description}</ReactMarkdown>
                ) : 'Nothing to preview yet.'}
              </div>
            )}
          </div>
          <div className="flex-shrink-0 flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setIsDescFullscreen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>

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
        <CardContent className="p-3 sm:p-6">
          <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">
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
                  <div key={event.id} className="border rounded-lg p-3 sm:p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <h3 className="font-semibold text-base sm:text-lg truncate">{event.title}</h3>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground whitespace-nowrap">
                              {event.category}
                            </span>
                            {isRegistrationClosed && (
                              <span className="text-xs px-2 py-1 rounded bg-destructive text-destructive-foreground flex items-center gap-1 whitespace-nowrap">
                                <Lock className="w-3 h-3" />
                                Registration Closed
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3 break-words">
                          {event.description}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">{new Date(event.start_date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">{event.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">{registrationCount}/{event.max_attendees} registered</span>
                          </div>
                          {event.registration_fee > 0 && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">₹{event.registration_fee}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">{event.points_reward} pts</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:items-end gap-2 sm:ml-4">
                        <div className="text-left sm:text-right text-xs sm:text-sm text-muted-foreground">
                          <p className="font-medium truncate">{(event as any).department || 'All Departments'}</p>
                          <p className="text-xs capitalize">{event.status}</p>
                        </div>
                        <div className="flex gap-2 justify-end sm:justify-start">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRegisteredMembers(event)}
                            className="h-8 w-8 p-0"
                            title="Show Registered Students"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditEvent(event)}
                            className="h-8 w-8 p-0"
                            title="Edit Event"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleRegistration(event.id, isRegistrationClosed)}
                            className={`h-8 w-8 p-0 ${isRegistrationClosed ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}`}
                            title={isRegistrationClosed ? 'Open Registration' : 'Close Registration'}
                          >
                            {isRegistrationClosed ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteEvent(event.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            disabled={deletingEventId === event.id}
                            title="Delete Event"
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
      {/* Registered Members Dialog */}
      <Dialog open={isRegisteredMembersDialogOpen} onOpenChange={setIsRegisteredMembersDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Registered Students - {selectedEventForMembers?.title}
            </DialogTitle>
            <DialogDescription>
              View all registered participants for this event
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh]">
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-muted-foreground">Loading students...</span>
              </div>
            ) : registeredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No registered students found for this event.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Total registered: {registeredMembers.length} students
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
                            : member.profiles?.first_name || member.profiles?.last_name || 'Profile Incomplete'}
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
                          <span className={`text-xs px-2 py-1 rounded ${
                            member.checked_in ? 'bg-primary text-primary-foreground' : 
                            member.status === 'registered' ? 'bg-secondary text-secondary-foreground' : 
                            'bg-muted text-muted-foreground'
                          }`}>
                            {member.checked_in ? 'Checked In' : member.status || 'Registered'}
                          </span>
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
}