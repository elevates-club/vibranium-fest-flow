import { useState } from 'react';
import DOMPurify from 'dompurify';
import { Calendar, MapPin, Users, Clock, Eye, IndianRupee, Sparkles } from 'lucide-react';
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
      case 'upcoming': return 'from-primary/20 to-accent/20 text-primary';
      case 'ongoing': return 'from-secondary/20 to-primary/20 text-secondary';
      case 'completed': return 'from-muted/20 to-muted/10 text-muted-foreground';
      default: return 'from-primary/20 to-accent/20 text-primary';
    }
  };

  const getProgressPercentage = () => {
    return Math.min((attendees / maxAttendees) * 100, 100);
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
    <div className="group relative bg-card/50 backdrop-blur-xl rounded-2xl p-6 border border-border/50 hover:border-primary/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-2 overflow-hidden">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" />
      
      <div className="relative z-10">
        {/* Category and Department */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div className={`px-4 py-1.5 rounded-full bg-gradient-to-r ${getStatusColor()} backdrop-blur-sm text-xs font-bold uppercase tracking-wider`}>
            {category}
          </div>
          {department && department !== 'all' && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-primary/10 to-accent/10 text-primary border border-primary/20">
              {getDepartmentDisplayName(department)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent group-hover:from-primary group-hover:to-accent transition-all duration-500">
          {title}
        </h3>

        {/* Description */}
        <div className="mb-5">
          <div
            className="text-muted-foreground text-sm line-clamp-2 leading-relaxed [&_*]:inline [&_p]:inline"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(description) }}
          />
          {description.length > 100 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDescriptionModalOpen(true)}
              className="mt-2 p-0 h-auto text-primary hover:text-accent transition-colors"
            >
              <Eye className="w-3 h-3 mr-1" />
              Read More
            </Button>
          )}
        </div>

        {/* Event Details */}
        <div className="space-y-3 mb-5">
          <div className="flex items-center text-sm text-muted-foreground group/item hover:text-foreground transition-colors">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mr-3">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            <span className="font-medium">{date}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground group/item hover:text-foreground transition-colors">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-secondary/10 to-primary/10 flex items-center justify-center mr-3">
              <Clock className="w-4 h-4 text-secondary" />
            </div>
            <span className="font-medium">{time}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground group/item hover:text-foreground transition-colors">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent/10 to-secondary/10 flex items-center justify-center mr-3">
              <MapPin className="w-4 h-4 text-accent" />
            </div>
            <span className="font-medium">{location}</span>
          </div>
          {registrationFee > 0 && (
            <div className="flex items-center text-sm text-muted-foreground group/item hover:text-foreground transition-colors">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 flex items-center justify-center mr-3">
                <IndianRupee className="w-4 h-4 text-primary" />
              </div>
              <span className="font-medium">Fee: ₹{registrationFee}</span>
            </div>
          )}
        </div>

        {/* Attendees Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm mb-3">
            <div className="flex items-center text-muted-foreground font-medium">
              <Users className="w-4 h-4 mr-2 text-primary" />
              <span>{attendees}/{maxAttendees} registered</span>
            </div>
            <span className="text-xs font-bold text-primary">
              {Math.round(getProgressPercentage())}%
            </span>
          </div>
          <div className="relative w-full h-2 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className="absolute h-full bg-gradient-to-r from-primary via-accent to-secondary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${getProgressPercentage()}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="relative">
          {status === 'completed' ? (
            <Button variant="outline" disabled className="w-full">
              Event Completed
            </Button>
          ) : isRegistered ? (
            <Button variant="glass" className="w-full border-2 border-secondary/50 text-secondary hover:border-secondary">
              <Sparkles className="w-4 h-4 mr-2" />
              Registered
            </Button>
          ) : registrationClosed ? (
            <Button variant="outline" disabled className="w-full">
              Registration Closed
            </Button>
          ) : attendees >= maxAttendees ? (
            <Button variant="outline" disabled className="w-full">
              Event Full
            </Button>
          ) : (
            <Button 
              variant="hero" 
              onClick={onRegister}
              className="w-full group/btn"
            >
              <Sparkles className="w-4 h-4 mr-2 group-hover/btn:rotate-12 transition-transform" />
              Register Now
            </Button>
          )}
        </div>
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