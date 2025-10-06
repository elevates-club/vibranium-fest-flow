import React, { useState, useEffect, useCallback } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import VolunteerManagement from '@/components/organizer/VolunteerManagement';
import EventCreation from '@/components/organizer/EventCreation';
import ErrorBoundary from '@/components/ui/ErrorBoundary';
import { useEvents } from '@/hooks/useEvents';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiCall } from '@/lib/apiUtils';
import { 
  Users, 
  Calendar,
  QrCode,
  Settings,
  BarChart3,
  MessageSquare,
  UserCheck,
  Award,
  Palette,
  Download,
  Eye,
  Edit,
  Plus,
  Mail,
  Phone,
  GraduationCap,
  Clock,
  CheckCircle
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

const Organizer = () => {
  const { user, userRoles } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [recentEvents, setRecentEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRegisteredMembersDialogOpen, setIsRegisteredMembersDialogOpen] = useState(false);
  const [selectedEventForMembers, setSelectedEventForMembers] = useState<any>(null);
  const [registeredMembers, setRegisteredMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const { events } = useEvents();
  const { toast } = useToast();
  // Coordinator assignment UI state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [coordinatorSearch, setCoordinatorSearch] = useState('');
  const [allEvents, setAllEvents] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [selectedAssignEvent, setSelectedAssignEvent] = useState<any>(null);
  const [selectedAssignCoordinator, setSelectedAssignCoordinator] = useState<any>(null);

  // Analytics state
  // Overview quick stats (real data)
  const [totalEvents, setTotalEvents] = useState<number>(0);
  const [totalRegistrations, setTotalRegistrations] = useState<number>(0);
  const [totalCheckins, setTotalCheckins] = useState<number>(0);
  const [totalParticipantsOnly, setTotalParticipantsOnly] = useState<number>(0);

  // Department overview (real data)
  const [departmentOverview, setDepartmentOverview] = useState<{ name: string; participants: number }[]>([]);
  // Chart state
  const [registrationsChart, setRegistrationsChart] = useState<{ id: string; title: string; registrations: number; capacity: number; isFull: boolean }[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  // Participants tab state
  const [participants, setParticipants] = useState<any[]>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [isParticipantDialogOpen, setIsParticipantDialogOpen] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<any>(null);
  const [participantEvents, setParticipantEvents] = useState<any[]>([]);
  const [participantQuery, setParticipantQuery] = useState('');
  const [isParticipantDetailsOpen, setIsParticipantDetailsOpen] = useState(false);
  const [participantSort, setParticipantSort] = useState<'recent' | 'name' | 'department'>('recent');
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [funnel, setFunnel] = useState<{ views?: number; registrations: number; checkins: number }>({ registrations: 0, checkins: 0 });
  const [categoryBreakdown, setCategoryBreakdown] = useState<{ label: string; registrations: number }[]>([]);
  const [departmentBreakdown, setDepartmentBreakdown] = useState<{ label: string; registrations: number }[]>([]);
  const [peakHours, setPeakHours] = useState<{ hour: string; count: number }[]>([]);
  const [capacityAlerts, setCapacityAlerts] = useState<{ id: string; title: string; ratio: number; registered: number; capacity: number }[]>([]);
  const [noShowRates, setNoShowRates] = useState<{ id: string; title: string; rate: number; registrations: number; checkins: number }[]>([]);
  
  // Email tab state
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [testEmail, setTestEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [emailMessage, setEmailMessage] = useState('');

  // Load email service status from localStorage
  useEffect(() => {
    const savedEmailStatus = localStorage.getItem('emailServiceEnabled');
    if (savedEmailStatus !== null) {
      setEmailEnabled(savedEmailStatus === 'true');
    }
  }, []);

  // Load events and users with coordinator role for assignment
  useEffect(() => {
    const loadAssignData = async () => {
      try {
        const [{ data: evs }, { data: coordIds }] = await Promise.all([
          (supabase as any).from('events').select('id, title, department, start_date').order('start_date', { ascending: true }),
          (supabase as any).from('user_roles').select('user_id').eq('role', 'coordinator')
        ]);
        setAllEvents(evs || []);
        const ids = Array.from(new Set((coordIds || []).map((r: any) => r.user_id)));
        if (ids.length > 0) {
          const { data: profs } = await (supabase as any)
            .from('profiles')
            .select('user_id, first_name, last_name, email, department')
            .in('user_id', ids);
          setCoordinators(profs || []);
        } else {
          setCoordinators([]);
        }
      } catch (e) {
        console.error('Error loading assignment data', e);
      }
    };
    void loadAssignData();
  }, []);

  const fetchRecentEvents = useCallback(async () => {
    try {
      // Avoid jarring page-level loading if we already have something to show
      if (recentEvents.length === 0) setLoading(true);
      
      // Check if events array exists and is not empty
      if (!events || events.length === 0) {
        setRecentEvents([]);
        return;
      }

      // Get events with registration counts
      const eventsWithStats = await Promise.all(
        events.map(async (event) => {
          try {
            // Use the security definer function for registration count
            const { data: registrationCount } = await supabase
              .rpc('get_event_registration_count', { event_id_param: event.id });

            // For check-ins, we still need to query directly since we need the checked_in field
          const { data: checkins } = await supabase
            .from('event_registrations')
            .select('*')
            .eq('event_id', event.id)
            .eq('checked_in', true);

          return {
            id: event.id,
              title: event.title || 'Untitled Event',
              registrations: registrationCount || 0,
            checkins: checkins?.length || 0,
              status: event.end_date 
                ? (new Date(event.end_date) < new Date() ? 'completed' : 
                   new Date(event.start_date) <= new Date() ? 'ongoing' : 'upcoming')
                : (new Date(event.start_date) <= new Date() ? 'ongoing' : 'upcoming'),
            qrCustomized: false // Would need to track this in database
          };
          } catch (error) {
            console.error('Error fetching stats for event:', event.id, error);
            return {
              id: event.id,
              title: event.title || 'Untitled Event',
              registrations: 0,
              checkins: 0,
              status: 'upcoming',
              qrCustomized: false
            };
          }
        })
      );

      setRecentEvents(eventsWithStats.slice(0, 5)); // Show only recent 5

      // Set quick stats
      setTotalEvents(events.length);
      const regSum = eventsWithStats.reduce((acc, e: any) => acc + (e.registrations || 0), 0);
      const checkSum = eventsWithStats.reduce((acc, e: any) => acc + (e.checkins || 0), 0);
      setTotalRegistrations(regSum);
      setTotalCheckins(checkSum);
    } catch (error) {
      console.error('Error fetching recent events:', error);
      toast({
        title: "Error",
        description: "Failed to load recent events data.",
        variant: "destructive"
      });
      setRecentEvents([]);
    } finally {
      setLoading(false);
    }
  }, [events, toast]);

  useEffect(() => {
    fetchRecentEvents();
  }, [fetchRecentEvents]);

  // Removed tab persistence and visibility throttling per request

  // After analytics function is defined, a later effect will preload it

  const fetchRegisteredMembers = async (eventId: string) => {
    setMembersLoading(true);
    try {
      // First, get the registrations
      const { data: registrations, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('event_id', eventId)
        .order('registration_date', { ascending: false });

      if (registrationsError) {
        console.error('Error fetching registrations:', registrationsError);
        toast({
          title: "Error",
          description: "Failed to fetch registrations.",
          variant: "destructive"
        });
        return;
      }

      if (!registrations || registrations.length === 0) {
        setRegisteredMembers([]);
        return;
      }

      // Then, get the user profiles for all registered users
      const userIds = registrations.map(reg => reg.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone, department, year, college')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        toast({
          title: "Error",
          description: "Failed to fetch user profiles.",
          variant: "destructive"
        });
        return;
      }

      // Combine registrations with profile data
      const membersWithProfiles = registrations.map(registration => {
        const profile = profiles?.find(p => p.user_id === registration.user_id);
        return {
          ...registration,
          profiles: profile || null
        };
      });

      setRegisteredMembers(membersWithProfiles);
    } catch (error) {
      console.error('Error fetching registered members:', error);
      toast({
        title: "Error",
        description: "Failed to fetch registered members.",
        variant: "destructive"
      });
    } finally {
      setMembersLoading(false);
    }
  };

  const handleViewRegisteredMembers = (event: any) => {
    setSelectedEventForMembers(event);
    setIsRegisteredMembersDialogOpen(true);
    fetchRegisteredMembers(event.id);
  };

  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);

      // Fetch all registrations for current events
      const { data: registrations, error: regErr } = await supabase
        .from('event_registrations')
        .select('event_id, registration_date, checked_in');
      if (regErr) throw regErr;

      // Build event map
      const eventMap = new Map<string, any>();
      (events || []).forEach(e => eventMap.set(e.id, e));

      // Funnel (include views)
      const totalRegistrations = registrations?.length || 0;
      const totalCheckins = registrations?.filter(r => r.checked_in)?.length || 0;
      // Query event views count
      const { count: viewsCount, error: viewsErr } = await (supabase as any)
        .from('event_views')
        .select('*', { count: 'exact', head: true });
      if (viewsErr) setFunnel({ registrations: totalRegistrations, checkins: totalCheckins });
      else setFunnel({ views: viewsCount || 0, registrations: totalRegistrations, checkins: totalCheckins });

      // Category breakdown
      const catCount = new Map<string, number>();
      registrations?.forEach(r => {
        const ev = eventMap.get(r.event_id);
        const key = ev?.category || 'Uncategorized';
        catCount.set(key, (catCount.get(key) || 0) + 1);
      });
      setCategoryBreakdown(Array.from(catCount.entries()).map(([label, registrations]) => ({ label, registrations })));

      // Department breakdown
      const deptCount = new Map<string, number>();
      registrations?.forEach(r => {
        const ev = eventMap.get(r.event_id);
        const key = ev?.department || 'All Departments';
        deptCount.set(key, (deptCount.get(key) || 0) + 1);
      });
      setDepartmentBreakdown(Array.from(deptCount.entries()).map(([label, registrations]) => ({ label, registrations })));

      // Peak registration hours (local time hour)
      const hourCount = new Map<string, number>();
      registrations?.forEach(r => {
        const d = new Date(r.registration_date);
        const hour = d.toLocaleTimeString([], { hour: '2-digit', hour12: true });
        hourCount.set(hour, (hourCount.get(hour) || 0) + 1);
      });
      const peak = Array.from(hourCount.entries()).map(([hour, count]) => ({ hour, count }))
        .sort((a, b) => b.count - a.count).slice(0, 6);
      setPeakHours(peak);

      // Capacity alerts (>= 80%)
      const alerts: { id: string; title: string; ratio: number; registered: number; capacity: number }[] = [];
      const regPerEvent = new Map<string, number>();
      registrations?.forEach(r => regPerEvent.set(r.event_id, (regPerEvent.get(r.event_id) || 0) + 1));
      (events || []).forEach(ev => {
        const reg = regPerEvent.get(ev.id) || 0;
        const capacity = ev.max_attendees || 0;
        if (capacity > 0) {
          const ratio = reg / capacity;
          if (ratio >= 0.8) alerts.push({ id: ev.id, title: ev.title || 'Untitled Event', ratio, registered: reg, capacity });
        }
      });
      setCapacityAlerts(alerts.sort((a, b) => b.ratio - a.ratio));

      // No-show rate for completed events
      const noShows: { id: string; title: string; rate: number; registrations: number; checkins: number }[] = [];
      (events || []).forEach(ev => {
        const isCompleted = ev.end_date ? new Date(ev.end_date) < new Date() : new Date(ev.start_date) < new Date();
        if (!isCompleted) return;
        const reg = regPerEvent.get(ev.id) || 0;
        const checked = registrations?.filter(r => r.event_id === ev.id && r.checked_in)?.length || 0;
        if (reg > 0) {
          const rate = Math.max(0, (reg - checked) / reg);
          noShows.push({ id: ev.id, title: ev.title || 'Untitled Event', rate, registrations: reg, checkins: checked });
        }
      });
      setNoShowRates(noShows.sort((a, b) => b.rate - a.rate).slice(0, 10));
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({ title: 'Error', description: 'Failed to load analytics.', variant: 'destructive' });
    } finally {
      setAnalyticsLoading(false);
    }
  }, [events, toast]);

  // Preload analytics when tab switches to analytics (after function is defined)
  useEffect(() => {
    if (activeTab === 'analytics') {
      void fetchAnalytics();
    }
  }, [activeTab, fetchAnalytics]);

  // Fetch count of users with role 'participant'
  useEffect(() => {
    const loadParticipantsCount = async () => {
      try {
        // Get all user_ids that have participant role
        const { data: partRows, error: partErr } = await (supabase as any)
          .from('user_roles')
          .select('user_id')
          .eq('role', 'participant');
        if (partErr) throw partErr;
        const participantIds: string[] = (partRows || []).map((r: any) => r.user_id);
        // Get any user_ids that also have another role
        const { data: otherRows, error: otherErr } = await (supabase as any)
          .from('user_roles')
          .select('user_id')
          .neq('role', 'participant');
        if (otherErr) throw otherErr;
        const excluded = new Set((otherRows || []).map((r: any) => r.user_id));
        const unique = Array.from(new Set(participantIds)).filter((id) => !excluded.has(id));
        if (unique.length === 0) {
          setTotalParticipantsOnly(0);
          return;
        }
        // Count only participants that also have a profile
        const { data: profs, error: profErr } = await (supabase as any)
          .from('profiles')
          .select('user_id')
          .in('user_id', unique);
        if (profErr) throw profErr;
        setTotalParticipantsOnly((profs || []).length);
      } catch (e) {
        console.error('Error loading participants count', e);
      }
    };
    void loadParticipantsCount();
  }, []);

  // Build registrations per event dataset for chart
  useEffect(() => {
    const buildChart = async () => {
      try {
        if (!events || events.length === 0) {
          setRegistrationsChart([]);
          return;
        }
        setChartLoading(true);
        const items: { id: string; title: string; registrations: number; capacity: number; isFull: boolean }[] = [];
        for (const ev of events) {
          const { data: countData } = await supabase.rpc('get_event_registration_count', { event_id_param: ev.id });
          const reg = countData || 0;
          const capacity = ev.max_attendees || 0;
          items.push({
            id: ev.id,
            title: ev.title || 'Untitled',
            registrations: reg,
            capacity,
            isFull: capacity > 0 ? reg >= capacity : false,
          });
        }
        setRegistrationsChart(items);
      } finally {
        setChartLoading(false);
      }
    };
    void buildChart();
  }, [events]);

  // Department overview (participants per department)
  useEffect(() => {
    const loadDept = async () => {
      try {
        const { data, error } = await supabase
          .from('event_registrations')
          .select('event_id, events(department)');
        if (error) throw error;
        const counts = new Map<string, number>();
        (data || []).forEach((r: any) => {
          const dept = r.events?.department || 'Unknown';
          counts.set(dept, (counts.get(dept) || 0) + 1);
        });
        const list = Array.from(counts.entries()).map(([name, participants]) => ({ name, participants }));
        setDepartmentOverview(list);
      } catch (e) {
        console.error('Error loading department overview', e);
      }
    };
    void loadDept();
  }, []);

  // Load participants when switching to participants tab
  useEffect(() => {
    const load = async () => {
      if (activeTab !== 'participants') return;
      setParticipantsLoading(true);
      try {
        // Step 1: get user_ids with role 'participant'
        const { data: roleRows, error: roleErr } = await (supabase as any)
          .from('user_roles')
          .select('user_id')
          .eq('role', 'participant');
        if (roleErr) throw roleErr;
        const participantIds: string[] = (roleRows || []).map((r: any) => r.user_id).filter(Boolean);
        // Exclude any user_ids that also have a non-participant role
        const { data: otherRoleRows, error: otherErr } = await (supabase as any)
          .from('user_roles')
          .select('user_id')
          .neq('role', 'participant');
        if (otherErr) throw otherErr;
        const excluded = new Set((otherRoleRows || []).map((r: any) => r.user_id));
        const ids = participantIds.filter((id) => !excluded.has(id));
        if (ids.length === 0) {
          setParticipants([]);
          return;
        }
        // Step 2: fetch profiles for those ids
        const { data: profiles, error: profErr } = await (supabase as any)
          .from('profiles')
          .select('user_id, first_name, last_name, email, phone, department, year, college, created_at, participant_id')
          .in('user_id', ids);
        if (profErr) throw profErr;
        setParticipants(profiles || []);
      } catch (e) {
        console.error('Error loading participants', e);
        toast({ title: 'Error', description: 'Failed to load participants.', variant: 'destructive' });
      } finally {
        setParticipantsLoading(false);
      }
    };
    void load();
  }, [activeTab, toast]);

  const openParticipant = async (participant: any) => {
    setSelectedParticipant(participant);
    setIsParticipantDialogOpen(true);
    try {
      const { data, error } = await supabase
        .from('event_registrations')
        .select('registration_date, checked_in, events(* )')
        .eq('user_id', participant.user_id)
        .order('registration_date', { ascending: false });
      if (error) throw error;
      setParticipantEvents(data || []);
    } catch (e) {
      console.error('Error loading participant events', e);
      toast({ title: 'Error', description: 'Failed to load participant events.', variant: 'destructive' });
    }
  };

  // Email functions
  const testEmailConnection = async () => {
    setEmailLoading(true);
    setEmailStatus('idle');
    setEmailMessage('');
    
    try {
      const response = await apiCall('/api/test-email', {
        method: 'POST',
        body: JSON.stringify({
          action: 'test-connection'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setEmailStatus('success');
        setEmailMessage('Gmail SMTP connection is working correctly!');
        toast({
          title: "Email Service Ready",
          description: "Gmail SMTP connection verified successfully.",
        });
      } else {
        setEmailStatus('error');
        setEmailMessage(result.error || 'Connection test failed');
        toast({
          title: "Email Connection Failed",
          description: result.error || 'Failed to connect to Gmail SMTP',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setEmailStatus('error');
      setEmailMessage('Network error: ' + error.message);
      toast({
        title: "Email Test Failed",
        description: "Failed to test email connection",
        variant: "destructive",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter a test email address",
        variant: "destructive",
      });
      return;
    }

    setEmailLoading(true);
    setEmailStatus('idle');
    setEmailMessage('');
    
    try {
      const response = await apiCall('/api/test-email', {
        method: 'POST',
        body: JSON.stringify({
          action: 'send-test-email',
          testEmail: testEmail.trim()
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setEmailStatus('success');
        setEmailMessage(`Test email sent successfully to ${testEmail}!`);
        toast({
          title: "Test Email Sent",
          description: `Check ${testEmail} for the test email`,
        });
      } else {
        setEmailStatus('error');
        setEmailMessage(result.error || 'Failed to send test email');
        toast({
          title: "Email Send Failed",
          description: result.error || 'Failed to send test email',
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setEmailStatus('error');
      setEmailMessage('Network error: ' + error.message);
      toast({
        title: "Email Test Failed",
        description: "Failed to send test email",
        variant: "destructive",
      });
    } finally {
      setEmailLoading(false);
    }
  };

  const toggleEmailService = () => {
    const newStatus = !emailEnabled;
    setEmailEnabled(newStatus);
    
    // Store in localStorage for persistence
    localStorage.setItem('emailServiceEnabled', newStatus.toString());
    
    toast({
      title: newStatus ? "Email Service Enabled" : "Email Service Disabled",
      description: newStatus 
        ? "Registration emails will be sent to users" 
        : "Registration emails will not be sent",
    });
  };

  const departments: any[] = [];

  return (
    <ErrorBoundary>
      <div className="bg-background">
      <Navigation />
      
        <div className="pt-16 sm:pt-20 pb-12 sm:pb-16">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          {/* Header + Quick Actions (merged dashboard area) */}
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-2 sm:space-y-0">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                  Welcome back, <span className="text-primary">{user?.email?.split('@')[0] || 'Organizer'}</span>!
            </h1>
                <span className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-3 py-1 bg-muted rounded-full w-fit">
                  {userRoles.includes('admin') ? 'Admin' : 'Organizer'}
                </span>
              </div>
              <p className="text-sm sm:text-base text-muted-foreground">
                Organizer Dashboard – Create and manage events
            </p>
          </div>

            {/* Quick Actions */}
            <div className="mb-6 sm:mb-8">
              <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Button onClick={() => setActiveTab('events')} variant="hero" className="h-16 sm:h-20">
                <Calendar className="w-5 h-5 mr-2" />
                Manage Events
              </Button>
              <Button onClick={() => setActiveTab('volunteers')} variant="outline" className="h-16 sm:h-20">
                <Users className="w-5 h-5 mr-2" />
                Manage Volunteers
              </Button>
              <Button onClick={() => setActiveTab('analytics')} variant="outline" className="h-16 sm:h-20">
                <BarChart3 className="w-5 h-5 mr-2" />
                View Analytics
              </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 gap-1 sm:gap-2 h-auto">
              <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 px-2 sm:px-3">
                <span className="hidden sm:inline">Overview</span>
                <span className="sm:hidden">Overview</span>
              </TabsTrigger>
              <TabsTrigger value="events" className="text-xs sm:text-sm py-2 px-2 sm:px-3">
                <span className="hidden sm:inline">Events</span>
                <span className="sm:hidden">Events</span>
              </TabsTrigger>
              <TabsTrigger value="participants" className="text-xs sm:text-sm py-2 px-2 sm:px-3">
                <span className="hidden sm:inline">Participants</span>
                <span className="sm:hidden">Users</span>
              </TabsTrigger>
              <TabsTrigger value="email" className="text-xs sm:text-sm py-2 px-2 sm:px-3">
                <span className="hidden sm:inline">Email</span>
                <span className="sm:hidden">Mail</span>
              </TabsTrigger>
              <TabsTrigger value="qr-management" className="text-xs sm:text-sm py-2 px-2 sm:px-3">
                <span className="hidden sm:inline">QR Codes</span>
                <span className="sm:hidden">QR</span>
              </TabsTrigger>
              <TabsTrigger value="volunteers" className="text-xs sm:text-sm py-2 px-2 sm:px-3">
                <span className="hidden sm:inline">Volunteers</span>
                <span className="sm:hidden">Vol</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2 px-2 sm:px-3">
                <span className="hidden sm:inline">Analytics</span>
                <span className="sm:hidden">Stats</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="participants">
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl flex items-center justify-between">
                    <span>Participants</span>
                    <span className="text-sm text-muted-foreground">Total: {participants.length}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  {participantsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading participants...</div>
                  ) : participants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No participants found</div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        <input
                          value={participantQuery}
                          onChange={(e) => setParticipantQuery(e.target.value)}
                          placeholder="Search by name, email or department"
                          className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm"
                        />
                        <select
                          value={participantSort}
                          onChange={(e) => setParticipantSort(e.target.value as any)}
                          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                        >
                          <option value="recent">Recently added</option>
                          <option value="name">Name (A–Z)</option>
                          <option value="department">Department (A–Z)</option>
                        </select>
                      </div>
                      {participants
                        .filter((p) => {
                          const q = participantQuery.toLowerCase().trim();
                          if (!q) return true;
                          const name = `${p.first_name || ''} ${p.last_name || ''}`.toLowerCase();
                          return (
                            name.includes(q) ||
                            (p.email || '').toLowerCase().includes(q) ||
                            (p.department || '').toLowerCase().includes(q)
                          );
                        })
                        .sort((a, b) => {
                          if (participantSort === 'recent') {
                            const ad = a.created_at ? new Date(a.created_at).getTime() : 0;
                            const bd = b.created_at ? new Date(b.created_at).getTime() : 0;
                            return bd - ad;
                          }
                          if (participantSort === 'name') {
                            const an = `${a.first_name || ''} ${a.last_name || ''}`.trim().toLowerCase();
                            const bn = `${b.first_name || ''} ${b.last_name || ''}`.trim().toLowerCase();
                            return an.localeCompare(bn);
                          }
                          const ad = (a.department || '').toLowerCase();
                          const bd = (b.department || '').toLowerCase();
                          return ad.localeCompare(bd);
                        })
                        .map((p) => (
                          <div key={p.user_id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gradient-subtle rounded-lg border border-border">
                            <div className="min-w-0">
                              <div className="font-medium text-sm sm:text-base truncate">{(p.first_name || '') + ' ' + (p.last_name || '') || p.email}</div>
                              <div className="text-xs sm:text-sm text-muted-foreground truncate">{p.email}</div>
                              <div className="text-xs text-muted-foreground truncate">{p.department || 'Department not set'}</div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Button size="sm" variant="outline" onClick={() => { setSelectedParticipant(p); setIsParticipantDetailsOpen(true); }}>View Details</Button>
                              <Button size="sm" variant="outline" onClick={() => openParticipant(p)}>View Events</Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="email">
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="text-lg sm:text-xl flex items-center justify-between">
                    <div className="flex items-center">
                      <Mail className="w-5 h-5 mr-2" />
                      Email Service Management
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        emailEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {emailEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6 space-y-6">
                  {/* Email Service Toggle */}
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                    <div>
                      <h3 className="font-medium">Email Service Status</h3>
                      <p className="text-sm text-muted-foreground">
                        {emailEnabled 
                          ? 'Registration emails will be sent to users' 
                          : 'Registration emails are disabled'
                        }
                      </p>
                    </div>
                    <Button
                      onClick={toggleEmailService}
                      variant={emailEnabled ? "destructive" : "default"}
                      size="sm"
                    >
                      {emailEnabled ? 'Disable' : 'Enable'} Email Service
                    </Button>
                  </div>

                  {/* Test Email Connection */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Test Email Connection
                    </h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={testEmailConnection}
                        disabled={emailLoading}
                        variant="outline"
                        className="flex-1 sm:flex-none"
                      >
                        {emailLoading ? 'Testing...' : 'Test Gmail Connection'}
                      </Button>
                      {emailStatus !== 'idle' && (
                        <div className={`flex-1 p-3 rounded-lg text-sm ${
                          emailStatus === 'success' 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          <div className="flex items-center">
                            {emailStatus === 'success' ? (
                              <CheckCircle className="w-4 h-4 mr-2" />
                            ) : (
                              <Settings className="w-4 h-4 mr-2" />
                            )}
                            {emailMessage}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Send Test Email */}
                  <div className="space-y-4">
                    <h3 className="font-medium flex items-center">
                      <Mail className="w-4 h-4 mr-2" />
                      Send Test Email
                    </h3>
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-3">
                        <Input
                          type="email"
                          placeholder="Enter test email address"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={sendTestEmail}
                          disabled={emailLoading || !testEmail.trim()}
                          className="sm:w-auto"
                        >
                          {emailLoading ? 'Sending...' : 'Send Test Email'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Enter an email address to test the email service functionality
                      </p>
                    </div>
                  </div>

                  {/* Email Configuration Info */}
                  <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Email Configuration</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p><strong>SMTP Host:</strong> smtp.gmail.com</p>
                      <p><strong>Port:</strong> 587 (STARTTLS)</p>
                      <p><strong>Authentication:</strong> Gmail App Password</p>
                      <p><strong>Daily Limit:</strong> 500 emails (Gmail free)</p>
                    </div>
                  </div>

                  {/* Email Service Features */}
                  <div className="space-y-3">
                    <h3 className="font-medium">Email Service Features</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm mb-1">Registration Confirmations</h4>
                        <p className="text-xs text-muted-foreground">
                          Automatic emails sent when users register for events
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm mb-1">QR Code Attachments</h4>
                        <p className="text-xs text-muted-foreground">
                          Digital passes with QR codes attached to emails
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm mb-1">Event Details</h4>
                        <p className="text-xs text-muted-foreground">
                          Complete event information in email templates
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <h4 className="font-medium text-sm mb-1">Professional Design</h4>
                        <p className="text-xs text-muted-foreground">
                          Branded HTML email templates with responsive design
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="overview">
              <div className="space-y-4 sm:space-y-6">
                {/* Quick Stats (real data) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-1 sm:mb-2" />
                      <div className="text-lg sm:text-2xl font-bold text-foreground">{totalEvents}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Total Events</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-secondary mx-auto mb-1 sm:mb-2" />
                      <div className="text-lg sm:text-2xl font-bold text-foreground">{totalRegistrations}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Registrations</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 text-accent mx-auto mb-1 sm:mb-2" />
                      <div className="text-lg sm:text-2xl font-bold text-foreground">{totalRegistrations > 0 ? Math.round((totalCheckins/totalRegistrations)*100) : 0}%</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Check-in Rate</div>
                    </CardContent>
                  </Card>
                  <Card className="bg-gradient-card border-border">
                    <CardContent className="p-3 sm:p-4 text-center">
                      <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary mx-auto mb-1 sm:mb-2" />
                      <div className="text-lg sm:text-2xl font-bold text-foreground">{totalParticipantsOnly}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">Participants</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Registrations by Event */}
                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">Registrations by Event</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    {chartLoading ? (
                      <div className="text-center py-6 text-muted-foreground">Loading chart...</div>
                    ) : registrationsChart.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">No events to display</div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                        <div className="col-span-1 lg:col-span-2 h-[260px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Tooltip />
                              <Pie data={registrationsChart} dataKey="registrations" nameKey="title" innerRadius={50} outerRadius={100} paddingAngle={2}>
                                {registrationsChart.map((entry, index) => (
                                  <Cell key={`cell-${entry.id}`} fill={["#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6", "#a78bfa"][index % 7]} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        <div className="space-y-2">
                          {registrationsChart.map((e) => (
                            <div key={e.id} className="flex items-center justify-between text-sm">
                              <span className="truncate pr-2">{e.title}</span>
                              <span className="text-muted-foreground">{e.registrations}{e.capacity ? ` / ${e.capacity}` : ''}{e.isFull ? ' • Full' : ''}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Events */}
                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">Recent Events</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <div className="space-y-3 sm:space-y-4">
                      {recentEvents.map((event) => (
                        <div key={event.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-subtle rounded-lg border border-border gap-3 sm:gap-4">
                          <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                            <div className="flex items-center space-x-2 min-w-0 flex-1">
                              <QrCode className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${event.qrCustomized ? 'text-primary' : 'text-muted-foreground'}`} />
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-foreground text-sm sm:text-base truncate">{event.title}</div>
                                <div className="text-xs sm:text-sm text-muted-foreground">
                                  {event.registrations} registrations • {event.checkins} check-ins
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center justify-between sm:justify-end space-x-2 sm:space-x-3">
                            <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                              event.status === 'ongoing' ? 'bg-primary text-primary-foreground' : 
                              event.status === 'upcoming' ? 'bg-secondary text-secondary-foreground' : 
                              'bg-muted text-muted-foreground'
                            }`}>
                              {event.status}
                            </span>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleViewRegisteredMembers(event)}
                              title="View Registered Members"
                              className="h-8 w-8 p-0"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Department Overview (real data) */}
                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">Department Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    <div className="space-y-3 sm:space-y-4">
                      {departmentOverview.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">No data</div>
                      ) : (
                        departmentOverview.map((dept) => (
                          <div key={dept.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-gradient-subtle rounded-lg border border-border gap-3 sm:gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-foreground text-sm sm:text-base truncate">{dept.name}</div>
                          </div>
                            <div className="flex items-center justify-between sm:justify-end space-x-6 text-xs sm:text-sm">
                            <div className="text-center">
                                <div className="font-bold text-secondary text-sm sm:text-base">{dept.participants}</div>
                              <div className="text-muted-foreground">Participants</div>
                            </div>
                          </div>
                        </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="events">
              <EventCreation allowAllDepartments />
            </TabsContent>

            <TabsContent value="qr-management">
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex items-center text-lg sm:text-xl">
                    <QrCode className="w-5 h-5 mr-2" />
                    QR Code Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="space-y-4 sm:space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                      <Card className="bg-gradient-subtle border-border">
                        <CardContent className="p-4 sm:p-6 text-center">
                          <Palette className="w-6 h-6 sm:w-8 sm:h-8 text-primary mx-auto mb-2 sm:mb-3" />
                          <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">Custom Design</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                            Design unique QR codes for each event with custom colors and logos
                          </p>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            <Edit className="w-4 h-4 mr-2" />
                            Customize
                          </Button>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-subtle border-border">
                        <CardContent className="p-4 sm:p-6 text-center">
                          <Download className="w-6 h-6 sm:w-8 sm:h-8 text-secondary mx-auto mb-2 sm:mb-3" />
                          <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">Bulk Generate</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                            Generate QR codes for all participants at once
                          </p>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            <Download className="w-4 h-4 mr-2" />
                            Generate
                          </Button>
                        </CardContent>
                      </Card>
                      <Card className="bg-gradient-subtle border-border">
                        <CardContent className="p-4 sm:p-6 text-center">
                          <Settings className="w-6 h-6 sm:w-8 sm:h-8 text-accent mx-auto mb-2 sm:mb-3" />
                          <h3 className="font-semibold text-sm sm:text-base mb-1 sm:mb-2">Security Settings</h3>
                          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                            Configure dynamic QR codes and anti-fraud measures
                          </p>
                          <Button variant="outline" size="sm" className="w-full sm:w-auto">
                            <Settings className="w-4 h-4 mr-2" />
                            Configure
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="text-center py-8 text-muted-foreground">
                      QR code customization tools will be integrated here
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="volunteers">
              <VolunteerManagement />
            </TabsContent>

            <TabsContent value="analytics">
              <div className="space-y-4">
                {/* Funnel */}
              <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="flex items-center text-lg sm:text-xl">
                    <BarChart3 className="w-5 h-5 mr-2" />
                      Event Funnel
                  </CardTitle>
                </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    {analyticsLoading ? (
                      <div className="text-center py-6 text-muted-foreground">Loading analytics...</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-4 rounded-lg bg-gradient-subtle border border-border">
                          <div className="text-xs text-muted-foreground mb-1">Views</div>
                          <div className="text-2xl font-bold">{funnel.views ?? '—'}</div>
                  </div>
                        <div className="p-4 rounded-lg bg-gradient-subtle border border-border">
                          <div className="text-xs text-muted-foreground mb-1">Registrations</div>
                          <div className="text-2xl font-bold">{funnel.registrations}</div>
                        </div>
                        <div className="p-4 rounded-lg bg-gradient-subtle border border-border">
                          <div className="text-xs text-muted-foreground mb-1">Check-ins</div>
                          <div className="text-2xl font-bold">{funnel.checkins}</div>
                        </div>
                      </div>
                    )}
                </CardContent>
              </Card>

                {/* Breakdowns */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-lg sm:text-xl">By Category</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6">
                      {categoryBreakdown.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">No data</div>
                      ) : (
                        <div className="space-y-2">
                          {categoryBreakdown.map((c) => (
                            <div key={c.label} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{c.label}</span>
                              <span className="font-medium">{c.registrations}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-lg sm:text-xl">By Department</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6">
                      {departmentBreakdown.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">No data</div>
                      ) : (
                        <div className="space-y-2">
                          {departmentBreakdown.map((d) => (
                            <div key={d.label} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{d.label}</span>
                              <span className="font-medium">{d.registrations}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Peak hours and capacity alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-lg sm:text-xl">Peak Registration Times</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6">
                      {peakHours.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">No data</div>
                      ) : (
                        <div className="space-y-2">
                          {peakHours.map(h => (
                            <div key={h.hour} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">{h.hour}</span>
                              <span className="font-medium">{h.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="p-3 sm:p-6">
                      <CardTitle className="text-lg sm:text-xl">Capacity Alerts (≥ 80%)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-6">
                      {capacityAlerts.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">No events near capacity</div>
                      ) : (
                        <div className="space-y-2">
                          {capacityAlerts.map(a => (
                            <div key={a.id} className="flex items-center justify-between text-sm">
                              <span className="truncate pr-2">{a.title}</span>
                              <span className="font-medium">{a.registered}/{a.capacity} ({Math.round(a.ratio*100)}%)</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* No-show rates */}
                <Card>
                  <CardHeader className="p-3 sm:p-6">
                    <CardTitle className="text-lg sm:text-xl">Top No-show Rates (Completed Events)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6">
                    {noShowRates.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">No completed events with registrations</div>
                    ) : (
                      <div className="space-y-2">
                        {noShowRates.map(n => (
                          <div key={n.id} className="flex items-center justify-between text-sm">
                            <span className="truncate pr-2">{n.title}</span>
                            <span className="font-medium">{Math.round(n.rate*100)}% (\
{n.checkins}/{n.registrations} checked-in)</span>
                          </div>
                        ))}
                  </div>
                    )}
                </CardContent>
              </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Registered Members Dialog */}
      <Dialog open={isRegisteredMembersDialogOpen} onOpenChange={setIsRegisteredMembersDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Registered Members - {selectedEventForMembers?.title}
            </DialogTitle>
            <DialogDescription>
              View all registered participants for this event
            </DialogDescription>
          </DialogHeader>
          
          <div className="overflow-y-auto max-h-[60vh]">
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-muted-foreground">Loading members...</span>
              </div>
            ) : registeredMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No registered members found for this event.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Total registered: {registeredMembers.length} members
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4" />
                    <span>
                      {registeredMembers.filter(member => member.checked_in).length} checked in
                    </span>
                  </div>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>College</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registeredMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">
                          {member.profiles?.first_name && member.profiles?.last_name 
                            ? `${member.profiles.first_name} ${member.profiles.last_name}`.trim()
                            : member.profiles?.first_name || member.profiles?.last_name || 'Profile Incomplete'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {member.profiles?.email || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {member.profiles?.phone || 'Not provided'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            {member.profiles?.department || 'Not provided'}
                          </div>
                        </TableCell>
                        <TableCell>{member.profiles?.year || 'Not provided'}</TableCell>
                        <TableCell>{member.profiles?.college || 'Not provided'}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded ${
                            member.checked_in ? 'bg-primary text-primary-foreground' : 
                            member.status === 'registered' ? 'bg-secondary text-secondary-foreground' : 
                            'bg-muted text-muted-foreground'
                          }`}>
                            {member.checked_in ? 'Checked In' : member.status || 'Registered'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {new Date(member.registration_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Participant Events Dialog */}
      <Dialog open={isParticipantDialogOpen} onOpenChange={setIsParticipantDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-lg sm:text-xl">Participant Events</DialogTitle>
            <DialogDescription>{selectedParticipant?.first_name ? `${selectedParticipant.first_name} ${selectedParticipant.last_name || ''}` : selectedParticipant?.email}</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-1 space-y-3">
            {participantEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No registrations found</div>
            ) : (
              participantEvents.map((r: any) => (
                <div key={r.events?.id + r.registration_date} className="p-3 bg-gradient-subtle rounded-lg border border-border">
                  <div className="font-medium truncate">{r.events?.title || 'Event'}</div>
                  <div className="text-xs text-muted-foreground">{new Date(r.registration_date).toLocaleDateString()} • {r.checked_in ? 'Checked in' : 'Registered'}</div>
    </div>
              ))
            )}
          </div>
          <div className="flex-shrink-0 flex justify-end pt-3 border-t">
            <Button variant="outline" onClick={() => setIsParticipantDialogOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Participant Details Dialog */}
      <Dialog open={isParticipantDetailsOpen} onOpenChange={setIsParticipantDetailsOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Participant Details</DialogTitle>
            <DialogDescription>Profile information</DialogDescription>
          </DialogHeader>
          {selectedParticipant ? (
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">Name:</span>
                <span className="ml-2 font-medium">{(selectedParticipant.first_name || '') + ' ' + (selectedParticipant.last_name || '')}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Email:</span>
                <span className="ml-2 font-medium break-all">{selectedParticipant.email}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Phone:</span>
                <span className="ml-2 font-medium">{selectedParticipant.phone || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Department:</span>
                <span className="ml-2 font-medium">{selectedParticipant.department || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Year:</span>
                <span className="ml-2 font-medium">{selectedParticipant.year || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">College:</span>
                <span className="ml-2 font-medium">{selectedParticipant.college || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Participant ID:</span>
                <span className="ml-2 font-medium">{selectedParticipant.participant_id || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Registered At:</span>
                <span className="ml-2 font-medium">{selectedParticipant.created_at ? new Date(selectedParticipant.created_at).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', hour12: true, year: 'numeric', month: 'short', day: '2-digit' }) : '—'}</span>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground">No participant selected</div>
          )}
          <div className="flex justify-end pt-3 border-t">
            <Button variant="outline" onClick={() => setIsParticipantDetailsOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign Coordinator Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Assign Coordinator to Event</DialogTitle>
            <DialogDescription>Search and assign a coordinator to any event</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="text-sm mb-1">Search Events</div>
                <Input value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} placeholder="Search by title or department" />
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {allEvents
                    .filter(e => {
                      const q = eventSearch.toLowerCase().trim();
                      if (!q) return true;
                      return (e.title || '').toLowerCase().includes(q) || (e.department || '').toLowerCase().includes(q);
                    })
                    .map(e => (
                      <button key={e.id} onClick={() => setSelectedAssignEvent(e)} className={`w-full text-left p-2 rounded border ${selectedAssignEvent?.id === e.id ? 'bg-primary/10 border-primary' : 'bg-muted/40 border-border'}`}>
                        <div className="font-medium truncate">{e.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{e.department || '—'}</div>
                      </button>
                    ))}
                </div>
              </div>
              <div>
                <div className="text-sm mb-1">Search Coordinators</div>
                <Input value={coordinatorSearch} onChange={(e) => setCoordinatorSearch(e.target.value)} placeholder="Search by name or email" />
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {coordinators
                    .filter(c => {
                      const q = coordinatorSearch.toLowerCase().trim();
                      if (!q) return true;
                      const name = `${c.first_name || ''} ${c.last_name || ''}`.toLowerCase();
                      return name.includes(q) || (c.email || '').toLowerCase().includes(q);
                    })
                    .map(c => (
                      <button key={c.user_id} onClick={() => setSelectedAssignCoordinator(c)} className={`w-full text-left p-2 rounded border ${selectedAssignCoordinator?.user_id === c.user_id ? 'bg-primary/10 border-primary' : 'bg-muted/40 border-border'}`}>
                        <div className="font-medium truncate">{`${c.first_name || ''} ${c.last_name || ''}`.trim() || c.email}</div>
                        <div className="text-xs text-muted-foreground truncate">{c.email}</div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0 flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>Close</Button>
            <Button
              disabled={!selectedAssignEvent || !selectedAssignCoordinator}
              onClick={async () => {
                try {
                  const { error } = await (supabase as any)
                    .from('event_coordinators')
                    .insert({ user_id: selectedAssignCoordinator.user_id, event_id: selectedAssignEvent.id });
                  if (error) throw error;
                  toast({ title: 'Assigned', description: 'Coordinator assigned to event' });
                  setAssignDialogOpen(false);
                } catch (e: any) {
                  toast({ title: 'Failed', description: e.message || 'Assignment failed', variant: 'destructive' });
                }
              }}
            >
              Assign
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </ErrorBoundary>
  );
};

export default Organizer;