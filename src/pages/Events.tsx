import { useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import EventCard from '@/components/ui/EventCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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

  const categories = [
    { id: 'all', name: 'All Events', count: 25 },
    { id: 'workshop', name: 'Workshops', count: 8 },
    { id: 'competition', name: 'Competitions', count: 10 },
    { id: 'talk', name: 'Tech Talks', count: 5 },
    { id: 'networking', name: 'Networking', count: 2 }
  ];

  const allEvents = [
    {
      title: "AI/ML Workshop",
      description: "Hands-on workshop on building AI models with TensorFlow and PyTorch. Learn from industry experts and build real-world projects.",
      date: "March 15, 2024",
      time: "10:00 AM - 4:00 PM",
      location: "Tech Lab A",
      attendees: 45,
      maxAttendees: 60,
      category: "Workshop",
      status: "upcoming" as const,
    },
    {
      title: "Hackathon Finals",
      description: "24-hour coding marathon to build innovative solutions. Prizes worth ₹50,000 up for grabs! Team up and create the next big thing.",
      date: "March 16, 2024",
      time: "6:00 PM onwards",
      location: "Main Auditorium",
      attendees: 120,
      maxAttendees: 150,
      category: "Competition",
      status: "upcoming" as const,
    },
    {
      title: "Tech Talk: Future of Web3",
      description: "Industry leaders discuss blockchain, DeFi, and the future of decentralized applications. Get insights into the next internet revolution.",
      date: "March 17, 2024",
      time: "2:00 PM - 3:30 PM",
      location: "Conference Hall",
      attendees: 80,
      maxAttendees: 100,
      category: "Talk",
      status: "upcoming" as const,
    },
    {
      title: "Cybersecurity Workshop",
      description: "Learn ethical hacking techniques and cybersecurity best practices. Hands-on penetration testing and security auditing.",
      date: "March 15, 2024",
      time: "2:00 PM - 6:00 PM",
      location: "Security Lab",
      attendees: 30,
      maxAttendees: 40,
      category: "Workshop",
      status: "upcoming" as const,
    },
    {
      title: "Mobile App Development",
      description: "Build cross-platform mobile apps with React Native and Flutter. From zero to app store in one day.",
      date: "March 16, 2024",
      time: "9:00 AM - 5:00 PM",
      location: "Mobile Dev Lab",
      attendees: 25,
      maxAttendees: 35,
      category: "Workshop",
      status: "upcoming" as const,
    },
    {
      title: "Code Golf Championship",
      description: "Write the shortest code to solve programming challenges. Test your algorithmic skills and code optimization.",
      date: "March 17, 2024",
      time: "10:00 AM - 12:00 PM",
      location: "Programming Arena",
      attendees: 60,
      maxAttendees: 80,
      category: "Competition",
      status: "upcoming" as const,
    },
    {
      title: "Startup Pitch Competition",
      description: "Present your startup ideas to industry veterans and VCs. Win funding and mentorship opportunities.",
      date: "March 17, 2024",
      time: "3:00 PM - 6:00 PM",
      location: "Innovation Hub",
      attendees: 40,
      maxAttendees: 50,
      category: "Competition",
      status: "upcoming" as const,
    },
    {
      title: "AR/VR Experience Zone",
      description: "Explore the latest in augmented and virtual reality. Try cutting-edge headsets and immersive experiences.",
      date: "March 15, 2024",
      time: "All Day",
      location: "VR Arena",
      attendees: 200,
      maxAttendees: 300,
      category: "Workshop",
      status: "ongoing" as const,
    }
  ];

  const filteredEvents = allEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || 
                           event.category.toLowerCase() === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

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
                  key={index}
                  {...event}
                  onRegister={() => console.log(`Registering for ${event.title}`)}
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