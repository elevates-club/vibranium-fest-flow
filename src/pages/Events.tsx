import { useState, useEffect } from 'react';
import Navigation from '@/components/layout/Navigation';
import EventCard from '@/components/ui/EventCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Filter, 
  Calendar,
  MapPin,
  Users 
} from 'lucide-react';

const Events = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [events, setEvents] = useState<any[]>([]);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchEvents();
    if (user) {
      fetchUserRegistrations();
    }
  }, [user]);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('start_date', { ascending: true });
      
      if (error) throw error;
      setEvents(data || []);
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

  const handleRegister = async (eventId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register for events.",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('event_registrations')
        .insert({
          event_id: eventId,
          user_id: user.id,
          status: 'registered'
        });

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Successfully registered for the event.",
      });
      
      fetchUserRegistrations();
    } catch (error: any) {
      console.error('Error registering for event:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register for event. Please try again.",
        variant: "destructive"
      });
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
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    
    return {
      ...event,
      date: startDate.toLocaleDateString(),
      time: `${startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      attendees: 0, // This would come from a count of registrations
      maxAttendees: event.max_attendees,
      isRegistered,
      onRegister: () => handleRegister(event.id)
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
                  {category.name}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {category.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8 p-6 bg-gradient-card rounded-xl border border-border">
            <div className="text-center">
              <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">3</div>
              <div className="text-sm text-muted-foreground">Days</div>
            </div>
            <div className="text-center">
              <MapPin className="w-6 h-6 text-secondary mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">8</div>
              <div className="text-sm text-muted-foreground">Venues</div>
            </div>
            <div className="text-center">
              <Users className="w-6 h-6 text-accent mx-auto mb-2" />
              <div className="text-2xl font-bold text-foreground">500+</div>
              <div className="text-sm text-muted-foreground">Participants</div>
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
              {filteredEvents.map((event, index) => (
                <EventCard
                  key={event.id || index}
                  {...event}
                />
              ))}
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
    </div>
  );
};

export default Events;