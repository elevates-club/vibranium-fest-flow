import { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Calendar, MapPin, Users, IndianRupee, Star, Edit, Trash2, Lock, Unlock, Eye, Mail, Phone, GraduationCap, Clock, CheckCircle, Maximize2, Minimize2, Eye as EyeIcon, X, Settings, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEvents } from '@/hooks/useEvents';
import { formatDateDMY } from '@/lib/utils';

export default function EventCreation({ filterDepartment, allowAllDepartments = false }: { filterDepartment?: string; allowAllDepartments?: boolean }) {
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
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [staffDept, setStaffDept] = useState<string | null>(null);
  const [eventsSearch, setEventsSearch] = useState('');
  const [eventsSort, setEventsSort] = useState<'recent' | 'start' | 'title'>('recent');

  useEffect(() => {
    const loadRoles = async () => {
      if (!user?.id) return;
      const { data: roles } = await (supabase as any)
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      setUserRoles((roles || []).map((r: any) => r.role));
      if (!allowAllDepartments && (roles || []).some((r: any) => r.role === 'staff')) {
        const { data: es } = await (supabase as any)
          .from('event_staff')
          .select('department')
          .eq('user_id', user.id)
          .maybeSingle();
        if (es?.department) {
          setStaffDept(es.department);
          setFormData((prev) => ({ ...prev, department: es.department }));
        }
      }
    };
    loadRoles();
  }, [user, allowAllDepartments]);

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
  
  // Custom selection options state
  const [customSelections, setCustomSelections] = useState<Array<{
    id: string;
    label: string;
    type: 'select' | 'radio' | 'checkbox' | 'text';
    options: string[];
    required: boolean;
  }>>([]);
  
  const [showCustomSelections, setShowCustomSelections] = useState(false);
  
  // Custom selection functions
  const addCustomSelection = () => {
    const newSelection = {
      id: `selection_${Date.now()}`,
      label: '',
      type: 'text' as const,
      options: [''],
      required: false
    };
    setCustomSelections([...customSelections, newSelection]);
  };
  
  const updateCustomSelection = (id: string, field: string, value: any) => {
    setCustomSelections(prev => prev.map(selection => 
      selection.id === id ? { ...selection, [field]: value } : selection
    ));
  };
  
  const removeCustomSelection = (id: string) => {
    setCustomSelections(prev => prev.filter(selection => selection.id !== id));
  };
  
  const addOptionToSelection = (selectionId: string) => {
    setCustomSelections(prev => prev.map(selection => 
      selection.id === selectionId 
        ? { ...selection, options: [...selection.options, ''] }
        : selection
    ));
  };
  
  const updateOptionInSelection = (selectionId: string, optionIndex: number, value: string) => {
    setCustomSelections(prev => prev.map(selection => 
      selection.id === selectionId 
        ? { 
            ...selection, 
            options: selection.options.map((option, index) => 
              index === optionIndex ? value : option
            )
          }
        : selection
    ));
  };
  
  const removeOptionFromSelection = (selectionId: string, optionIndex: number) => {
    setCustomSelections(prev => prev.map(selection => 
      selection.id === selectionId 
        ? { 
            ...selection, 
            options: selection.options.filter((_, index) => index !== optionIndex)
          }
        : selection
    ));
  };
  
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
    registration_closed: false,
    image_url: ''
  });

  // Convert stored ISO (UTC) to a datetime-local input value in user's local time
  const toLocalInput = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset(); // minutes
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
  };

  // Draft autosave and beforeunload prompt removed per request

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

    // Validate custom fields
    const validationErrors: string[] = [];
    
    customSelections.forEach((selection, index) => {
      if (selection.required) {
        // Check if field has a label
        if (!selection.label.trim()) {
          validationErrors.push(`Custom field ${index + 1} is marked as required but has no label.`);
        }
        
        // Check if field has options (for select, radio, checkbox types)
        if (['select', 'radio', 'checkbox'].includes(selection.type)) {
          const validOptions = selection.options.filter(option => option.trim() !== '');
          if (validOptions.length === 0) {
            validationErrors.push(`Custom field "${selection.label || `Field ${index + 1}`}" is required but has no valid options.`);
          }
        }
      }
    });

    // Show validation errors if any
    if (validationErrors.length > 0) {
      toast({
        title: "Validation Error",
        description: validationErrors.join(' '),
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
          // Convert local datetime-local input to UTC ISO by reversing offset
          start_date: (() => { const d = new Date(formData.start_date); return isNaN(d.getTime()) ? null : d.toISOString(); })(),
          end_date: (() => {
            if (!formData.end_date) return formData.start_date ? new Date(formData.start_date).toISOString() : null;
            const d = new Date(formData.end_date);
            return isNaN(d.getTime()) ? null : d.toISOString();
          })(),
          max_attendees: formData.max_attendees,
          registration_fee: formData.registration_fee,
          points_reward: formData.points_reward || 0, // Default to 0 if not provided
          department: formData.department,
          custom_selection_options: customSelections.length > 0 ? customSelections : null,
          image_url: formData.image_url || null,
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
          start_date: (() => { const d = new Date(formData.start_date); return isNaN(d.getTime()) ? null : d.toISOString(); })(),
          end_date: (() => {
            if (!formData.end_date) return formData.start_date ? new Date(formData.start_date).toISOString() : null;
            const d = new Date(formData.end_date);
            return isNaN(d.getTime()) ? null : d.toISOString();
          })(),
          max_attendees: formData.max_attendees,
          registration_fee: formData.registration_fee,
          points_reward: formData.points_reward || 0, // Default to 0 if not provided
          department: formData.department,
          custom_selection_options: customSelections.length > 0 ? customSelections : null,
          image_url: formData.image_url || null,
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
      registration_closed: false,
      image_url: ''
    });
    setCustomSelections([]);
    setShowCustomSelections(false);
    setIsDialogOpen(false);
    setIsEditMode(false);
    setEditingEvent(null);
  };

  const fetchRegisteredMembers = async (eventId: string) => {
    setMembersLoading(true);
    try {
      const { data: registrations, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('*, custom_answers')
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

      const userIds = registrations.map((reg: any) => reg.user_id);
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

      const membersWithProfiles = registrations.map((registration: any) => {
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

  // Remove participant from event
  const handleRemoveParticipant = async (registrationId: string, participantName: string) => {
    if (!confirm(`Are you sure you want to remove ${participantName} from this event? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      // Refresh the registered members list
      if (selectedEventForMembers) {
        await fetchRegisteredMembers(selectedEventForMembers.id);
      }

      // Refresh registration counts
      await fetchRegistrationCounts();

      toast({
        title: "Participant Removed",
        description: `${participantName} has been removed from the event.`,
      });
    } catch (error) {
      console.error('Error removing participant:', error);
      toast({
        title: "Error",
        description: "Failed to remove participant. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Export registered members to CSV
  const exportToCSV = () => {
    if (registeredMembers.length === 0) return;

    const headers = [
      'Name',
      'Email',
      'Phone',
      'Department',
      'Year',
      'College',
      'Status',
      'Registration Date'
    ];

    // Add custom fields headers if they exist
    const customHeaders = selectedEventForMembers?.custom_selection_options 
      ? selectedEventForMembers.custom_selection_options.map((field: any) => field.label)
      : [];

    const allHeaders = [...headers, ...customHeaders];

    const csvData = registeredMembers.map(member => {
      const baseData = [
        member.profiles?.first_name && member.profiles?.last_name 
          ? `${member.profiles.first_name} ${member.profiles.last_name}`.trim()
          : member.profiles?.first_name || member.profiles?.last_name || 'Profile Incomplete',
        member.profiles?.email || 'N/A',
        member.profiles?.phone || 'Not provided',
        member.profiles?.department || 'Not provided',
        member.profiles?.year || 'Not provided',
        member.profiles?.college || 'Not provided',
        member.checked_in ? 'Checked In' : member.status || 'Registered',
        new Date(member.registration_date).toLocaleDateString()
      ];

      // Add custom field answers
      const customData = selectedEventForMembers?.custom_selection_options 
        ? selectedEventForMembers.custom_selection_options.map((field: any) => {
            if (member.custom_answers && member.custom_answers[field.id]) {
              return Array.isArray(member.custom_answers[field.id]) 
                ? member.custom_answers[field.id].join(', ') 
                : member.custom_answers[field.id];
            }
            return 'Not answered';
          })
        : [];

      return [...baseData, ...customData];
    });

    const csvContent = [
      allHeaders.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedEventForMembers?.title || 'event'}_registered_students.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
      start_date: event.start_date ? toLocalInput(event.start_date) : '',
      end_date: event.end_date ? toLocalInput(event.end_date) : '',
      max_attendees: event.max_attendees,
      registration_fee: event.registration_fee,
      points_reward: event.points_reward,
      department: event.department,
      registration_closed: eventStatus?.registrationClosed || false,
      image_url: event.image_url || ''
    });
    
    // Load custom selections if they exist
    if (event.custom_selection_options && Array.isArray(event.custom_selection_options)) {
      setCustomSelections(event.custom_selection_options);
      setShowCustomSelections(event.custom_selection_options.length > 0);
    } else {
      setCustomSelections([]);
      setShowCustomSelections(false);
    }
    
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

  // If filterDepartment is provided, only show events for that department
  const filteredEvents = (filterDepartment && Array.isArray(events))
    ? events.filter((e: any) => (e.department || '') === filterDepartment)
    : events;

  const normalizedEvents = Array.isArray(filteredEvents) ? [...filteredEvents] : [];
  const searchLower = eventsSearch.toLowerCase().trim();
  const filteredBySearch = normalizedEvents.filter((e: any) => {
    if (!searchLower) return true;
    const title = (e.title || '').toLowerCase();
    const desc = (e.description || '').toLowerCase();
    const dept = (e.department || '').toLowerCase();
    return title.includes(searchLower) || desc.includes(searchLower) || dept.includes(searchLower);
  });
  const sorted = filteredBySearch.sort((a: any, b: any) => {
    if (eventsSort === 'title') return (a.title || '').localeCompare(b.title || '');
    if (eventsSort === 'start') return new Date(a.start_date || 0).getTime() - new Date(b.start_date || 0).getTime();
    // recent
    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
  });

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
                <div className="rounded-md border quill-responsive">
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
                    className="bg-background"
                  />
                </div>
                {showDescPreview && (
                  <div className="p-3 rounded-md border bg-muted/30 text-sm prose prose-invert max-w-none">
                    {formData.description ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formData.description) }}
                      />
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
                  <SelectTrigger disabled={userRoles.includes('staff') && !allowAllDepartments}>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    <SelectItem value="computer-science">Computer Science</SelectItem>
                    <SelectItem value="electronics">Electronics</SelectItem>
                    <SelectItem value="mechanical">Mechanical</SelectItem>
                    <SelectItem value="civil">Civil</SelectItem>
                    <SelectItem value="safety-fire">Safety & Fire Engineering</SelectItem>
                    <SelectItem value="sh">S&H</SelectItem>
                  </SelectContent>
                </Select>
                {userRoles.includes('staff') && !allowAllDepartments && staffDept && (
                  <p className="text-xs text-muted-foreground">Locked to your department: {staffDept.replace('-', ' ')}</p>
                )}
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

              {/* Custom Selection Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Custom Selection Options (Optional)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomSelections(!showCustomSelections)}
                    className="flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    {showCustomSelections ? 'Hide' : 'Show'} Custom Fields
                  </Button>
                </div>
                
                {showCustomSelections && (
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    {/* Payment QR Upload */}
                    <div className="space-y-2">
                      <Label className="text-sm">Payment QR (optional)</Label>
                      <div className="flex items-center gap-3">
                        <Input type="file" accept="image/*" onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !user) return;
                          try {
                            const fileName = `${user.id}/${Date.now()}_${file.name}`;
                            const { data, error } = await (supabase as any).storage.from('payment-qr').upload(fileName, file, { upsert: true });
                            if (error) throw error;
                            const { data: pub } = (supabase as any).storage.from('payment-qr').getPublicUrl(data.path);
                            const publicUrl = pub?.publicUrl as string;
                            setFormData(prev => ({ ...prev, image_url: publicUrl }));
                            toast({ title: 'Payment QR uploaded', description: 'Image linked to this event.' });
                          } catch (err: any) {
                            console.error('Upload error', err);
                            toast({ title: 'Upload failed', description: err.message || 'Could not upload image', variant: 'destructive' });
                          }
                        }} />
                        {formData.image_url && (
                          <a href={formData.image_url} target="_blank" rel="noreferrer" className="text-xs underline">View current</a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Add custom questions/options for event registration (like Google Forms)
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addCustomSelection}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Field
                      </Button>
                    </div>
                    
                    {customSelections.map((selection, index) => (
                      <div key={selection.id} className="p-3 border rounded-lg bg-background space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium text-sm">Field {index + 1}</h4>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeCustomSelection(selection.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label className={selection.required ? "text-red-500" : ""}>
                              Question Label {selection.required && <span className="text-red-500">*</span>}
                            </Label>
                            <Input
                              value={selection.label}
                              onChange={(e) => updateCustomSelection(selection.id, 'label', e.target.value)}
                              placeholder="e.g., What's your experience level?"
                              className={selection.required && !selection.label.trim() ? "border-red-500" : ""}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label>Field Type</Label>
                            <Select
                              value={selection.type}
                              onValueChange={(value) => updateCustomSelection(selection.id, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Text Input</SelectItem>
                                <SelectItem value="select">Dropdown</SelectItem>
                                <SelectItem value="radio">Radio Buttons</SelectItem>
                                <SelectItem value="checkbox">Checkboxes</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className={selection.required ? "text-red-500" : ""}>
                              Options {selection.required && <span className="text-red-500">*</span>}
                            </Label>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => addOptionToSelection(selection.id)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Option
                            </Button>
                          </div>
                          
                          <div className="space-y-2">
                            {selection.type !== 'text' && selection.options.map((option, optionIndex) => (
                              <div key={optionIndex} className="flex items-center gap-2">
                                <Input
                                  value={option}
                                  onChange={(e) => updateOptionInSelection(selection.id, optionIndex, e.target.value)}
                                  placeholder={`Option ${optionIndex + 1}`}
                                  className={selection.required && !option.trim() ? "border-red-500" : ""}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeOptionFromSelection(selection.id, optionIndex)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            ))}
                            {selection.type !== 'text' && selection.required && ['select', 'radio', 'checkbox'].includes(selection.type) && 
                             selection.options.filter(option => option.trim() !== '').length === 0 && (
                              <p className="text-sm text-red-500 mt-1">
                                This field is required but has no valid options. Please add at least one option.
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`required-${selection.id}`}
                            checked={selection.required}
                            onChange={(e) => updateCustomSelection(selection.id, 'required', e.target.checked)}
                            className="rounded"
                          />
                          <Label htmlFor={`required-${selection.id}`} className="text-sm">
                            Required field
                          </Label>
                        </div>
                      </div>
                    ))}
                    
                    {customSelections.length === 0 && (
                      <div className="text-center py-6 text-muted-foreground">
                        <Settings className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No custom fields added yet</p>
                        <p className="text-xs">Click "Add Field" to create custom questions for registration</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

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
                  <div
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(formData.description) }}
                  />
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
            Events ({filteredEvents.length})
          </CardTitle>
          <CardDescription>
            Manage and view all events
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-3">
            <Input
              placeholder="Search by title, description, or department"
              value={eventsSearch}
              onChange={(e) => setEventsSearch(e.target.value)}
              className="sm:col-span-2"
            />
            <select
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              value={eventsSort}
              onChange={(e) => setEventsSort(e.target.value as any)}
            >
              <option value="recent">Recently added</option>
              <option value="start">Start date (soonest)</option>
              <option value="title">Title (A–Z)</option>
            </select>
          </div>
          <div className="space-y-3 sm:space-y-4 max-h-[70vh] overflow-y-auto">
            {sorted.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No matching events</p>
                <p className="text-sm">Adjust search or sorting to see results</p>
              </div>
            ) : (
              sorted.map((event) => {
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
                        <div
                          className="text-sm text-muted-foreground line-clamp-3 break-words [&_*]:inline [&_p]:inline"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description) }}
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">{formatDateDMY(event.start_date)}</span>
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
                              <IndianRupee className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span className="truncate">{event.registration_fee}</span>
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
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {registeredMembers.filter(member => member.checked_in).length} checked in
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToCSV}
                      className="flex items-center gap-2"
                      disabled={registeredMembers.length === 0}
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </Button>
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
                      {selectedEventForMembers?.custom_selection_options && selectedEventForMembers.custom_selection_options.map((field: any) => (
                        <TableHead key={field.id} className="max-w-xs">
                          {field.label}
                        </TableHead>
                      ))}
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Actions</TableHead>
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
                        {selectedEventForMembers?.custom_selection_options && selectedEventForMembers.custom_selection_options.map((field: any) => (
                          <TableCell key={field.id} className="max-w-xs text-sm">
                            {member.custom_answers && member.custom_answers[field.id] 
                              ? (Array.isArray(member.custom_answers[field.id]) 
                                  ? member.custom_answers[field.id].join(', ') 
                                  : member.custom_answers[field.id])
                              : 'Not answered'
                            }
                          </TableCell>
                        ))}
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
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveParticipant(
                              member.id, 
                              member.profiles?.first_name && member.profiles?.last_name 
                                ? `${member.profiles.first_name} ${member.profiles.last_name}`.trim()
                                : member.profiles?.first_name || member.profiles?.last_name || 'Participant'
                            )}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            title="Remove Participant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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