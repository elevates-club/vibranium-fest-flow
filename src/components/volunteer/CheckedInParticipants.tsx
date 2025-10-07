import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trash2, Users, Clock, MapPin, User } from 'lucide-react';
import { format } from 'date-fns';

interface CheckedInParticipant {
  id: string;
  user_id: string;
  check_in_time: string;
  zone?: string;
  notes?: string;
  qr_code: string;
  profile: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
  };
}

interface Event {
  id: string;
  title: string;
  start_date: string;
  location: string;
}

export default function CheckedInParticipants() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>('');
  const [participants, setParticipants] = useState<CheckedInParticipant[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  useEffect(() => {
    if (selectedEvent) {
      fetchCheckedInParticipants();
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    if (!user) {
      console.error('No user found');
      return;
    }

    try {
      // Get all events for now - this will be filtered by the volunteer's assignments
      // TODO: Implement proper volunteer assignment filtering when types are updated
      const { data: allEvents, error: eventsError } = await supabase
        .from('events')
        .select('id, title, start_date, location')
        .order('start_date', { ascending: false });

      if (eventsError) throw eventsError;

      setEvents(allEvents || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({
        title: "Error",
        description: "Failed to load events",
        variant: "destructive"
      });
    }
  };

  const fetchCheckedInParticipants = async () => {
    if (!selectedEvent) return;

    setLoading(true);
    try {
      // First, get the check-in logs
      const { data: checkInLogs, error: logsError } = await supabase
        .from('check_in_logs')
        .select(`
          id,
          user_id,
          check_in_time,
          zone,
          notes,
          qr_code
        `)
        .eq('event_id', selectedEvent)
        .order('check_in_time', { ascending: false });

      if (logsError) throw logsError;

      if (!checkInLogs || checkInLogs.length === 0) {
        setParticipants([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(checkInLogs.map(log => log.user_id))];

      // Fetch profiles for these users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      // Create a map of user_id to profile for quick lookup
      const profileMap = new Map();
      (profiles || []).forEach(profile => {
        profileMap.set(profile.user_id, profile);
      });

      // Map check-in logs to participants with profile data
      const mappedParticipants: CheckedInParticipant[] = checkInLogs.map((log: any) => {
        const profile = profileMap.get(log.user_id) || {};
        return {
          id: log.id,
          user_id: log.user_id,
          check_in_time: log.check_in_time,
          zone: log.zone,
          notes: log.notes,
          qr_code: log.qr_code,
          profile: {
            first_name: profile.first_name,
            last_name: profile.last_name,
            email: profile.email,
            phone: profile.phone,
          }
        };
      });

      setParticipants(mappedParticipants);
    } catch (error) {
      console.error('Error fetching checked-in participants:', error);
      toast({
        title: "Error",
        description: "Failed to load checked-in participants",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteParticipant = async (participantId: string) => {
    if (!confirm('Are you sure you want to remove this participant from the check-in list? This action cannot be undone.')) {
      return;
    }

    setDeleting(participantId);
    try {
      // First, get the check-in log to find the user_id and event_id
      const { data: checkInLog, error: logError } = await supabase
        .from('check_in_logs')
        .select('user_id, event_id')
        .eq('id', participantId)
        .single();

      if (logError) throw logError;

      if (!checkInLog) {
        throw new Error('Check-in log not found');
      }

      // Start a transaction-like operation
      // 1. Delete from check_in_logs
      const { error: deleteError } = await supabase
        .from('check_in_logs')
        .delete()
        .eq('id', participantId);

      if (deleteError) throw deleteError;

      // 2. Update event_registrations to reset check-in status
      console.log('Updating event registration for:', {
        user_id: checkInLog.user_id,
        event_id: checkInLog.event_id
      });

      const { data: updateData, error: updateError } = await supabase
        .from('event_registrations')
        .update({
          checked_in: false,
          check_in_time: null,
          status: 'registered' // Reset status to registered
        })
        .eq('user_id', checkInLog.user_id)
        .eq('event_id', checkInLog.event_id)
        .select(); // Add select to see what was updated

      console.log('Update result:', { updateData, updateError });

      if (updateError) {
        console.error('Failed to update event registration:', updateError);
        // Don't throw here as the main deletion was successful
        toast({
          title: "Partial Success",
          description: `Participant removed from check-in list, but failed to update registration status: ${updateError.message}`,
          variant: "destructive"
        });
      } else {
        console.log('Successfully updated event registration');
        toast({
          title: "Success",
          description: "Participant removed from check-in list and registration status reset",
        });
      }

      // Refresh the list
      fetchCheckedInParticipants();
    } catch (error) {
      console.error('Error deleting participant:', error);
      toast({
        title: "Error",
        description: "Failed to remove participant",
        variant: "destructive"
      });
    } finally {
      setDeleting(null);
    }
  };

  const getParticipantName = (participant: CheckedInParticipant) => {
    const { first_name, last_name, email } = participant.profile;
    const fullName = `${first_name || ''} ${last_name || ''}`.trim();
    return fullName || email || 'Unknown Participant';
  };

  const selectedEventData = events.find(e => e.id === selectedEvent);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6 text-primary" />
            Checked-in Participants
          </h2>
          <p className="text-muted-foreground">
            View and manage participants who have checked in to events
          </p>
        </div>
      </div>

      {/* Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Event</CardTitle>
          <CardDescription>
            Choose an event to view its checked-in participants
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an event..." />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{event.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(event.start_date), 'PPP')} • {event.location}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Participants List */}
      {selectedEvent && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedEventData?.title || 'Event'} Participants
                </CardTitle>
                <CardDescription>
                  {participants.length} participant{participants.length !== 1 ? 's' : ''} checked in
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-sm">
                {participants.length} Total
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : participants.length === 0 ? (
              <Alert>
                <Users className="h-4 w-4" />
                <AlertDescription>
                  No participants have checked in to this event yet.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {participants.map((participant) => (
                  <Card key={participant.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium text-lg">
                              {getParticipantName(participant)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>
                                Checked in: {format(new Date(participant.check_in_time), 'PPp')}
                              </span>
                            </div>
                            
                            {participant.zone && (
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span>Zone: {participant.zone}</span>
                              </div>
                            )}
                          </div>

                          {participant.profile.email && (
                            <div className="text-sm text-muted-foreground">
                              Email: {participant.profile.email}
                            </div>
                          )}

                          {participant.profile.phone && (
                            <div className="text-sm text-muted-foreground">
                              Phone: {participant.profile.phone}
                            </div>
                          )}

                          {participant.notes && (
                            <div className="text-sm text-muted-foreground border-l-2 border-primary pl-3 mt-2">
                              <strong>Notes:</strong> {participant.notes}
                            </div>
                          )}
                        </div>

                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteParticipant(participant.id)}
                          disabled={deleting === participant.id}
                          className="ml-4"
                        >
                          {deleting === participant.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
