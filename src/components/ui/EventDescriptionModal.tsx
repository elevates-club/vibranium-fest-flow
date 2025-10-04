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
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-xl sm:text-2xl font-bold leading-tight">
            {event.title}
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            Complete event details and information
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 px-1">
          {/* Event Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
            <div className="flex items-start sm:items-center text-xs sm:text-sm">
              <Calendar className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <span className="font-medium">Date:</span>
                <span className="ml-2 break-words">{event.date}</span>
              </div>
            </div>
            <div className="flex items-start sm:items-center text-xs sm:text-sm">
              <Clock className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <span className="font-medium">Time:</span>
                <span className="ml-2 break-words">{event.time}</span>
              </div>
            </div>
            <div className="flex items-start sm:items-center text-xs sm:text-sm sm:col-span-2">
              <MapPin className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <span className="font-medium">Location:</span>
                <span className="ml-2 break-words">{event.location}</span>
              </div>
            </div>
            <div className="flex items-start sm:items-center text-xs sm:text-sm sm:col-span-2">
              <Users className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <span className="font-medium">Capacity:</span>
                <span className="ml-2">{event.attendees}/{event.maxAttendees} registered</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-base sm:text-lg font-semibold">Event Description</h3>
            <div className="prose prose-sm max-w-none">
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-xs sm:text-sm break-words">
                {event.description}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex-shrink-0 flex justify-end pt-3 sm:pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDescriptionModal;
