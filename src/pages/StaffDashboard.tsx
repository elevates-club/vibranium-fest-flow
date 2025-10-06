import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import EventCreation from '@/components/organizer/EventCreation';
import { Calendar, Users, BarChart3, UserCheck } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [department, setDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Assignment UI state
  const [eventSearch, setEventSearch] = useState('');
  const [coordinatorSearch, setCoordinatorSearch] = useState('');
  const [deptEvents, setDeptEvents] = useState<any[]>([]);
  const [coordinators, setCoordinators] = useState<any[]>([]);
  const [selectedAssignEvent, setSelectedAssignEvent] = useState<any>(null);
  const [selectedAssignCoordinator, setSelectedAssignCoordinator] = useState<any>(null);
  const [assignments, setAssignments] = useState<Array<{ id: number; event_id: string; user_id: string }>>([]);
  const [volunteers, setVolunteers] = useState<any[]>([]);
  const [volunteerSearch, setVolunteerSearch] = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState<any>(null);
  const [volAssignments, setVolAssignments] = useState<Array<{ id: number; event_id: string; user_id: string }>>([]);
  const [deptSelect, setDeptSelect] = useState<string>('');
  const [savingDept, setSavingDept] = useState(false);
  const [deptParticipants, setDeptParticipants] = useState<Array<{ user_id: string; profile: any; events: Array<{ id: string; title: string; start_date: string }> }>>([]);
  const [participantsLoading, setParticipantsLoading] = useState(false);
  const [participantQuery, setParticipantQuery] = useState('');
  const [participantSort, setParticipantSort] = useState<'recent' | 'name' | 'events'>('recent');
  const [isParticipantDialogOpen, setIsParticipantDialogOpen] = useState(false);
  const [selectedParticipantDetail, setSelectedParticipantDetail] = useState<any | null>(null);
  const [deptRegsTotal, setDeptRegsTotal] = useState(0);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const { data } = await (supabase as any)
        .from('event_staff')
        .select('department')
        .eq('user_id', user.id)
        .maybeSingle();
      setDepartment(data?.department || null);
      setLoading(false);
    };
    load();
  }, [user]);

  // Load department events, coordinators and volunteers
  useEffect(() => {
    const loadData = async () => {
      if (!department) return;
      const [{ data: evs }, { data: coordIds }, { data: volIds }] = await Promise.all([
        (supabase as any).from('events').select('id, title, department, start_date').eq('department', department).order('start_date', { ascending: true }),
        (supabase as any).from('user_roles').select('user_id').eq('role', 'coordinator'),
        (supabase as any).from('user_roles').select('user_id').eq('role', 'volunteer')
      ]);
      setDeptEvents(evs || []);
      const coordUserIds = Array.from(new Set((coordIds || []).map((r: any) => r.user_id)));
      const volUserIds = Array.from(new Set((volIds || []).map((r: any) => r.user_id)));
      if (coordUserIds.length > 0) {
        const { data: profs } = await (supabase as any)
          .from('profiles')
          .select('user_id, first_name, last_name, email, department')
          .in('user_id', coordUserIds);
        setCoordinators(profs || []);
      } else {
        setCoordinators([]);
      }
      if (volUserIds.length > 0) {
        const { data: vprofs } = await (supabase as any)
          .from('profiles')
          .select('user_id, first_name, last_name, email, department')
          .in('user_id', volUserIds);
        setVolunteers(vprofs || []);
      } else {
        setVolunteers([]);
      }

      // Load volunteer assignments for department events
      const eventIds2 = (evs || []).map((e: any) => e.id);
      if (eventIds2.length > 0) {
        const { data: vassigns } = await (supabase as any)
          .from('event_volunteers')
          .select('id, event_id, user_id')
          .in('event_id', eventIds2);
        setVolAssignments(vassigns || []);
      } else {
        setVolAssignments([]);
      }

      // Load current coordinator assignments for department events
      const eventIds = (evs || []).map((e: any) => e.id);
      if (eventIds.length > 0) {
        const { data: assigns } = await (supabase as any)
          .from('event_coordinators')
          .select('id, event_id, user_id')
          .in('event_id', eventIds);
        setAssignments(assigns || []);
      } else {
        setAssignments([]);
      }
    };
    void loadData();
  }, [department]);

  useEffect(() => {
    const loadParticipants = async () => {
      if (activeTab !== 'participants' || !department) return;
      setParticipantsLoading(true);
      try {
        const { data: regs } = await (supabase as any)
          .from('event_registrations')
          .select('user_id, registration_date, events(id, title, department, start_date)')
          .eq('events.department', department);
        const byUser = new Map<string, Array<{ id: string; title: string; start_date: string }>>();
        (regs || []).forEach((r: any) => {
          if (!r.events) return;
          const arr = byUser.get(r.user_id) || [];
          arr.push({ id: r.events.id, title: r.events.title, start_date: r.events.start_date });
          byUser.set(r.user_id, arr);
        });
        const ids = Array.from(byUser.keys());
        if (ids.length === 0) { setDeptParticipants([]); return; }
        const { data: profs } = await (supabase as any)
          .from('profiles')
          .select('user_id, first_name, last_name, email, phone, department, created_at')
          .in('user_id', ids);
        const profMap: Record<string, any> = {};
        (profs || []).forEach((p: any) => { profMap[p.user_id] = p; });
        const list = ids.map((uid) => ({ user_id: uid, profile: profMap[uid], events: byUser.get(uid) || [] }));
        setDeptParticipants(list);
        // total registrations across department (deduped by user-event pairs already)
        let totalRegs = 0;
        list.forEach((p) => { totalRegs += p.events.length; });
        setDeptRegsTotal(totalRegs);
      } finally {
        setParticipantsLoading(false);
      }
    };
    void loadParticipants();
  }, [activeTab, department]);

  if (loading) {
    return (
      <div className="bg-background">
        <Navigation />
        <div className="pt-20 pb-16 flex items-center justify-center text-muted-foreground">Loading staff dashboard...</div>
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
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">Staff Dashboard</h1>
              <span className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-3 py-1 bg-muted rounded-full w-fit">Department: {department?.replace('-', ' ') || '—'}</span>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">Create and manage events for your department only</p>
          </div>

          {/* Prompt to set department if empty */}
          {!department && (
            <Card className="mb-6">
              <CardHeader className="p-3 sm:p-6">
                <CardTitle>Set Your Department</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 sm:items-end">
                  <div className="space-y-2">
                    <div className="text-sm">Select Department</div>
                    <Select value={deptSelect} onValueChange={setDeptSelect}>
                      <SelectTrigger className="h-10 sm:h-11">
                        <SelectValue placeholder="Choose your department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="computer-science">Computer Science</SelectItem>
                        <SelectItem value="electronics">Electronics</SelectItem>
                        <SelectItem value="mechanical">Mechanical</SelectItem>
                        <SelectItem value="civil">Civil</SelectItem>
                        <SelectItem value="safety-fire">Safety & Fire Engineering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    disabled={!deptSelect || savingDept}
                    onClick={async () => {
                      if (!user?.id || !deptSelect) return;
                      setSavingDept(true);
                      try {
                        await (supabase as any)
                          .from('event_staff')
                          .upsert({ user_id: user.id, department: deptSelect }, { onConflict: 'user_id' });
                        setDepartment(deptSelect);
                      } finally {
                        setSavingDept(false);
                      }
                    }}
                    className="h-10 sm:h-11"
                  >
                    {savingDept ? 'Saving…' : 'Save Department'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <Button onClick={() => setActiveTab('events')} variant="hero" className="h-16 sm:h-20">
                <Calendar className="w-5 h-5 mr-2" />
                Manage Department Events
              </Button>
              <Button onClick={() => setActiveTab('assign-coordinators')} variant="outline" className="h-16 sm:h-20">
                <UserCheck className="w-5 h-5 mr-2" />
                Assign Coordinators
              </Button>
              <Button onClick={() => setActiveTab('analytics')} variant="outline" className="h-16 sm:h-20">
                <BarChart3 className="w-5 h-5 mr-2" />
                View Analytics
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 sm:gap-2 h-auto">
              <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 px-2 sm:px-3">Overview</TabsTrigger>
              <TabsTrigger value="events" className="text-xs sm:text-sm py-2 px-2 sm:px-3">Events</TabsTrigger>
              <TabsTrigger value="participants" className="text-xs sm:text-sm py-2 px-2 sm:px-3">Participants</TabsTrigger>
              <TabsTrigger value="assign-coordinators" className="text-xs sm:text-sm py-2 px-2 sm:px-3">Assign Coordinators</TabsTrigger>
              <TabsTrigger value="assign-volunteers" className="text-xs sm:text-sm py-2 px-2 sm:px-3">Assign Volunteers</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2 px-2 sm:px-3">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card className="bg-gradient-card border-border"><CardContent className="p-3 sm:p-4 text-center"><div className="text-xs text-muted-foreground mb-1">Department</div><div className="text-lg sm:text-2xl font-bold text-foreground">{department || '—'}</div></CardContent></Card>
                <Card className="bg-gradient-card border-border"><CardContent className="p-3 sm:p-4 text-center"><div className="text-xs text-muted-foreground mb-1">Events</div><div className="text-lg sm:text-2xl font-bold text-foreground">{deptEvents.length}</div></CardContent></Card>
                <Card className="bg-gradient-card border-border"><CardContent className="p-3 sm:p-4 text-center"><div className="text-xs text-muted-foreground mb-1">Coordinators</div><div className="text-lg sm:text-2xl font-bold text-foreground">{coordinators.length}</div></CardContent></Card>
                <Card className="bg-gradient-card border-border"><CardContent className="p-3 sm:p-4 text-center"><div className="text-xs text-muted-foreground mb-1">Volunteers</div><div className="text-lg sm:text-2xl font-bold text-foreground">{volunteers.length}</div></CardContent></Card>
              </div>
            </TabsContent>

            <TabsContent value="events">
              <Card>
                <CardHeader className="p-3 sm:p-6"><CardTitle>Create / Manage Events</CardTitle></CardHeader>
                <CardContent className="p-3 sm:p-6"><EventCreation filterDepartment={department || undefined} /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="participants">
              <Card>
                <CardHeader className="p-3 sm:p-6">
                  <CardTitle className="flex items-center justify-between">
                    <span>Participants (Department)</span>
                    <div className="text-right leading-tight">
                      <div className="text-xs text-muted-foreground">Total Participants: <span className="text-foreground font-medium">{deptParticipants.length}</span></div>
                      <div className="text-xs text-muted-foreground">Registrations: <span className="text-foreground font-medium">{deptRegsTotal}</span></div>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <Input value={participantQuery} onChange={(e) => setParticipantQuery(e.target.value)} placeholder="Search by name or email" />
                    <select value={participantSort} onChange={(e) => setParticipantSort(e.target.value as any)} className="h-10 rounded-md border border-border bg-background px-3 text-sm">
                      <option value="recent">Recently added</option>
                      <option value="name">Name (A–Z)</option>
                      <option value="events">Events count</option>
                    </select>
                  </div>
                  {participantsLoading ? (
                    <div className="text-center py-8 text-muted-foreground">Loading participants…</div>
                  ) : deptParticipants.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">No participants found for this department.</div>
                  ) : (
                    <div className="space-y-2">
                      {deptParticipants
                        .filter((p) => {
                          const q = participantQuery.toLowerCase().trim();
                          if (!q) return true;
                          const name = `${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.toLowerCase();
                          return name.includes(q) || (p.profile?.email || '').toLowerCase().includes(q);
                        })
                        .sort((a, b) => {
                          if (participantSort === 'name') {
                            const an = `${a.profile?.first_name || ''} ${a.profile?.last_name || ''}`.trim().toLowerCase();
                            const bn = `${b.profile?.first_name || ''} ${b.profile?.last_name || ''}`.trim().toLowerCase();
                            return an.localeCompare(bn);
                          }
                          if (participantSort === 'events') {
                            return (b.events.length || 0) - (a.events.length || 0);
                          }
                          const ad = a.profile?.created_at ? new Date(a.profile.created_at).getTime() : 0;
                          const bd = b.profile?.created_at ? new Date(b.profile.created_at).getTime() : 0;
                          return bd - ad;
                        })
                        .map((p) => (
                          <div key={p.user_id} className="p-3 rounded-lg border bg-gradient-subtle flex items-center justify-between">
                            <div className="min-w-0">
                              <div className="font-medium truncate">{`${p.profile?.first_name || ''} ${p.profile?.last_name || ''}`.trim() || p.profile?.email}</div>
                              <div className="text-xs text-muted-foreground truncate">{p.profile?.email}</div>
                              <div className="text-xs text-muted-foreground">Events: {p.events.length}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => { setSelectedParticipantDetail(p); setIsParticipantDialogOpen(true); }}>View Details</Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Dialog open={isParticipantDialogOpen} onOpenChange={setIsParticipantDialogOpen}>
                <DialogContent className="w-[95vw] max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Participant Details</DialogTitle>
                    <DialogDescription>Profile and registered events</DialogDescription>
                  </DialogHeader>
                  {selectedParticipantDetail && (
                    <div className="space-y-3 text-sm">
                      <div className="font-medium">{`${selectedParticipantDetail.profile?.first_name || ''} ${selectedParticipantDetail.profile?.last_name || ''}`.trim() || selectedParticipantDetail.profile?.email}</div>
                      <div className="text-muted-foreground">Email: {selectedParticipantDetail.profile?.email || '—'}</div>
                      <div className="text-muted-foreground">Phone: {selectedParticipantDetail.profile?.phone || '—'}</div>
                      <div className="text-muted-foreground">Department: {selectedParticipantDetail.profile?.department || '—'}</div>
                      <div className="pt-2">
                        <div className="font-medium mb-1">Registered Events ({selectedParticipantDetail.events.length})</div>
                        <div className="space-y-1">
                          {selectedParticipantDetail.events.map((e: any) => (
                            <div key={e.id} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                              <span className="truncate pr-2">{e.title}</span>
                              <span className="text-xs text-muted-foreground">{new Date(e.start_date).toLocaleDateString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="assign-coordinators">
              <Card>
                <CardHeader className="p-3 sm:p-6"><CardTitle>Assign Coordinators</CardTitle></CardHeader>
                <CardContent className="p-3 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm mb-1">Search Events</div>
                      <Input value={eventSearch} onChange={(e) => setEventSearch(e.target.value)} placeholder="Search by title or department" />
                      <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                        {deptEvents
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
                      <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
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
                  <div className="flex justify-end gap-2 pt-3 border-t mt-3">
                    <Button
                      disabled={!selectedAssignEvent || !selectedAssignCoordinator}
                      onClick={async () => {
                        await (supabase as any)
                          .from('event_coordinators')
                          .insert({ user_id: selectedAssignCoordinator.user_id, event_id: selectedAssignEvent.id });
                        setSelectedAssignCoordinator(null);
                        setSelectedAssignEvent(null);
                        // refresh assignments
                        const { data: assigns } = await (supabase as any)
                          .from('event_coordinators')
                          .select('id, event_id, user_id')
                          .in('event_id', (deptEvents || []).map((e: any) => e.id));
                        setAssignments(assigns || []);
                      }}
                    >
                      Assign
                    </Button>
                  </div>

                  {/* Current Assignments */}
                  <div className="mt-6">
                    <div className="text-sm font-medium mb-2">Current Assignments</div>
                    {assignments.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No coordinators assigned yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {assignments.map((a) => {
                          const ev = deptEvents.find((e) => e.id === a.event_id);
                          const coord = coordinators.find((c) => c.user_id === a.user_id);
                          return (
                            <div key={a.id} className="flex items-center justify-between p-2 rounded border bg-muted/40 border-border">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{ev?.title || 'Event'}</div>
                                <div className="text-xs text-muted-foreground truncate">{coord ? `${coord.first_name || ''} ${coord.last_name || ''}`.trim() || coord.email : a.user_id}</div>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                  await (supabase as any)
                                    .from('event_coordinators')
                                    .delete()
                                    .eq('id', a.id);
                                  setAssignments((prev) => prev.filter((x) => x.id !== a.id));
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assign-volunteers">
          <Card>
                <CardHeader className="p-3 sm:p-6"><CardTitle>Assign Volunteers</CardTitle></CardHeader>
            <CardContent className="p-3 sm:p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-sm mb-1">Search Volunteers</div>
                      <Input value={volunteerSearch} onChange={(e) => setVolunteerSearch(e.target.value)} placeholder="Search by name or email" />
                      <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                        {volunteers
                          .filter((v) => {
                            const q = volunteerSearch.toLowerCase().trim();
                            if (!q) return true;
                            const name = `${v.first_name || ''} ${v.last_name || ''}`.toLowerCase();
                            return name.includes(q) || (v.email || '').toLowerCase().includes(q);
                          })
                          .map((v) => (
                            <button key={v.user_id} onClick={() => setSelectedVolunteer(v)} className={`w-full text-left p-2 rounded border ${selectedVolunteer?.user_id === v.user_id ? 'bg-primary/10 border-primary' : 'bg-muted/40 border-border'}`}>
                              <div className="font-medium truncate">{`${v.first_name || ''} ${v.last_name || ''}`.trim() || v.email}</div>
                              <div className="text-xs text-muted-foreground truncate">{v.email}</div>
                            </button>
                          ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm mb-1">Department Events</div>
                      <div className="max-h-64 overflow-y-auto space-y-1">
                        {deptEvents.map((e) => (
                          <button key={e.id} onClick={() => setSelectedAssignEvent(e)} className={`w-full text-left p-2 rounded border ${selectedAssignEvent?.id === e.id ? 'bg-primary/10 border-primary' : 'bg-muted/40 border-border'}`}>
                            <div className="font-medium truncate">{e.title}</div>
                            <div className="text-xs text-muted-foreground truncate">{e.department || '—'}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-3 border-t mt-3">
                    <Button
                      disabled={!selectedVolunteer || !selectedAssignEvent}
                      onClick={async () => {
                        await (supabase as any)
                          .from('event_volunteers')
                          .insert({ user_id: selectedVolunteer.user_id, event_id: selectedAssignEvent.id });
                        setSelectedVolunteer(null);
                        setSelectedAssignEvent(null);
                        const { data: vassigns } = await (supabase as any)
                          .from('event_volunteers')
                          .select('id, event_id, user_id')
                          .in('event_id', (deptEvents || []).map((e: any) => e.id));
                        setVolAssignments(vassigns || []);
                      }}
                    >
                      Assign Volunteer
                    </Button>
                  </div>

                  <div className="mt-6">
                    <div className="text-sm font-medium mb-2">Current Volunteer Assignments</div>
                    {volAssignments.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No volunteers assigned yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {volAssignments.map((a) => {
                          const ev = deptEvents.find((e) => e.id === a.event_id);
                          const vol = volunteers.find((v) => v.user_id === a.user_id);
                          return (
                            <div key={a.id} className="flex items-center justify-between p-2 rounded border bg-muted/40 border-border">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate">{ev?.title || 'Event'}</div>
                                <div className="text-xs text-muted-foreground truncate">{vol ? `${vol.first_name || ''} ${vol.last_name || ''}`.trim() || vol.email : a.user_id}</div>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={async () => {
                                  await (supabase as any)
                                    .from('event_volunteers')
                                    .delete()
                                    .eq('id', a.id);
                                  setVolAssignments((prev) => prev.filter((x) => x.id !== a.id));
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
            </CardContent>
          </Card>
            </TabsContent>

            <TabsContent value="analytics">
              <Card>
                <CardHeader className="p-3 sm:p-6"><CardTitle>Department Analytics</CardTitle></CardHeader>
                <CardContent className="p-3 sm:p-6 text-sm text-muted-foreground">Analytics for department events can be displayed here.</CardContent>
              </Card>
            </TabsContent>

          </Tabs>

          {/* Inline assignment UI now lives inside the Assign Coordinators tab */}
        </div>
      </div>
    </div>
  );
}
