import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface Event {
  id: string;
  title: string;
  description?: string;
  category: string;
  location: string;
  start_date: string;
  end_date: string;
  max_attendees: number;
  points_reward?: number;
  registration_fee?: number;
  status?: string;
  is_featured?: boolean;
  created_by?: string;
  image_url?: string;
}

export interface EventRegistration {
  id: string;
  event_id: string;
  user_id: string;
  registration_date: string;
  status?: string;
  checked_in?: boolean;
  check_in_time?: string;
  qr_code?: string;
}

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
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
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error('Error fetching registrations:', error);
    }
  };

  const registerForEvent = async (eventId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to register for events.",
        variant: "destructive"
      });
      return false;
    }

    // Check if already registered
    const existingRegistration = registrations.find(reg => reg.event_id === eventId);
    if (existingRegistration) {
      toast({
        title: "Already Registered",
        description: "You are already registered for this event.",
        variant: "destructive"
      });
      return false;
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
      
      await fetchUserRegistrations();
      return true;
    } catch (error: any) {
      console.error('Error registering for event:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "Failed to register for event. Please try again.",
        variant: "destructive"
      });
      return false;
    }
  };

  const isRegisteredForEvent = (eventId: string) => {
    return registrations.some(reg => reg.event_id === eventId);
  };

  const getUserEvents = () => {
    return events.filter(event => 
      registrations.some(reg => reg.event_id === event.id)
    );
  };

  return {
    events,
    registrations,
    loading,
    registerForEvent,
    isRegisteredForEvent,
    getUserEvents,
    refetchEvents: fetchEvents,
    refetchRegistrations: fetchUserRegistrations
  };
};