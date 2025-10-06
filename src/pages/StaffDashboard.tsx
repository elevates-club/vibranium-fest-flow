import { useEffect, useMemo, useState } from 'react';
import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import EventCreation from '@/components/organizer/EventCreation';
import { Calendar } from 'lucide-react';

export default function StaffDashboard() {
  const { user } = useAuth();
  const [department, setDepartment] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

          {/* Quick Actions (no volunteers/analytics) */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <Button variant="hero" className="h-16 sm:h-20">Create Department Event</Button>
              <Button variant="outline" className="h-16 sm:h-20">View Department Events</Button>
            </div>
          </div>

          {/* Reuse EventCreation; department is locked for staff by component logic */}
          <Card>
            <CardHeader className="p-3 sm:p-6">
              <CardTitle>Create / Manage Events</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <EventCreation />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
