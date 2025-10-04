import { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import EventCard from '@/components/ui/EventCard';
import LoginPromptModal from '@/components/ui/LoginPromptModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
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
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [events, setEvents] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [registrationForm, setRegistrationForm] = useState({
    name: '',
    email: '',
    phone: '',
    department: '',
    year: ''
  });
  const { user } = useAuth();
  const { toast } = useToast();

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
          
          // Try a different approach - get all registrations and count them
          const { data: registrations, error: countError } = await supabase
            .from('event_registrations')
            .select('id')
            .eq('event_id', event.id);
          
          if (countError) {
            console.error(`Count error for event ${event.id}:`, countError);
          }
          
          const count = registrations?.length || 0;
          console.log(`Registration count for ${event.title}: ${count}`);
          
          return {
            ...event,
            attendees: count
          };
        }) || []
      );
      
      console.log('Processed events:', processedEvents);
      setEvents(processedEvents);
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
    setIsRegistrationDialogOpen(true);
  };

  const handleRegistrationSubmit = async () => {
    if (!user || !selectedEvent) return;

    try {
      console.log('Submitting registration for event:', selectedEvent.title, 'User:', user.id);
      
      // Register for the event - only include fields that exist in the database
      const { data: registrationData, error: registrationError } = await supabase
        .from('event_registrations')
        .insert({
          event_id: selectedEvent.id,
          user_id: user.id,
          status: 'registered'
        })
        .select();

      if (registrationError) {
        console.error('Registration error:', registrationError);
        throw registrationError;
      }

      console.log('Registration successful:', registrationData);

      // Send email notification (simulated for now)
      await sendRegistrationEmail(selectedEvent, registrationForm);

      toast({
        title: "Success!",
        description: "Successfully registered for the event. Check your email for confirmation.",
      });
      
      // Refresh data
      console.log('Refreshing events data...');
      fetchEvents();
      fetchUserRegistrations();
      
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
    }
  };

  const sendRegistrationEmail = async (event: any, userData: any) => {
    // This would integrate with an email service like SendGrid, Resend, etc.
    // For now, we'll simulate the email sending
    console.log('Sending registration email:', {
      to: userData.email,
      subject: `Registration Confirmation - ${event.title}`,
      event: event,
      user: userData
    });
    
    // In a real implementation, you would call your email service here
    // Example: await emailService.send({
    //   to: userData.email,
    //   subject: `Registration Confirmation - ${event.title}`,
    //   template: 'event-registration',
    //   data: { event, user: userData }
    // });
  };

  // Utility function to format date and time with proper timezone handling
  const formatEventDateTime = (startDate: string, endDate?: string | null) => {
    try {
      const start = new Date(startDate);
      
      // Check if the date is valid
      if (isNaN(start.getTime())) {
        return { date: 'Invalid Date', time: 'Invalid Time' };
      }
      
      // Format date in user's locale
      const formattedDate = start.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        weekday: 'short'
      });
      
      // Format time in user's locale
      const formattedStartTime = start.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      
      let formattedTime = formattedStartTime;
      
      // Add end time if available
      if (endDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          const formattedEndTime = end.toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
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

  const categories = [
    { id: 'all', name: 'All Events', count: events.length },
    { id: 'workshop', name: 'Workshops', count: events.filter(e => e.category.toLowerCase() === 'workshop').length },
    { id: 'competition', name: 'Competitions', count: events.filter(e => e.category.toLowerCase() === 'competition').length },
    { id: 'talk', name: 'Tech Talks', count: events.filter(e => e.category.toLowerCase() === 'talk').length },
    { id: 'networking', name: 'Networking', count: events.filter(e => e.category.toLowerCase() === 'networking').length }
  ];

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           event.category.toLowerCase() === selectedCategory;
    
    return matchesSearch && matchesCategory;
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
      <div className="min-h-screen bg-background">
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
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <div className="pt-20 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              All <span className="text-primary">Events</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover workshops, competitions, and tech talks designed to expand your knowledge and skills.
            </p>
          </div>

          {/* Search and Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" className="md:w-auto">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="text-sm"
                >
                  {category.name} ({category.count})
                </Button>
              ))}
            </div>
          </div>


          {/* Events Grid */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-semibold">
                {selectedCategory === 'all' ? 'All Events' : 
                 categories.find(c => c.id === selectedCategory)?.name} 
                <span className="text-muted-foreground ml-2">
                  ({filteredEvents.length})
                </span>
              </h2>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
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
                    date={new Date(event.start_date).toLocaleDateString()}
                    time={`${new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    location={event.location}
                    attendees={event.attendees || 0}
                    maxAttendees={event.max_attendees}
                    category={event.category}
                    status={new Date(event.end_date) < new Date() ? 'completed' : 
                           new Date(event.start_date) <= new Date() ? 'ongoing' : 'upcoming'}
                    isRegistered={isRegistered}
                    registrationClosed={isRegistrationClosed}
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
                  setSelectedCategory('all');
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Confirm Event Registration
            </DialogTitle>
            <DialogDescription>
              Please review your details before confirming registration for <strong>{selectedEvent?.title}</strong>
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4">
              {/* Event Details */}
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-semibold">{selectedEvent.title}</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedEvent.start_date).toLocaleDateString()}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {selectedEvent.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    {selectedEvent.attendees || 0}/{selectedEvent.max_attendees} registered
                  </div>
                </div>
              </div>

              {/* Registration Form */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={registrationForm.name}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={registrationForm.email}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, email: e.target.value })}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={registrationForm.phone}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input
                      id="year"
                      value={registrationForm.year}
                      onChange={(e) => setRegistrationForm({ ...registrationForm, year: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    value={registrationForm.department}
                    onChange={(e) => setRegistrationForm({ ...registrationForm, department: e.target.value })}
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setIsRegistrationDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleRegistrationSubmit}
                  className="flex-1 bg-primary hover:bg-primary/90"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Confirm Registration
                </Button>
              </div>
            </div>
          )}
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