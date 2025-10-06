import { useEffect, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Check, X as XIcon } from 'lucide-react';

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      setLoading(false);
    };
    load();
  }, [user]);

  const moderate = async (registrationId: string, approve: boolean) => {
    await (supabase as any)
      .from('event_registrations')
      .update({ status: approve ? 'approved' : 'denied' })
      .eq('id', registrationId);
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
              <Button variant="hero" className="h-16 sm:h-20">View My Events</Button>
              <Button variant="outline" className="h-16 sm:h-20">Moderate Registrations</Button>
            </div>
          </div>

          {/* Events list */}
          <div className="space-y-4">
            {events.map((ev) => (
              <Card key={ev.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{ev.title}</span>
                    <span className="text-xs text-muted-foreground">{new Date(ev.start_date).toLocaleDateString()}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Registrations moderation preview */}
                  <RegistrationsPanel eventId={ev.id} onModerate={moderate} />
                </CardContent>
              </Card>
            ))}
            {events.length === 0 && (
              <div className="text-center text-muted-foreground">No assigned events</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RegistrationsPanel({ eventId, onModerate }: { eventId: string; onModerate: (id: string, approve: boolean) => Promise<void> }) {
  const [regs, setRegs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await (supabase as any)
        .from('event_registrations')
        .select('id, user_id, status, registration_date')
        .eq('event_id', eventId)
        .order('registration_date', { ascending: false });
      setRegs(data || []);
      setLoading(false);
    };
    load();
  }, [eventId]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading registrations...</div>;

  if (regs.length === 0) return <div className="text-sm text-muted-foreground">No registrations yet</div>;

  return (
    <div className="space-y-2">
      {regs.map((r) => (
        <div key={r.id} className="flex items-center justify-between text-sm">
          <div>
            <span className="text-muted-foreground">{new Date(r.registration_date).toLocaleString()}</span>
            <span className="ml-2">Status: {r.status}</span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onModerate(r.id, true)}>
              <Check className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onModerate(r.id, false)}>
              <XIcon className="w-4 h-4 mr-1" /> Deny
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
