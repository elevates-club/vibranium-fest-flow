import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Calendar, MapPin, Users, Clock, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EventDescriptionModal from './EventDescriptionModal';

interface EventCardProps {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  attendees: number;
  maxAttendees: number;
  category: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  isRegistered?: boolean;
  registrationClosed?: boolean;
  onRegister?: () => void;
}

const EventCard = ({
  title,
  description,
  date,
  time,
  location,
  attendees,
  maxAttendees,
  category,
  status,
  isRegistered = false,
  registrationClosed = false,
  onRegister
}: EventCardProps) => {
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);

  const getStatusColor = () => {
    switch (status) {
      case 'upcoming': return 'bg-accent text-accent-foreground';
      case 'ongoing': return 'bg-secondary text-secondary-foreground';
      case 'completed': return 'bg-muted text-muted-foreground';
      default: return 'bg-accent text-accent-foreground';
    }
  };

  const getProgressPercentage = () => {
    return (attendees / maxAttendees) * 100;
  };

  return (
    <div className="group relative bg-gradient-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-card hover:transform hover:scale-105">
      {/* Category */}
      <div className="mb-3">
        <span className="text-xs text-muted-foreground font-medium">
          {category}
        </span>
      </div>

      {/* Title & Description */}
      <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
        {title}
      </h3>
      <div className="mb-4">
        <div
          className="text-muted-foreground text-sm line-clamp-2 [&_*]:inline [&_p]:inline"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
        />
        {description.length > 100 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsDescriptionModalOpen(true)}
            className="mt-2 p-0 h-auto text-primary hover:text-primary/80"
          >
            <Eye className="w-3 h-3 mr-1" />
            View More
          </Button>
        )}
      </div>

      {/* Event Details */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="w-4 h-4 mr-2 text-primary" />
          <span>{date}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <Clock className="w-4 h-4 mr-2 text-primary" />
          <span>{time}</span>
        </div>
        <div className="flex items-center text-sm text-muted-foreground">
          <MapPin className="w-4 h-4 mr-2 text-primary" />
          <span>{location}</span>
        </div>
      </div>

      {/* Attendees Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center text-muted-foreground">
            <Users className="w-4 h-4 mr-1 text-primary" />
            <span>{attendees}/{maxAttendees} registered</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {Math.round(getProgressPercentage())}% full
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-gradient-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-between items-center">
        {status === 'completed' ? (
          <Button variant="outline" disabled className="w-full">
            Event Completed
          </Button>
        ) : isRegistered ? (
          <Button variant="secondary" className="w-full">
            Registered ✓
          </Button>
        ) : registrationClosed ? (
          <Button variant="outline" disabled className="w-full">
            Registration Closed
          </Button>
        ) : attendees >= maxAttendees ? (
          <Button variant="outline" disabled className="w-full">
            Waitlist
          </Button>
        ) : (
          <Button 
            variant="hero" 
            onClick={onRegister}
            className="w-full"
          >
            Register Now
          </Button>
        )}
      </div>

      {/* Event Description Modal */}
      <EventDescriptionModal
        isOpen={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        event={{
          title,
          description,
          date,
          time,
          location,
          attendees,
          maxAttendees,
          category
        }}
      />
    </div>
  );
};

export default EventCard;