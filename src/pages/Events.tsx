import { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import EventCard from '@/components/ui/EventCard';
import LoginPromptModal from '@/components/ui/LoginPromptModal';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { apiCall } from '@/lib/apiUtils';
import { 
  Search, 
  Filter, 
  Calendar,
  MapPin,
  Users,
  Mail,
  CheckCircle
} from 'lucide-react';

const Events = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [events, setEvents] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    customDepartment: '',
    year: ''
  });
  const [customSelectionAnswers, setCustomSelectionAnswers] = useState<{[key: string]: string | string[]}>({});
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Simple session id persisted in localStorage for anonymous view attribution
  const getSessionId = () => {
    try {
      const key = 'vf_session_id';
      let sid = localStorage.getItem(key);
      if (!sid) {
        sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(key, sid);
      }
      return sid;
    } catch {
      return undefined;
    }
  };

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchUserRegistrations();
      // Pre-fill registration form with user data
      setRegistrationForm({
        name: user.user_metadata?.first_name ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim() : '',
        email: user.email || '',
        phone: user.user_metadata?.phone || '',
        department: user.user_metadata?.department || '',
        customDepartment: '',
        year: user.user_metadata?.year || ''
      });
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      console.log('Fetching events...');
      
      // Fetch events first
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (eventsError) {
        console.error('Events fetch error:', eventsError);
        throw eventsError;
      }
      
      console.log('Events fetched:', eventsData);
      
      // Fetch registration counts for each event
      const processedEvents = await Promise.all(
        eventsData?.map(async (event) => {
          console.log(`Fetching registration count for event: ${event.title} (ID: ${event.id})`);
          
          // Use the security definer function to get registration count
          const { data: countData, error: countError } = await supabase
            .rpc('get_event_registration_count', { event_id_param: event.id });
          
          if (countError) {
            console.error(`Count error for event ${event.id}:`, countError);
          }
          
          const count = countData || 0;
          console.log(`Registration count for ${event.title}: ${count}`);
          
          return {
            ...event,
            attendees: count
          };
        }) || []
      );
      
      console.log('Processed events:', processedEvents);
      setEvents(processedEvents);

      // Log views for visible events with per-day throttle
      await logEventViews(processedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Log event views once per day per session to Supabase table: event_views(event_id, viewed_at, user_id, session_id)
  const logEventViews = async (eventList: any[]) => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const storageKey = 'vf_event_viewed_dates';
      const viewedMap = JSON.parse(localStorage.getItem(storageKey) || '{}');
      const sessionId = getSessionId();

      const rows = eventList
        .filter((e) => {
          const last = viewedMap[e.id];
          return last !== today; // not yet logged today
        })
        .map((e) => ({
          event_id: e.id,
          viewed_at: new Date().toISOString(),
          user_id: user?.id || null,
          session_id: sessionId || null,
        }));

      if (rows.length === 0) return;

      const { error } = await (supabase as any).from('event_views').insert(rows);
      if (!error) {
        // update throttle map
        rows.forEach((r) => {
          viewedMap[r.event_id] = today;
        });
        localStorage.setItem(storageKey, JSON.stringify(viewedMap));
      } else {
        console.warn('View logging failed:', error.message);
      }
    } catch (err) {
      console.warn('View logging error:', err);
    }
  };

  const fetchUserRegistrations = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const handleRegisterClick = (event: any) => {
    if (!user) {
      setSelectedEvent(event);
      setIsLoginPromptOpen(true);
      return;
    }

    // Check if registration is closed (from localStorage)
    const existingStatuses = JSON.parse(localStorage.getItem('eventRegistrationStatus') || '[]');
    const eventStatus = existingStatuses.find((status: any) => status.eventId === event.id);
    const isRegistrationClosed = eventStatus?.registrationClosed || false;

    if (isRegistrationClosed) {
      toast({
        title: "Registration Closed",
        description: "Registration for this event is currently closed.",
        variant: "destructive"
      });
      return;
    }

    setSelectedEvent(event);
    
    // Reset custom selection answers
    const initialAnswers: {[key: string]: string | string[]} = {};
    if (event.custom_selection_options && Array.isArray(event.custom_selection_options)) {
      event.custom_selection_options.forEach((selection: any) => {
        if (selection.type === 'checkbox') {
          initialAnswers[selection.id] = [];
        } else {
          initialAnswers[selection.id] = '';
        }
      });
    }
    setCustomSelectionAnswers(initialAnswers);
    
    setIsRegistrationDialogOpen(true);
  };

  const handleCustomSelectionChange = (selectionId: string, value: string | string[]) => {
    setCustomSelectionAnswers(prev => ({
      ...prev,
      [selectionId]: value
    }));
  };

  const handleCustomCheckboxChange = (selectionId: string, option: string, checked: boolean) => {
    setCustomSelectionAnswers(prev => {
      const currentValues = (prev[selectionId] as string[]) || [];
      if (checked) {
        return {
          ...prev,
          [selectionId]: [...currentValues, option]
        };
      } else {
        return {
          ...prev,
          [selectionId]: currentValues.filter(v => v !== option)
        };
      }
    });
  };

  const handleRegistrationSubmit = async () => {
    if (!user || !selectedEvent) return;

    setIsRegistering(true);
    try {
      console.log('Submitting registration for event:', selectedEvent.title, 'User:', user.id);
      
      // Determine initial status based on fee
      const isPaid = Number(selectedEvent.registration_fee || 0) > 0;
      const initialStatus = isPaid ? 'pending' : 'registered';

      // Register for the event - only include fields that exist in the database
      const { data: registrationData, error: registrationError } = await supabase
        .from('event_registrations')
        .insert({
          event_id: selectedEvent.id,
          user_id: user.id,
          status: initialStatus,
          custom_answers: Object.keys(customSelectionAnswers).length > 0 ? customSelectionAnswers : null
        })
        .select();

      if (registrationError) {
        console.error('Registration error:', registrationError);
        throw registrationError;
      }

      console.log('Registration successful:', registrationData);

      // Send email only for free events where registration is immediate
      if (!isPaid) {
        await sendRegistrationEmail(selectedEvent, registrationForm);
      }

      toast({
        title: isPaid ? "Request submitted" : "Success!",
        description: isPaid
          ? "Your request is sent. Waiting for coordinator approval."
          : "Successfully registered for the event. Check your email for confirmation.",
      });
      
      // Refresh data
      console.log('Refreshing events data...');
      await fetchEvents();
      await fetchUserRegistrations();
      
      // Close dialog
      setIsRegistrationDialogOpen(false);
      setSelectedEvent(null);
    } catch (error: any) {
      console.error('Error registering for event:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register for event. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRegistering(false);
    }
  };

  const sendRegistrationEmail = async (event: any, userData: any) => {
    try {
      // Check if email service is enabled
      const emailServiceEnabled = localStorage.getItem('emailServiceEnabled') !== 'false';
      
      if (!emailServiceEnabled) {
        console.log('Email service is disabled, skipping email send');
        toast({
          title: "Registration Successful",
          description: "Your registration is confirmed. Email notifications are currently disabled.",
        });
        return;
      }

      // Try to fetch participant QR/pass data
      let qrDataURL: string | undefined;
      let participantId: string | undefined;
      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('participant_id, qr_code_data')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!profileError && profileData) {
          const p: any = profileData as any;
          qrDataURL = p?.qr_code_data as string | undefined;
          participantId = p?.participant_id as string | undefined;
        }
      }

      // Call the email service API
      const response = await apiCall('/api/send-event-registration', {
        method: 'POST',
        body: JSON.stringify({
          eventDetails: event,
          userDetails: userData,
          qrDataURL,
          participantId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('Registration email sent successfully:', result.messageId);
        toast({
          title: "Registration Confirmed!",
          description: "Check your email for event details and confirmation.",
        });
      } else {
        console.error('Failed to send registration email:', result.error);
        toast({
          title: "Registration Successful",
          description: "Email notification failed, but your registration is confirmed.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending registration email:', error);
      // Don't show error to user since registration was successful
      toast({
        title: "Registration Successful",
        description: "Your registration is confirmed. Email notification will be sent shortly.",
      });
    }
  };

  // Utility functions to format date/time
  const formatDateDMY = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Invalid Date';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Format with dd/mm/yyyy and local time range
  const formatEventDateTime = (startDate: string, endDate?: string | null) => {
    try {
      const start = new Date(startDate);
      
      // Check if the date is valid
      if (isNaN(start.getTime())) {
        return { date: 'Invalid Date', time: 'Invalid Time' };
      }
      
      // dd/mm/yyyy
      const formattedDate = formatDateDMY(startDate);
      
      // Format time in user's locale with explicit timezone handling
      const formattedStartTime = start.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Use user's timezone
      });
      
      let formattedTime = formattedStartTime;
      
      // Add end time if available
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          const formattedEndTime = end.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // Use user's timezone
          });
          formattedTime = `${formattedStartTime} - ${formattedEndTime}`;
        }
      }
      
      return { date: formattedDate, time: formattedTime };
    } catch (error) {
      console.error('Error formatting date/time:', error);
      return { date: 'Invalid Date', time: 'Invalid Time' };
    }
  };

  const departments = [
    { id: 'all', name: 'All Departments', count: events.length },
    { id: 'computer-science', name: 'Computer Science', count: events.filter(e => e.department === 'computer-science').length },
    { id: 'electronics', name: 'Electronics', count: events.filter(e => e.department === 'electronics').length },
    { id: 'mechanical', name: 'Mechanical', count: events.filter(e => e.department === 'mechanical').length },
    { id: 'civil', name: 'Civil', count: events.filter(e => e.department === 'civil').length },
    { id: 'safety-fire', name: 'Safety & Fire Engineering', count: events.filter(e => e.department === 'safety-fire').length }
  ];

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || 
                             event.department === selectedDepartment;
    
    return matchesSearch && matchesDepartment;
  }).map(event => {
    const isRegistered = registrations.some(reg => reg.event_id === event.id);
    const { date, time } = formatEventDateTime(event.start_date, event.end_date);
    
    return {
      ...event,
      date,
      time,
      attendees: event.attendees || 0, // Use the actual registration count from database
      maxAttendees: event.max_attendees,
      isRegistered,
      onRegister: () => handleRegisterClick(event)
    };
  });

  if (loading) {
    return (
      <div className="bg-background">
        <Navigation />
        <div className="pt-20 pb-16 flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <Navigation />
      
      <div className="pt-16 sm:pt-20 pb-12 sm:pb-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8 sm:mb-12">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4">
              All <span className="text-primary">Events</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
              Discover workshops, competitions, and tech talks designed to expand your knowledge and skills.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-6 sm:mb-8 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>
              <Button variant="outline" className="sm:w-auto h-11">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>

            {/* Department Pills */}
            <div className="flex flex-wrap gap-2">
              {departments.map((department) => (
                <Button
                  key={department.id}
                  variant={selectedDepartment === department.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDepartment(department.id)}
                  className="text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
                >
                  <span className="hidden sm:inline">{department.name}</span>
                  <span className="sm:hidden">{department.name.split(' ')[0]}</span>
                  <span className="ml-1">({department.count})</span>
                </Button>
              ))}
            </div>
          </div>


          {/* Events Grid */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-semibold">
                {selectedDepartment === 'all' ? 'All Events' : 
                 departments.find(d => d.id === selectedDepartment)?.name} 
                <span className="text-muted-foreground ml-2 text-base sm:text-lg">
                  ({filteredEvents.length})
                </span>
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
              {filteredEvents.map((event, index) => {
                const isRegistered = registrations.some(reg => reg.event_id === event.id);
                
                // Get registration status from localStorage
                const existingStatuses = JSON.parse(localStorage.getItem('eventRegistrationStatus') || '[]');
                const eventStatus = existingStatuses.find((status: any) => status.eventId === event.id);
                const isRegistrationClosed = eventStatus?.registrationClosed || false;
                
                return (
                  <EventCard
                    key={event.id || index}
                    title={event.title}
                    description={event.description}
                    date={event.date}
                    time={event.time}
                    location={event.location}
                    attendees={event.attendees || 0}
                    maxAttendees={event.max_attendees}
                    category={event.category}
                    department={event.department}
                    status={new Date(event.end_date) < new Date() ? 'completed' : 
                           new Date(event.start_date) <= new Date() ? 'ongoing' : 'upcoming'}
                    isRegistered={isRegistered}
                    registrationClosed={isRegistrationClosed}
                    registrationFee={Number(event.registration_fee || 0)}
                    onRegister={() => handleRegisterClick(event)}
                  />
                );
              })}
            </div>
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-lg">
                No events found matching your criteria.
              </div>
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('');
                  setSelectedDepartment('all');
                }}
                className="mt-4"
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Registration Dialog */}
      <Dialog open={isRegistrationDialogOpen} onOpenChange={setIsRegistrationDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
              <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              <span className="break-words">Confirm Event Registration</span>
            </DialogTitle>
            <DialogDescription className="text-sm sm:text-base">
              Please review your details before confirming registration for <strong className="break-words">{selectedEvent?.title}</strong>
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 min-h-0">
              {/* Event Details */}
              <div className="bg-muted/50 p-3 sm:p-4 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm sm:text-base">{selectedEvent.title}</h4>
                <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{new Date(selectedEvent.start_date).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{selectedEvent.location}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span className="truncate">{selectedEvent.attendees || 0}/{selectedEvent.max_attendees} registered</span>
                  </div>
                </div>
              </div>

              {/* Registration Form */}
              <div className="space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                    <Input
                      id="name"
                      value={registrationForm.name}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, name: e.target.value })}
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={registrationForm.email}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, email: e.target.value })}
                      className="h-10 sm:h-11"
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">Phone</Label>
                    <Input
                      id="phone"
                      value={registrationForm.phone}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, phone: e.target.value })}
                      className="h-10 sm:h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year" className="text-sm font-medium">Year</Label>
                    <Input
                      id="year"
                      value={registrationForm.year}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, year: e.target.value })}
                      className="h-10 sm:h-11"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
              <Label htmlFor="department" className="text-sm font-medium">Department</Label>
              <Select
                value={registrationForm.department}
                onValueChange={(value) => setRegistrationForm({ ...registrationForm, department: value })}
              >
                <SelectTrigger id="department" className="h-10 sm:h-11">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</SelectItem>
                  <SelectItem value="Computer Science Engineering in Cyber Security">Computer Science Engineering in Cyber Security</SelectItem>
                  <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                  <SelectItem value="Electronics & Communication Engineering">Electronics & Communication Engineering</SelectItem>
                  <SelectItem value="Safety & Fire Engineering">Safety & Fire Engineering</SelectItem>
                  <SelectItem value="Computer Science & Engineering">Computer Science & Engineering</SelectItem>
                  <SelectItem value="Computer Science & Business Systems">Computer Science & Business Systems</SelectItem>
                  <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                  <SelectItem value="Science & Humanities">Science & Humanities</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {registrationForm.department === 'Other' && (
                  <Input
                  placeholder="Type your department"
                  value={registrationForm.customDepartment}
                  onChange={(e) => setRegistrationForm({ ...registrationForm, customDepartment: e.target.value })}
                  className="h-10 sm:h-11 mt-2"
                />
              )}
            </div>
            
            {/* Custom Selection Fields */}
            {selectedEvent?.custom_selection_options && selectedEvent.custom_selection_options.length > 0 && (
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium text-muted-foreground mb-3">Additional Questions</h3>
                  {selectedEvent.custom_selection_options.map((selection: any) => (
                    <div key={selection.id} className="space-y-2 mb-4">
                      <Label className="text-sm font-medium">
                        {selection.label}
                        {selection.required && <span className="text-red-500 ml-1">*</span>}
                      </Label>
                      
                      {selection.type === 'select' && (
                        <Select
                          value={customSelectionAnswers[selection.id] as string || ''}
                          onValueChange={(value) => handleCustomSelectionChange(selection.id, value)}
                        >
                          <SelectTrigger className="h-10 sm:h-11">
                            <SelectValue placeholder="Select an option" />
                          </SelectTrigger>
                          <SelectContent>
                            {selection.options.map((option: string, index: number) => (
                              <SelectItem key={index} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      
                      {selection.type === 'radio' && (
                        <div className="space-y-2">
                          {selection.options.map((option: string, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`${selection.id}-${index}`}
                                name={selection.id}
                                value={option}
                                checked={(customSelectionAnswers[selection.id] as string) === option}
                                onChange={(e) => handleCustomSelectionChange(selection.id, e.target.value)}
                                className="rounded"
                              />
                              <Label htmlFor={`${selection.id}-${index}`} className="text-sm">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {selection.type === 'checkbox' && (
                        <div className="space-y-2">
                          {selection.options.map((option: string, index: number) => (
                            <div key={index} className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`${selection.id}-${index}`}
                                checked={(customSelectionAnswers[selection.id] as string[])?.includes(option) || false}
                                onChange={(e) => handleCustomCheckboxChange(selection.id, option, e.target.checked)}
                                className="rounded"
                              />
                              <Label htmlFor={`${selection.id}-${index}`} className="text-sm">
                                {option}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
              </div>
            </div>
          )}

          {/* Action Buttons - Fixed at bottom */}
          <div className="flex-shrink-0 flex flex-col sm:flex-row gap-2 sm:gap-3 pt-3 sm:pt-4 border-t bg-background">
                <Button 
                  variant="outline" 
                  onClick={() => setIsRegistrationDialogOpen(false)}
              className="w-full sm:flex-1 h-10 sm:h-11"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleRegistrationSubmit}
              disabled={isRegistering}
              className="w-full sm:flex-1 h-10 sm:h-11"
            >
              {isRegistering ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Registering...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  {Number(selectedEvent?.registration_fee || 0) > 0 ? 'Request Approval' : 'Confirm Registration'}
                </>
              )}
                </Button>
              </div>
        </DialogContent>
      </Dialog>

      {/* Login Prompt Modal */}
      <LoginPromptModal 
        isOpen={isLoginPromptOpen}
        onClose={() => setIsLoginPromptOpen(false)}
        eventTitle={selectedEvent?.title}
      />
    </div>
  );
};

export default Events;