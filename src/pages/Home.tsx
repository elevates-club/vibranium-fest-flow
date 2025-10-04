import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import EventCard from '@/components/ui/EventCard';
import Navigation from '@/components/layout/Navigation';
import heroImage from '@/assets/hero-techfest.jpg';
import { useEvents } from '@/hooks/useEvents';
import { 
  Zap, 
  Trophy, 
  Users, 
  Calendar, 
  ArrowRight,
  Star,
  Gift,
  QrCode,
  Smartphone
} from 'lucide-react';

const Home = () => {
  const { events, loading } = useEvents();
  
  // Get featured events (first 3 events from database)
  const featuredEvents = events.slice(0, 3).map(event => ({
    title: event.title,
    description: event.description || '',
    date: new Date(event.start_date).toLocaleDateString(),
    time: `${new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(event.end_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
    location: event.location,
    attendees: 0, // This would need to be calculated from registrations
    maxAttendees: event.max_attendees,
    category: event.category,
    status: 'upcoming' as const,
  }));

  const features = [
    {
      icon: QrCode,
      title: "QR Pass System",
      description: "Secure digital passes with dynamic QR codes for seamless check-in"
    },
    {
      icon: Trophy,
      title: "Gamification",
      description: "Earn points, badges, and climb leaderboards for participating in events"
    },
    {
      icon: Gift,
      title: "Rewards & Coupons",
      description: "Unlock exclusive discounts and rewards based on your participation"
    },
    {
      icon: Smartphone,
      title: "Mobile First",
      description: "Optimized for mobile with offline capabilities and real-time sync"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-20" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center">
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
              <Zap className="w-4 h-4 mr-2" />
              Techfest 2024 • March 15-17
            </Badge>
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                Vibranium
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              The ultimate techfest platform powered by innovation. Connect, compete, and create 
              with cutting-edge technology and gamified experiences.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/register">
                <Button variant="hero" size="lg" className="text-lg px-8 py-4">
                  Join Techfest 2024
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link to="/events">
                <Button variant="glass" size="lg" className="text-lg px-8 py-4">
                  Explore Events
                  <Calendar className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">Participants</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-secondary mb-2">25+</div>
              <div className="text-muted-foreground">Events</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-accent mb-2">₹2L+</div>
              <div className="text-muted-foreground">Prize Money</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">48hrs</div>
              <div className="text-muted-foreground">Of Innovation</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Platform <span className="text-primary">Features</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience the future of event management with our innovative features designed for seamless participation.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center group">
                  <div className="w-16 h-16 bg-gradient-primary rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:shadow-glow transition-all duration-300">
                    <Icon className="w-8 h-8 text-primary-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-12">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Featured <span className="text-primary">Events</span>
              </h2>
              <p className="text-lg text-muted-foreground">
                Don't miss out on these exciting upcoming events
              </p>
            </div>
            <Link to="/events">
              <Button variant="outline">
                View All Events
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredEvents.map((event, index) => (
              <EventCard
                key={index}
                {...event}
                onRegister={() => console.log(`Registering for ${event.title}`)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-primary/10">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <Star className="w-12 h-12 text-primary mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Join the Future?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Register now and be part of the most innovative techfest experience. 
            Earn points, win prizes, and connect with the tech community.
          </p>
          <Link to="/register">
            <Button variant="hero" size="lg" className="text-lg px-8 py-4">
              Start Your Journey
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-muted-foreground">
            <p>&copy; 2024 Vibranium Techfest Platform. Developed by Elevates</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;