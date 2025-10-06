import { useEffect, useMemo, useState } from 'react';
import Dashboard from './Dashboard';
import Organizer from './Organizer';
import VolunteerDashboard from './VolunteerDashboard';
import AdminDashboard from './AdminDashboard';
import StaffDashboard from './StaffDashboard';
import CoordinatorDashboard from './CoordinatorDashboard';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RoleDashboard() {
  const { userRoles } = useAuth();

  const availableViews = useMemo(() => {
    const views: Array<'admin' | 'organizer' | 'volunteer' | 'participant' | 'staff' | 'coordinator'> = [];
    if (userRoles.includes('admin')) views.push('admin');
    if (userRoles.includes('organizer')) views.push('organizer');
    if (userRoles.includes('staff')) views.push('staff');
    if (userRoles.includes('coordinator')) views.push('coordinator');
    if (userRoles.includes('volunteer')) views.push('volunteer');
    views.push('participant');
    return views;
  }, [userRoles]);

  const defaultView: 'admin' | 'organizer' | 'volunteer' | 'participant' | 'staff' | 'coordinator' =
    availableViews.includes('admin') ? 'admin' :
    availableViews.includes('organizer') ? 'organizer' :
    availableViews.includes('staff') ? 'staff' :
    availableViews.includes('coordinator') ? 'coordinator' :
    availableViews.includes('volunteer') ? 'volunteer' : 'participant';

  const [view, setView] = useState<'admin' | 'organizer' | 'volunteer' | 'participant' | 'staff' | 'coordinator'>(() => {
    const saved = localStorage.getItem('preferredRoleView') as any;
    return saved && availableViews.includes(saved) ? saved : defaultView;
  });

  useEffect(() => {
    if (!availableViews.includes(view)) {
      setView(defaultView);
      localStorage.setItem('preferredRoleView', defaultView);
    }
  }, [availableViews, view, defaultView]);

  const renderView = () => {
    if (view === 'admin') return <AdminDashboard />;
    if (view === 'organizer') return <Organizer />;
    if (view === 'staff') return <StaffDashboard />;
    if (view === 'coordinator') return <CoordinatorDashboard />;
    if (view === 'volunteer') return <VolunteerDashboard />;
    return <Dashboard />;
  };

  if (availableViews.length <= 1) {
    return renderView();
  }

  return (
    <div>
      <div className="pt-16 sm:pt-20 pb-2">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <Card className="bg-background/60 backdrop-blur-md border-border/40 p-3 sm:p-4 mb-2">
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm text-muted-foreground">View as</span>
              <Select value={view} onValueChange={(v: any) => { setView(v); localStorage.setItem('preferredRoleView', v); }}>
                <SelectTrigger className="h-8 w-[240px]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {availableViews.includes('admin') && (<SelectItem value="admin">Admin</SelectItem>)}
                  {availableViews.includes('organizer') && (<SelectItem value="organizer">Organizer</SelectItem>)}
                  {availableViews.includes('staff') && (<SelectItem value="staff">Staff</SelectItem>)}
                  {availableViews.includes('coordinator') && (<SelectItem value="coordinator">Coordinator</SelectItem>)}
                  {availableViews.includes('volunteer') && (<SelectItem value="volunteer">Volunteer</SelectItem>)}
                  <SelectItem value="participant">Participant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>
        </div>
      </div>
      {renderView()}
    </div>
  );
}


