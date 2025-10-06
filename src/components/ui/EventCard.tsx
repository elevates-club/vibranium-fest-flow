import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Calendar, MapPin, Users, Clock, Eye, IndianRupee } from 'lucide-react';
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
  department?: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  isRegistered?: boolean;
  registrationClosed?: boolean;
  onRegister?: () => void;
  registrationFee?: number;
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
  department,
  status,
  isRegistered = false,
  registrationClosed = false,
  onRegister,
  registrationFee = 0
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

  const getDepartmentDisplayName = (dept: string) => {
    const departmentMap: { [key: string]: string } = {
      'all': 'All Departments',
      'computer-science': 'Computer Science',
      'electronics': 'Electronics',
      'mechanical': 'Mechanical',
      'civil': 'Civil',
      'safety-fire': 'Safety & Fire Engineering'
    };
    return departmentMap[dept] || dept;
  };

  return (
    <div className="group relative bg-gradient-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all duration-300 hover:shadow-card hover:transform hover:scale-105">
      {/* Category and Department */}
      <div className="mb-3 flex items-center flex-wrap gap-2">
        <span className="text-xs text-muted-foreground font-medium">
          {category}
        </span>
        {department && department !== 'all' && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 ml-auto">
            {getDepartmentDisplayName(department)}
          </span>
        )}
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
        {registrationFee > 0 && (
          <div className="flex items-center text-sm text-muted-foreground">
            <IndianRupee className="w-4 h-4 mr-2 text-primary" />
            <span>Registration Fee: {registrationFee}</span>
          </div>
        )}
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
          category,
          department,
          registrationFee
        }}
      />
    </div>
  );
};

export default EventCard;