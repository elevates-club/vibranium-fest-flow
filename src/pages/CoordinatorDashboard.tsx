import { useEffect, useRef, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Check, X as XIcon, Users as UsersIcon, BarChart3, Edit, Eye, Mail, Phone, GraduationCap, Clock, CheckCircle, Download, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResponsiveContainer, BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { apiCall } from '@/lib/apiUtils';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import DOMPurify from 'dompurify';

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState(false);
  const [activeTab, setActiveTab] = useState('participants');
  const [volunteerCount, setVolunteerCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [approvedCount, setApprovedCount] = useState(0);
  const [registrationsChart, setRegistrationsChart] = useState<Array<{ id: string; title: string; registrations: number }>>([]);
  const [topPending, setTopPending] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [eventCounts, setEventCounts] = useState<Record<string, number>>({});
  const [totalRegistrations, setTotalRegistrations] = useState(0);
  const [volCounts, setVolCounts] = useState<Record<string, number>>({});
  const [recentApproved, setRecentApproved] = useState<any[]>([]);
  const [regsByDay, setRegsByDay] = useState<Array<{ day: string; count: number }>>([]);
  const [volSearch, setVolSearch] = useState('');
  const [allVolunteers, setAllVolunteers] = useState<any[]>([]);
  const [selectedEventForVols, setSelectedEventForVols] = useState<string | undefined>(undefined);
  const [assignedVolunteers, setAssignedVolunteers] = useState<any[]>([]);
  const [deptBreakdown, setDeptBreakdown] = useState<Array<{ department: string; count: number }>>([]);
  const [hourBreakdown, setHourBreakdown] = useState<Array<{ hour: string; count: number }>>([]);

  // Event editing state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    start_date: '',
    end_date: '',
    max_attendees: 50,
    registration_fee: 0,
    points_reward: 0,
    department: '',
    registration_closed: false
  });

  // Registered students popup state
  const [isRegisteredStudentsDialogOpen, setIsRegisteredStudentsDialogOpen] = useState(false);
  const [selectedEventForStudents, setSelectedEventForStudents] = useState<any>(null);
  const [registeredStudents, setRegisteredStudents] = useState<any[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      // fetch events where user is coordinator
      const { data: joins } = await (supabase as any)
        .from('event_coordinators')
        .select('event_id')
        .eq('user_id', user.id);
      const ids = (joins || []).map((j: any) => j.event_id);
      if (ids.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }
      const { data: evs } = await (supabase as any)
        .from('events')
        .select('*')
        .in('id', ids)
        .order('start_date', { ascending: true });
      setEvents(evs || []);
      if ((evs || []).length > 0) {
        const eventIds = (evs || []).map((e: any) => e.id);
        const [volRes, pendRes, apprRes] = await Promise.all([
          (supabase as any)
            .from('event_volunteers')
            .select('*', { count: 'exact', head: true })
            .in('event_id', eventIds),
          (supabase as any)
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .in('event_id', eventIds)
            .eq('status', 'pending'),
          (supabase as any)
            .from('event_registrations')
            .select('*', { count: 'exact', head: true })
            .in('event_id', eventIds)
            .or('status.eq.approved,status.eq.registered')
        ]);
        setVolunteerCount(volRes?.count || 0);
        setPendingCount(pendRes?.count || 0);
        setApprovedCount(apprRes?.count || 0);

        // Build registrations per event dataset for chart
        const items: Array<{ id: string; title: string; registrations: number }> = [];
        const countsMap: Record<string, number> = {};
        let total = 0;
        for (const ev of evs || []) {
          const { data: countData } = await (supabase as any)
            .rpc('get_event_registration_count', { event_id_param: ev.id });
          const c = countData || 0;
          items.push({ id: ev.id, title: ev.title || 'Untitled', registrations: c });
          countsMap[ev.id] = c;
          total += c;
        }
        setRegistrationsChart(items);
        setEventCounts(countsMap);
        setTotalRegistrations(total);

        // Volunteers per event counts map
        const { data: volRows } = await (supabase as any)
          .from('event_volunteers')
          .select('event_id')
          .in('event_id', eventIds);
        const vMap: Record<string, number> = {};
        (volRows || []).forEach((r: any) => { vMap[r.event_id] = (vMap[r.event_id] || 0) + 1; });
        setVolCounts(vMap);

        // Top 5 pending registrations (with names)
        const { data: pendList } = await (supabase as any)
          .from('event_registrations')
          .select('id, user_id, event_id, registration_date, events(title)')
          .in('event_id', eventIds)
          .eq('status', 'pending')
          .order('registration_date', { ascending: false })
          .limit(5);
        const idsForProfiles = Array.from(new Set((pendList || []).map((r: any) => r.user_id)));
        let profileMap: Record<string, any> = {};
        if (idsForProfiles.length > 0) {
          const { data: profs } = await (supabase as any)
            .from('profiles')
            .select('user_id, first_name, last_name, email')
            .in('user_id', idsForProfiles);
          (profs || []).forEach((p: any) => { profileMap[p.user_id] = p; });
        }
        setTopPending((pendList || []).map((r: any) => ({
          id: r.id,
          name: `${profileMap[r.user_id]?.first_name || ''} ${profileMap[r.user_id]?.last_name || ''}`.trim() || profileMap[r.user_id]?.email || r.user_id,
          eventTitle: r.events?.title || 'Event',
          time: r.registration_date,
        })));

        // Department breakdown and peak hours across assigned events
        const { data: regsAll } = await (supabase as any)
          .from('event_registrations')
          .select('user_id, registration_date')
          .in('event_id', eventIds);
        const userIdsAll = Array.from(new Set((regsAll || []).map((r: any) => r.user_id)));
        let depMap: Record<string, string> = {};
        if (userIdsAll.length > 0) {
          const { data: profsAll } = await (supabase as any)
            .from('profiles')
            .select('user_id, department')
            .in('user_id', userIdsAll);
          (profsAll || []).forEach((p: any) => { depMap[p.user_id] = p.department || 'Unknown'; });
        }
        const deptCount: Record<string, number> = {};
        const hourCount: Record<string, number> = {};
        (regsAll || []).forEach((r: any) => {
          const dep = depMap[r.user_id] || 'Unknown';
          deptCount[dep] = (deptCount[dep] || 0) + 1;
          const d = new Date(r.registration_date);
          const hour = d.toLocaleTimeString([], { hour: '2-digit', hour12: true });
          hourCount[hour] = (hourCount[hour] || 0) + 1;
        });
        setDeptBreakdown(Object.entries(deptCount).map(([department, count]) => ({ department, count })).sort((a,b)=>b.count-a.count).slice(0,8));
        setHourBreakdown(Object.entries(hourCount).map(([hour, count]) => ({ hour, count })).sort((a,b)=>{
          // sort by hour in 12h; fallback to count
          return b.count - a.count;
        }).slice(0,8));

        // Registrations by day (last 14 days)
        const today = new Date();
        const days: Array<{ day: string; count: number }> = [];
        for (let i = 13; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          days.push({ day: `${dd}/${mm}/${yyyy}`, count: 0 });
        }
        const dateKey = (s: string) => {
          const d = new Date(s);
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          return `${dd}/${mm}/${yyyy}`;
        };
        (regsAll || []).forEach((r: any) => {
          const key = dateKey(r.registration_date);
          const slot = days.find(x => x.day === key);
          if (slot) slot.count += 1;
        });
        setRegsByDay(days);

        // Recent approvals
        const { data: apprList } = await (supabase as any)
          .from('event_registrations')
          .select('id, user_id, event_id, registration_date, events(title)')
          .in('event_id', eventIds)
          .or('status.eq.approved,status.eq.registered')
          .order('registration_date', { ascending: false })
          .limit(5);
        const idsForApprProfiles = Array.from(new Set((apprList || []).map((r: any) => r.user_id)));
        let profileMap2: Record<string, any> = {};
        if (idsForApprProfiles.length > 0) {
          const { data: profs } = await (supabase as any)
            .from('profiles')
            .select('user_id, first_name, last_name, email')
            .in('user_id', idsForApprProfiles);
          (profs || []).forEach((p: any) => { profileMap2[p.user_id] = p; });
        }
        setRecentApproved((apprList || []).map((r: any) => ({
          id: r.id,
          name: `${profileMap2[r.user_id]?.first_name || ''} ${profileMap2[r.user_id]?.last_name || ''}`.trim() || profileMap2[r.user_id]?.email || r.user_id,
          eventTitle: r.events?.title || 'Event',
          time: r.registration_date,
        })));
      } else {
        setVolunteerCount(0);
        setPendingCount(0);
        setApprovedCount(0);
        setRegistrationsChart([]);
        setTopPending([]);
        setDeptBreakdown([]);
        setHourBreakdown([]);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  // Load global volunteers list (profiles with volunteer role)
  useEffect(() => {
    const loadVols = async () => {
      const { data: roleRows } = await (supabase as any)
        .from('user_roles')
        .select('user_id')
        .eq('role', 'volunteer');
      const ids: string[] = Array.from(new Set((roleRows || []).map((r: any) => r.user_id)));
      if (ids.length === 0) {
        setAllVolunteers([]);
        return;
      }
      const { data: profs } = await (supabase as any)
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone')
        .in('user_id', ids);
      setAllVolunteers(profs || []);
    };
    loadVols();
  }, []);

  // Load assigned volunteers for selected event
  useEffect(() => {
    const loadAssigned = async () => {
      if (!selectedEventForVols) { setAssignedVolunteers([]); return; }
      const { data: rows } = await (supabase as any)
        .from('event_volunteers')
        .select('user_id')
        .eq('event_id', selectedEventForVols);
      const ids = Array.from(new Set((rows || []).map((r: any) => r.user_id)));
      if (ids.length === 0) { setAssignedVolunteers([]); return; }
      const { data: profs } = await (supabase as any)
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone')
        .in('user_id', ids);
      setAssignedVolunteers(profs || []);
    };
    void loadAssigned();
  }, [selectedEventForVols]);

  const moderate = async (registrationId: string, approve: boolean) => {
    // Update status
    await (supabase as any)
      .from('event_registrations')
      .update({ status: approve ? 'approved' : 'denied' })
      .eq('id', registrationId);

    if (approve) {
      // Fetch registration with event and profile details to send email
      const { data: reg } = await (supabase as any)
        .from('event_registrations')
        .select('event_id, user_id')
        .eq('id', registrationId)
        .maybeSingle();
      if (reg) {
        const [{ data: event }, { data: profile }] = await Promise.all([
          (supabase as any).from('events').select('*').eq('id', reg.event_id).maybeSingle(),
          (supabase as any).from('profiles').select('first_name, last_name, email, qr_code_data, participant_id').eq('user_id', reg.user_id).maybeSingle(),
        ]);
        if (event && profile) {
          try {
            await apiCall('/api/send-event-registration', {
              method: 'POST',
              body: JSON.stringify({
                eventDetails: event,
                userDetails: {
                  first_name: profile.first_name,
                  last_name: profile.last_name,
                  email: profile.email,
                },
                qrDataURL: profile.qr_code_data,
                participantId: profile.participant_id,
              }),
            });
          } catch {
            // best effort; UI already shows approval
          }
        }
      }
    }
  };

  // Convert stored ISO (UTC) to a datetime-local input value in user's local time
  const toLocalInput = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const tzOffset = d.getTimezoneOffset(); // minutes
    const local = new Date(d.getTime() - tzOffset * 60000);
    return local.toISOString().slice(0, 16);
  };

  // Handle event editing
  const handleEditEvent = (event: any) => {
    setEditingEvent(event);
    
    // Get registration status from localStorage
    const existingStatuses = JSON.parse(localStorage.getItem('eventRegistrationStatus') || '[]');
    const eventStatus = existingStatuses.find((status: any) => status.eventId === event.id);
    
    setEditFormData({
      title: event.title,
      description: event.description,
      category: event.category,
      location: event.location,
      start_date: event.start_date ? toLocalInput(event.start_date) : '',
      end_date: event.end_date ? toLocalInput(event.end_date) : '',
      max_attendees: event.max_attendees,
      registration_fee: event.registration_fee,
      points_reward: event.points_reward,
      department: event.department,
      registration_closed: eventStatus?.registrationClosed || false
    });
    
    setIsEditDialogOpen(true);
  };

  // Handle event update
  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingEvent) return;

    try {
      const updateData = {
        title: editFormData.title,
        description: editFormData.description,
        category: editFormData.category,
        location: editFormData.location,
        start_date: (() => { const d = new Date(editFormData.start_date); return isNaN(d.getTime()) ? null : d.toISOString(); })(),
        end_date: (() => {
          if (!editFormData.end_date) return editFormData.start_date ? new Date(editFormData.start_date).toISOString() : null;
          const d = new Date(editFormData.end_date);
          return isNaN(d.getTime()) ? null : d.toISOString();
        })(),
        max_attendees: editFormData.max_attendees,
        registration_fee: editFormData.registration_fee,
        points_reward: editFormData.points_reward || 0,
        department: editFormData.department,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', editingEvent.id);

      if (error) throw error;

      // Store registration status in localStorage as metadata
      const registrationStatus = {
        eventId: editingEvent.id,
        registrationClosed: editFormData.registration_closed,
        updatedAt: new Date().toISOString()
      };
      
      const existingStatuses = JSON.parse(localStorage.getItem('eventRegistrationStatus') || '[]');
      const updatedStatuses = existingStatuses.filter((status: any) => status.eventId !== editingEvent.id);
      updatedStatuses.push(registrationStatus);
      localStorage.setItem('eventRegistrationStatus', JSON.stringify(updatedStatuses));

      // Refresh events data
      const { data: joins } = await (supabase as any)
        .from('event_coordinators')
        .select('event_id')
        .eq('user_id', user.id);
      const ids = (joins || []).map((j: any) => j.event_id);
      if (ids.length > 0) {
        const { data: evs } = await (supabase as any)
          .from('events')
          .select('*')
          .in('id', ids)
          .order('start_date', { ascending: true });
        setEvents(evs || []);
      }

      setIsEditDialogOpen(false);
      setEditingEvent(null);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  // Fetch registered students for an event
  const fetchRegisteredStudents = async (eventId: string) => {
    setStudentsLoading(true);
    try {
      const { data: registrations, error: registrationsError } = await supabase
        .from('event_registrations')
        .select('*, custom_answers')
        .eq('event_id', eventId)
        .order('registration_date', { ascending: false });

      if (registrationsError) {
        console.error('Error fetching registrations:', registrationsError);
        return;
      }

      if (!registrations || registrations.length === 0) {
        setRegisteredStudents([]);
        return;
      }

      const userIds = registrations.map((reg: any) => reg.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, phone, department, year, college')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return;
      }

      const studentsWithProfiles = registrations.map((registration: any) => {
        const profile = profiles?.find(p => p.user_id === registration.user_id);
        return {
          ...registration,
          profiles: profile || null
        };
      });

      setRegisteredStudents(studentsWithProfiles);
    } catch (error) {
      console.error('Error fetching registered students:', error);
    } finally {
      setStudentsLoading(false);
    }
  };

  // Handle viewing registered students
  const handleViewRegisteredStudents = (event: any) => {
    setSelectedEventForStudents(event);
    setIsRegisteredStudentsDialogOpen(true);
    fetchRegisteredStudents(event.id);
  };

  // Remove participant from event
  const handleRemoveParticipant = async (registrationId: string, participantName: string) => {
    if (!confirm(`Are you sure you want to remove ${participantName} from this event? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('event_registrations')
        .delete()
        .eq('id', registrationId);

      if (error) throw error;

      // Refresh the registered students list
      if (selectedEventForStudents) {
        await fetchRegisteredStudents(selectedEventForStudents.id);
      }

      // Show success message
      console.log('Participant removed successfully');
    } catch (error) {
      console.error('Error removing participant:', error);
    }
  };

  // Export registered students to CSV
  const exportToCSV = () => {
    if (registeredStudents.length === 0) return;

    const headers = [
      'Name',
      'Email',
      'Phone',
      'Department',
      'Year',
      'College',
      'Status',
      'Registration Date'
    ];

    // Add custom fields headers if they exist
    const customHeaders = selectedEventForStudents?.custom_selection_options 
      ? selectedEventForStudents.custom_selection_options.map((field: any) => field.label)
      : [];

    const allHeaders = [...headers, ...customHeaders];

    const csvData = registeredStudents.map(student => {
      const baseData = [
        student.profiles?.first_name && student.profiles?.last_name 
          ? `${student.profiles.first_name} ${student.profiles.last_name}`.trim()
          : student.profiles?.first_name || student.profiles?.last_name || 'Profile Incomplete',
        student.profiles?.email || 'N/A',
        student.profiles?.phone || 'Not provided',
        student.profiles?.department || 'Not provided',
        student.profiles?.year || 'Not provided',
        student.profiles?.college || 'Not provided',
        student.checked_in ? 'Checked In' : student.status || 'Registered',
        new Date(student.registration_date).toLocaleDateString()
      ];

      // Add custom field answers
      const customData = selectedEventForStudents?.custom_selection_options 
        ? selectedEventForStudents.custom_selection_options.map((field: any) => {
            if (student.custom_answers && student.custom_answers[field.id]) {
              return Array.isArray(student.custom_answers[field.id]) 
                ? student.custom_answers[field.id].join(', ') 
                : student.custom_answers[field.id];
            }
            return 'Not answered';
          })
        : [];

      return [...baseData, ...customData];
    });

    const csvContent = [
      allHeaders.join(','),
      ...csvData.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${selectedEventForStudents?.title || 'event'}_registered_students.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="bg-background">
        <Navigation />
        <div className="pt-20 pb-16 flex items-center justify-center text-muted-foreground">Loading coordinator dashboard...</div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <Navigation />
      <div className="pt-16 sm:pt-20 pb-12 sm:pb-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Coordinator Dashboard</h1>
              <span className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-3 py-1 bg-muted rounded-full w-fit">Assigned Events: {events.length}</span>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">Manage your assigned events and moderate registrations</p>
          </div>

          {/* Quick Actions (focused) */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Button variant="hero" className="h-16 sm:h-20" onClick={() => setActiveTab('participants')}>View My Events</Button>
              <Button
                variant="outline"
                className="h-16 sm:h-20"
                onClick={() => {
                  listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  setFlash(true);
                  setTimeout(() => setFlash(false), 1200);
                }}
              >
                Moderate Registrations
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 gap-1">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="participants">Participants</TabsTrigger>
              <TabsTrigger value="volunteers">Volunteers</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="bg-gradient-card border-border">
                  <CardContent className="p-4 text-center">
                    <Calendar className="w-5 h-5 text-primary mx-auto mb-1" />
                    <div className="text-2xl font-bold">{events.length}</div>
                    <div className="text-xs text-muted-foreground">Assigned Events</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-card border-border">
                  <CardContent className="p-4 text-center">
                    <UsersIcon className="w-5 h-5 text-secondary mx-auto mb-1" />
                    <div className="text-2xl font-bold">{volunteerCount}</div>
                    <div className="text-xs text-muted-foreground">Volunteers</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-card border-border">
                  <CardContent className="p-4 text-center">
                    <span className="w-5 h-5 mx-auto mb-1 block text-primary">⏳</span>
                    <div className="text-2xl font-bold">{pendingCount}</div>
                    <div className="text-xs text-muted-foreground">Pending Approvals</div>
                  </CardContent>
                </Card>
                <Card className="bg-gradient-card border-border">
                  <CardContent className="p-4 text-center">
                    <span className="w-5 h-5 mx-auto mb-1 block text-green-500">✅</span>
                    <div className="text-2xl font-bold">{approvedCount}</div>
                    <div className="text-xs text-muted-foreground">Approved</div>
                  </CardContent>
                </Card>
              </div>

              {/* Registrations by Event (bar chart) */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center"><BarChart3 className="w-4 h-4 mr-2" /> Registrations by Event</CardTitle>
                </CardHeader>
                <CardContent>
                  {registrationsChart.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data</div>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RBarChart data={registrationsChart} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <defs>
                            <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#a78bfa" stopOpacity={1} />
                              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.9} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                          <XAxis
                            dataKey="title"
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={50}
                            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                            tickFormatter={(t: string) => (t?.length > 16 ? `${t.slice(0, 16)}…` : t)}
                          />
                          <YAxis tick={{ fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                          <Tooltip
                            cursor={{ fill: 'rgba(124,58,237,0.08)' }}
                            contentStyle={{
                              background: 'var(--background)',
                              border: '1px solid var(--border)',
                              borderRadius: 8,
                              color: 'var(--foreground)'
                            }}
                            labelStyle={{ color: 'var(--muted-foreground)' }}
                          />
                          <Bar dataKey="registrations" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                        </RBarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  {/* Legend */}
                  {registrationsChart.length > 0 && (
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <span className="inline-block w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(180deg, #a78bfa 0%, #7c3aed 100%)' }}></span>
                      <span>Registrations</span>
                    </div>
                  )}
                </CardContent>
              </Card>

            {/* Additional insights: Registrations over time & Volunteers per Event */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Registrations (Last 14 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {regsByDay.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data</div>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={regsByDay} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                          <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} minTickGap={16} />
                          <YAxis tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                          <Tooltip contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }} />
                          <Legend />
                          <Line type="monotone" dataKey="count" name="Registrations" stroke="#60a5fa" strokeWidth={2} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Volunteers per Event</CardTitle>
                </CardHeader>
                <CardContent>
                  {events.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No events</div>
                  ) : (
                    <div className="space-y-2">
                      {events.map((ev) => (
                        <div key={ev.id} className="flex items-center justify-between text-sm">
                          <span className="truncate pr-2">{ev.title}</span>
                          <span className="text-muted-foreground">{volCounts[ev.id] || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

              {/* Recent Pending Approvals */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Recent Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  {topPending.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No pending registrations</div>
                  ) : (
                    <div className="space-y-2">
                      {topPending.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{p.eventTitle} • {new Date(p.time).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="participants">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">Total Participants: <span className="font-semibold text-foreground">{totalRegistrations}</span></div>
                <div className="w-full max-w-xs ml-auto">
                  <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name or email" />
                </div>
              </div>
              <div ref={listRef} className={`space-y-4 ${flash ? 'ring-2 ring-primary rounded-md ring-offset-2 ring-offset-background' : ''}`}>
            {events.map((ev) => (
              <Card key={ev.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{ev.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(ev.start_date).toLocaleDateString()}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewRegisteredStudents(ev)}
                          className="h-8 w-8 p-0"
                          title="View Registered Students"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditEvent(ev)}
                          className="h-8 w-8 p-0"
                          title="Edit Event"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardTitle>
                      <div className="text-xs text-muted-foreground">Participants: <span className="text-foreground font-medium">{eventCounts[ev.id] ?? '—'}</span></div>
                </CardHeader>
                <CardContent className="space-y-3">
                      <RegistrationsPanel eventId={ev.id} onModerate={moderate} searchTerm={searchTerm} />
                </CardContent>
              </Card>
            ))}
            {events.length === 0 && (
              <div className="text-center text-muted-foreground">No assigned events</div>
            )}
          </div>
            </TabsContent>

            <TabsContent value="volunteers">
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Assign Volunteers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <div className="text-sm text-muted-foreground">Select Event</div>
                        <Select value={selectedEventForVols} onValueChange={setSelectedEventForVols}>
                          <SelectTrigger className="h-10">
                            <SelectValue placeholder="Choose an event" />
                          </SelectTrigger>
                          <SelectContent>
                            {events.map((ev) => (
                              <SelectItem key={ev.id} value={ev.id}>{ev.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="sm:col-span-2 space-y-1">
                        <div className="text-sm text-muted-foreground">Search Volunteers</div>
                        <Input value={volSearch} onChange={(e) => setVolSearch(e.target.value)} placeholder="Search by name or email" />
                      </div>
                    </div>

                    {/* All volunteers list */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {allVolunteers
                        .filter((v) => {
                          const q = volSearch.toLowerCase().trim();
                          if (!q) return true;
                          const name = `${v.first_name || ''} ${v.last_name || ''}`.toLowerCase();
                          return name.includes(q) || (v.email || '').toLowerCase().includes(q);
                        })
                        .slice(0, 20)
                        .map((v) => {
                          const isAssigned = assignedVolunteers.some((a) => a.user_id === v.user_id);
                          return (
                            <div key={v.user_id} className="p-2 rounded border bg-muted/30 text-sm flex items-center justify-between">
                              <div className="truncate">
                                <div className="font-medium truncate">{`${v.first_name || ''} ${v.last_name || ''}`.trim() || v.email}</div>
                                <div className="text-xs text-muted-foreground truncate">{v.phone || v.email}</div>
                              </div>
                              <Button size="sm" disabled={!selectedEventForVols || isAssigned} onClick={async () => {
                                if (!selectedEventForVols) return;
                                await (supabase as any)
                                  .from('event_volunteers')
                                  .insert({ event_id: selectedEventForVols, user_id: v.user_id });
                                setAssignedVolunteers((prev) => [...prev, v]);
                              }}>{isAssigned ? 'Assigned' : 'Assign'}</Button>
                            </div>
                          );
                        })}
                    </div>
                  </CardContent>
                </Card>

                {/* Current assignments for selected event */}
                <Card>
                  <CardHeader>
                    <CardTitle>Assigned Volunteers {selectedEventForVols ? '' : '(select an event)'}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(!selectedEventForVols || assignedVolunteers.length === 0) ? (
                      <div className="text-sm text-muted-foreground">{selectedEventForVols ? 'No volunteers assigned yet.' : 'Choose an event to view assignments.'}</div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {assignedVolunteers.map((v) => (
                          <div key={v.user_id} className="p-2 rounded border bg-muted/30 text-sm flex items-center justify-between">
                            <div className="truncate">
                              <div className="font-medium truncate">{`${v.first_name || ''} ${v.last_name || ''}`.trim() || v.email}</div>
                              <div className="text-xs text-muted-foreground truncate">{v.phone || v.email}</div>
                            </div>
                            <Button size="sm" variant="destructive" onClick={async () => {
                              await (supabase as any)
                                .from('event_volunteers')
                                .delete()
                                .eq('event_id', selectedEventForVols)
                                .eq('user_id', v.user_id);
                              setAssignedVolunteers((prev) => prev.filter((p) => p.user_id !== v.user_id));
                            }}>Remove</Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="analytics">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-gradient-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Pending Approvals</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{pendingCount}</div></CardContent>
                </Card>
                <Card className="bg-gradient-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Approved</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{approvedCount}</div></CardContent>
                </Card>
                <Card className="bg-gradient-card border-border">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Volunteers</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{volunteerCount}</div></CardContent>
                </Card>
              </div>

              {/* Registrations by Event */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center"><BarChart3 className="w-4 h-4 mr-2" /> Registrations by Event</CardTitle>
                </CardHeader>
                <CardContent>
                  {registrationsChart.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No data</div>
                  ) : (
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <RBarChart data={registrationsChart} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                          <defs>
                            <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#34d399" stopOpacity={1} />
                              <stop offset="100%" stopColor="#059669" stopOpacity={0.9} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
                          <XAxis
                            dataKey="title"
                            interval={0}
                            angle={-30}
                            textAnchor="end"
                            height={50}
                            tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }}
                            tickFormatter={(t: string) => (t?.length > 16 ? `${t.slice(0, 16)}…` : t)}
                          />
                          <YAxis tick={{ fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                          <Tooltip
                            cursor={{ fill: 'rgba(5,150,105,0.08)' }}
                            contentStyle={{ background: 'var(--background)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--foreground)' }}
                            labelStyle={{ color: 'var(--muted-foreground)' }}
                          />
                          <Bar dataKey="registrations" fill="url(#barGrad2)" radius={[6,6,0,0]} />
                        </RBarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Pending */}
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Recent Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  {topPending.length === 0 ? (
                    <div className="text-sm text-muted-foreground">No pending registrations</div>
                  ) : (
                    <div className="space-y-2">
                      {topPending.map((p) => (
                        <div key={p.id} className="flex items-center justify-between text-sm">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground truncate">{p.eventTitle} • {new Date(p.time).toLocaleString()}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

          {/* Department Breakdown and Peak Hours */}
          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Departments</CardTitle>
              </CardHeader>
              <CardContent>
                {deptBreakdown.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No data</div>
                ) : (
                  <div className="space-y-2">
                    {deptBreakdown.map((d) => (
                      <div key={d.department} className="flex items-center justify-between text-sm">
                        <span className="truncate pr-2">{d.department}</span>
                        <span className="text-muted-foreground">{d.count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Approvals */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Recent Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                {recentApproved.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No approvals yet</div>
                ) : (
                  <div className="space-y-2">
                    {recentApproved.map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{p.name}</div>
                          <div className="text-xs text-muted-foreground truncate">{p.eventTitle} • {new Date(p.time).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Peak Registration Hours</CardTitle>
              </CardHeader>
              <CardContent>
                {hourBreakdown.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No data</div>
                ) : (
                  <div className="space-y-2">
                    {hourBreakdown.map((h) => (
                      <div key={h.hour} className="flex items-center justify-between text-sm">
                        <span className="truncate pr-2">{h.hour}</span>
                        <span className="text-muted-foreground">{h.count}</span>
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

      {/* Event Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Event</DialogTitle>
            <DialogDescription>
              Update the event details below
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateEvent} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Event Title</Label>
                <Input
                  id="edit-title"
                  value={editFormData.title}
                  onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                  placeholder="Enter event title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={editFormData.category} onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="workshop">Workshop</SelectItem>
                    <SelectItem value="competition">Competition</SelectItem>
                    <SelectItem value="seminar">Seminar</SelectItem>
                    <SelectItem value="exhibition">Exhibition</SelectItem>
                    <SelectItem value="networking">Networking</SelectItem>
                    <SelectItem value="hackathon">Hackathon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <div className="rounded-md border quill-responsive">
                <ReactQuill
                  theme="snow"
                  value={editFormData.description}
                  onChange={(html) => setEditFormData({ ...editFormData, description: html })}
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      [{ align: [] }],
                      ['blockquote', 'code-block'],
                      ['link'],
                      ['clean']
                    ],
                  }}
                  className="bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start_date">Start Date & Time</Label>
                <Input
                  id="edit-start_date"
                  type="datetime-local"
                  value={editFormData.start_date}
                  onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end_date">End Date & Time (Optional)</Label>
                <Input
                  id="edit-end_date"
                  type="datetime-local"
                  value={editFormData.end_date}
                  onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  placeholder="Event location"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max_attendees">Max Attendees</Label>
                <Input
                  id="edit-max_attendees"
                  type="number"
                  value={editFormData.max_attendees}
                  onChange={(e) => setEditFormData({ ...editFormData, max_attendees: parseInt(e.target.value) })}
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-registration_fee">Registration Fee (₹)</Label>
                <Input
                  id="edit-registration_fee"
                  type="number"
                  value={editFormData.registration_fee}
                  onChange={(e) => setEditFormData({ ...editFormData, registration_fee: parseInt(e.target.value) })}
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-points_reward">Points Reward (Optional)</Label>
                <Input
                  id="edit-points_reward"
                  type="number"
                  value={editFormData.points_reward}
                  onChange={(e) => setEditFormData({ ...editFormData, points_reward: parseInt(e.target.value) || 0 })}
                  min="0"
                  placeholder="Enter points reward (optional)"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Select value={editFormData.department} onValueChange={(value) => setEditFormData({ ...editFormData, department: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="computer-science">Computer Science</SelectItem>
                  <SelectItem value="electronics">Electronics</SelectItem>
                  <SelectItem value="mechanical">Mechanical</SelectItem>
                  <SelectItem value="civil">Civil</SelectItem>
                  <SelectItem value="safety-fire">Safety & Fire Engineering</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-registration_closed">Registration Status</Label>
              <Select 
                value={editFormData.registration_closed ? 'closed' : 'open'} 
                onValueChange={(value) => setEditFormData({ ...editFormData, registration_closed: value === 'closed' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select registration status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open for Registration</SelectItem>
                  <SelectItem value="closed">Registration Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" className="w-full sm:w-auto bg-primary hover:bg-primary/90">
                Update Event
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Registered Students Dialog */}
      <Dialog open={isRegisteredStudentsDialogOpen} onOpenChange={setIsRegisteredStudentsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UsersIcon className="w-5 h-5 text-primary" />
              Registered Students - {selectedEventForStudents?.title}
            </DialogTitle>
            <DialogDescription>
              View all registered participants for this event
            </DialogDescription>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh]">
            {studentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-2 text-muted-foreground">Loading students...</span>
              </div>
            ) : registeredStudents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UsersIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No registered students found for this event.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Total registered: {registeredStudents.length} students
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {registeredStudents.filter(student => student.checked_in).length} checked in
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToCSV}
                      className="flex items-center gap-2"
                      disabled={registeredStudents.length === 0}
                    >
                      <Download className="w-4 h-4" />
                      Export CSV
                    </Button>
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
                      {selectedEventForStudents?.custom_selection_options && selectedEventForStudents.custom_selection_options.map((field: any) => (
                        <TableHead key={field.id} className="max-w-xs">
                          {field.label}
                        </TableHead>
                      ))}
                      <TableHead>Status</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registeredStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">
                          {student.profiles?.first_name && student.profiles?.last_name 
                            ? `${student.profiles.first_name} ${student.profiles.last_name}`.trim()
                            : student.profiles?.first_name || student.profiles?.last_name || 'Profile Incomplete'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            {student.profiles?.email || 'N/A'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            {student.profiles?.phone || 'Not provided'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <GraduationCap className="w-4 h-4 text-muted-foreground" />
                            {student.profiles?.department || 'Not provided'}
                          </div>
                        </TableCell>
                        <TableCell>{student.profiles?.year || 'Not provided'}</TableCell>
                        <TableCell>{student.profiles?.college || 'Not provided'}</TableCell>
                        {selectedEventForStudents?.custom_selection_options && selectedEventForStudents.custom_selection_options.map((field: any) => (
                          <TableCell key={field.id} className="max-w-xs text-sm">
                            {student.custom_answers && student.custom_answers[field.id] 
                              ? (Array.isArray(student.custom_answers[field.id]) 
                                  ? student.custom_answers[field.id].join(', ') 
                                  : student.custom_answers[field.id])
                              : 'Not answered'
                            }
                          </TableCell>
                        ))}
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded ${
                            student.checked_in ? 'bg-primary text-primary-foreground' : 
                            student.status === 'registered' ? 'bg-secondary text-secondary-foreground' : 
                            'bg-muted text-muted-foreground'
                          }`}>
                            {student.checked_in ? 'Checked In' : student.status || 'Registered'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="w-4 h-4" />
                            {new Date(student.registration_date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRemoveParticipant(
                              student.id, 
                              student.profiles?.first_name && student.profiles?.last_name 
                                ? `${student.profiles.first_name} ${student.profiles.last_name}`.trim()
                                : student.profiles?.first_name || student.profiles?.last_name || 'Participant'
                            )}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            title="Remove Participant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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
    </div>
  );
}

function RegistrationsPanel({ eventId, onModerate, searchTerm }: { eventId: string; onModerate: (id: string, approve: boolean) => Promise<void>; searchTerm?: string }) {
  const [regs, setRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profilesMap, setProfilesMap] = useState<Record<string, any>>({});
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from('event_registrations')
        .select('id, user_id, status, registration_date')
        .eq('event_id', eventId)
        .order('registration_date', { ascending: false });
      const rows = data || [];
      setRegs(rows);
      const ids = Array.from(new Set(rows.map((r: any) => r.user_id)));
      if (ids.length > 0) {
        const { data: profs } = await (supabase as any)
          .from('profiles')
          .select('user_id, first_name, last_name, email, phone, department, year, college')
          .in('user_id', ids);
        const map: Record<string, any> = {};
        (profs || []).forEach((p: any) => { map[p.user_id] = p; });
        setProfilesMap(map);
      } else {
        setProfilesMap({});
      }
      setLoading(false);
    };
    load();
  }, [eventId, refreshKey]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading registrations...</div>;

  if (regs.length === 0) return <div className="text-sm text-muted-foreground">No registrations yet</div>;

  return (
    <>
    <div className="space-y-2">
        {regs
          .filter((r) => {
            if (!searchTerm) return true;
            const p = profilesMap[r.user_id];
            const name = `${p?.first_name || ''} ${p?.last_name || ''}`.toLowerCase();
            const email = (p?.email || '').toLowerCase();
            const q = searchTerm.toLowerCase().trim();
            return name.includes(q) || email.includes(q);
          })
          .map((r) => {
          const p = profilesMap[r.user_id];
          const fullName = p ? `${p.first_name || ''} ${p.last_name || ''}`.trim() || p.email : r.user_id;
          const isApproved = r.status === 'registered' || r.status === 'approved';
          return (
            <div key={r.id} className="flex items-center justify-between text-sm p-2 rounded border bg-muted/30">
              <div className="min-w-0">
                <div className="font-medium truncate">{fullName}</div>
                <div className="text-xs text-muted-foreground truncate">{new Date(r.registration_date).toLocaleString()}</div>
          </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => { setSelected({ ...r, profile: p }); setOpen(true); }}>View Details</Button>
                {isApproved ? (
                  <span className="text-xs px-2 py-1 rounded bg-green-600 text-white">Approved</span>
                ) : (
                  <>
                    <Button size="sm" variant="outline" disabled={r.status !== 'pending'} onClick={async () => { await onModerate(r.id, true); setRefreshKey(k => k + 1); }}>
              <Check className="w-4 h-4 mr-1" /> Approve
            </Button>
                    <Button size="sm" variant="destructive" disabled={r.status !== 'pending'} onClick={async () => { await onModerate(r.id, false); setRefreshKey(k => k + 1); }}>
              <XIcon className="w-4 h-4 mr-1" /> Deny
            </Button>
                  </>
                )}
          </div>
        </div>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Registration Details</DialogTitle>
            <DialogDescription>Participant information</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-2 text-sm">
              <div className="font-medium">{`${selected.profile?.first_name || ''} ${selected.profile?.last_name || ''}`.trim() || selected.profile?.email || 'Participant'}</div>
              <div className="text-muted-foreground">Email: {selected.profile?.email || '—'}</div>
              <div className="text-muted-foreground">Phone: {selected.profile?.phone || '—'}</div>
              <div className="text-muted-foreground">Department: {selected.profile?.department || '—'}</div>
              <div className="text-muted-foreground">Year: {selected.profile?.year || '—'}</div>
              <div className="text-muted-foreground">Registered: {new Date(selected.registration_date).toLocaleString()}</div>
              <div className="text-muted-foreground">Status: {selected.status}</div>
    </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
