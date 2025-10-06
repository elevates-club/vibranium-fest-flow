import { useEffect, useRef, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Check, X as XIcon, Users as UsersIcon, BarChart3 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ResponsiveContainer, BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { apiCall } from '@/lib/apiUtils';

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
  const [volSearch, setVolSearch] = useState('');
  const [allVolunteers, setAllVolunteers] = useState<any[]>([]);
  const [selectedEventForVols, setSelectedEventForVols] = useState<string | undefined>(undefined);
  const [assignedVolunteers, setAssignedVolunteers] = useState<any[]>([]);
  const [deptBreakdown, setDeptBreakdown] = useState<Array<{ department: string; count: number }>>([]);
  const [hourBreakdown, setHourBreakdown] = useState<Array<{ hour: string; count: number }>>([]);

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
                    <span className="text-xs text-muted-foreground">{new Date(ev.start_date).toLocaleDateString()}</span>
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
