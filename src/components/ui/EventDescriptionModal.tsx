import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';

interface EventDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    attendees: number;
    maxAttendees: number;
    category: string;
  } | null;
}

const EventDescriptionModal = ({ isOpen, onClose, event }: EventDescriptionModalProps) => {
  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {event.title}
          </DialogTitle>
          <DialogDescription>
            Complete event details and information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Event Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center text-sm">
              <Calendar className="w-4 h-4 mr-2 text-primary" />
              <span className="font-medium">Date:</span>
              <span className="ml-2">{event.date}</span>
            </div>
            <div className="flex items-center text-sm">
              <Clock className="w-4 h-4 mr-2 text-primary" />
              <span className="font-medium">Time:</span>
              <span className="ml-2">{event.time}</span>
            </div>
            <div className="flex items-center text-sm">
              <MapPin className="w-4 h-4 mr-2 text-primary" />
              <span className="font-medium">Location:</span>
              <span className="ml-2">{event.location}</span>
            </div>
            <div className="flex items-center text-sm">
              <Users className="w-4 h-4 mr-2 text-primary" />
              <span className="font-medium">Capacity:</span>
              <span className="ml-2">{event.attendees}/{event.maxAttendees} registered</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold">Event Description</h3>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {event.description}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDescriptionModal;
