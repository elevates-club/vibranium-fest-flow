import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, Users, GraduationCap, IndianRupee } from 'lucide-react';

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
    department?: string;
    registrationFee?: number;
  } | null;
}

const EventDescriptionModal = ({ isOpen, onClose, event }: EventDescriptionModalProps) => {
  if (!event) return null;

  const getDepartmentDisplayName = (dept?: string) => {
    if (!dept) return undefined;
    const map: Record<string, string> = {
      'all': 'All Departments',
      'computer-science': 'Computer Science',
      'electronics': 'Electronics',
      'mechanical': 'Mechanical',
      'civil': 'Civil',
      'safety-fire': 'Safety & Fire Engineering',
    };
    return map[dept] || dept;
  };

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
            {Number(event.registrationFee || 0) > 0 && (
              <div className="flex items-start sm:items-center text-xs sm:text-sm">
                <IndianRupee className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0">
                  <span className="font-medium">Registration Fee:</span>
                  <span className="ml-2 break-words">{event.registrationFee}</span>
                </div>
              </div>
            )}
            <div className="flex items-start sm:items-center text-xs sm:text-sm sm:col-span-2">
              <MapPin className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <span className="font-medium">Location:</span>
                <span className="ml-2 break-words">{event.location}</span>
              </div>
            </div>
            <div className="flex items-start sm:items-center text-xs sm:text-sm">
              <Users className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
              <div className="min-w-0">
                <span className="font-medium">Capacity:</span>
                <span className="ml-2">{event.attendees}/{event.maxAttendees} registered</span>
              </div>
            </div>
            {getDepartmentDisplayName(event.department) && (
              <div className="flex items-start sm:items-center text-xs sm:text-sm">
                <GraduationCap className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5 sm:mt-0" />
                <div className="min-w-0">
                  <span className="font-medium">Department:</span>
                  <span className="ml-2 break-words">{getDepartmentDisplayName(event.department)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2 sm:space-y-3">
            <h3 className="text-base sm:text-lg font-semibold">Event Description</h3>
            <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed text-xs sm:text-sm break-words">
              <div
                className="[&_p]:mb-2 [&_ul]:list-disc [&_ol]:list-decimal [&_li]:ml-5 [&_h1]:text-xl [&_h2]:text-lg"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(event.description) }}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EventDescriptionModal;
