import Navigation from '@/components/layout/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Users, Shield, Settings, Database, UserCog, Trash2, Plus, Mail, Download } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('users');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userRolesMap, setUserRolesMap] = useState<Record<string, string[]>>({});
  const [roleUpdating, setRoleUpdating] = useState<string | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [roleUser, setRoleUser] = useState<any | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<('participant' | 'organizer' | 'volunteer' | 'staff' | 'coordinator' | 'admin')[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'participant' | 'organizer' | 'volunteer' | 'staff' | 'coordinator' | 'admin'>('organizer');
  const [sendingInvite, setSendingInvite] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  // Settings
  const [viewsTracking, setViewsTracking] = useState<boolean>(() => localStorage.getItem('sys_views_tracking') === 'true');
  const [force12h, setForce12h] = useState<boolean>(() => localStorage.getItem('sys_force_12h') !== 'false');
  const [emailHealth, setEmailHealth] = useState<string>('');
  const [settingsPage, setSettingsPage] = useState<'general' | 'email' | 'security' | 'integrations' | 'audit'>('general');
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditPage, setAuditPage] = useState(0);
  const auditPageSize = 20;

  useEffect(() => {
    if (activeTab === 'users') {
      loadUsers();
      loadRoles();
    }
  }, [activeTab]);

  const loadUsers = async () => {
    try {
      setLoadingUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, department, year, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsersList(data || []);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoadingUsers(false);
    }
  };

  const exportUsersCSV = () => {
    const headers = ['User ID','First Name','Last Name','Email','Department','Year','Joined'];
    const rows = usersList.map((u) => [u.user_id, u.first_name || '', u.last_name || '', u.email || '', u.department || '', u.year || '', u.created_at || '']);
    const escape = (val: any) => String(val).split('"').join('""');
    const csv = [headers, ...rows].map(r => r.map(escape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteUser = async (userId: string) => {
    try {
      // Remove roles first
      await supabase.from('user_roles').delete().eq('user_id', userId);
      // Remove profile
      const { error } = await supabase.from('profiles').delete().eq('user_id', userId);
      if (error) throw error;
      toast({ title: 'User deleted' });
      await loadUsers();
      await loadRoles();
    } catch (e: any) {
      toast({ title: 'Failed to delete user', description: e.message || 'Try again', variant: 'destructive' });
    }
  };

  const loadRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role');
      if (error) throw error;
      const map: Record<string, string[]> = {};
      (data || []).forEach((r: any) => {
        map[r.user_id] = map[r.user_id] ? [...map[r.user_id], r.role] : [r.role];
      });
      setUserRolesMap(map);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to load roles', variant: 'destructive' });
    }
  };

  const addRole = async (userId: string, role: 'participant' | 'organizer' | 'volunteer' | 'staff' | 'coordinator' | 'admin') => {
    try {
      setRoleUpdating(userId + role);
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role } as any]);
      if (error) throw error;
      toast({ title: 'Role added', description: `Assigned ${role}` });
      await loadRoles();
    } catch (e: any) {
      toast({ title: 'Failed to add role', description: e.message || 'Try again', variant: 'destructive' });
    } finally {
      setRoleUpdating(null);
    }
  };

  const removeRole = async (userId: string, role: 'participant' | 'organizer' | 'volunteer' | 'staff' | 'coordinator' | 'admin') => {
    if (role === 'admin') {
      toast({ title: 'Not allowed', description: 'Admin role cannot be removed here.', variant: 'destructive' });
      return;
    }
    try {
      setRoleUpdating(userId + role);
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);
      if (error) throw error;
      toast({ title: 'Role removed', description: role });
      await loadRoles();
    } catch (e: any) {
      toast({ title: 'Failed to remove role', description: e.message || 'Try again', variant: 'destructive' });
    } finally {
      setRoleUpdating(null);
    }
  };

  const openRolesDialog = (u: any) => {
    setRoleUser(u);
    const current = userRolesMap[u.user_id] || ['participant'];
    setSelectedRoles(current as any);
    setIsRoleDialogOpen(true);
  };

  const toggleRole = (role: 'participant' | 'organizer' | 'volunteer' | 'staff' | 'coordinator' | 'admin') => {
    // Prevent unchecking admin once assigned
    if (role === 'admin' && (userRolesMap[roleUser?.user_id || ''] || []).includes('admin')) {
      return;
    }
    setSelectedRoles(prev => (prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]));
  };

  const saveRoleChanges = async () => {
    if (!roleUser) return;
    const current = (userRolesMap[roleUser.user_id] || []) as any[];
    const toAdd = selectedRoles.filter(r => !current.includes(r));
    // Never remove admin via this UI
    const toRemove = current.filter(r => !selectedRoles.includes(r) && r !== 'admin');
    try {
      for (const r of toAdd) {
        // eslint-disable-next-line no-await-in-loop
        await addRole(roleUser.user_id, r);
      }
      for (const r of toRemove) {
        // eslint-disable-next-line no-await-in-loop
        await removeRole(roleUser.user_id, r as any);
      }
      toast({ title: 'Roles updated' });
      setIsRoleDialogOpen(false);
    } catch {}
  };

  // Settings handlers
  const saveSettings = () => {
    localStorage.setItem('sys_views_tracking', String(viewsTracking));
    localStorage.setItem('sys_force_12h', String(force12h));
    toast({ title: 'Settings saved', description: 'Preferences updated' });
  };

  const checkEmailHealth = async () => {
    try {
      const res = await fetch('/health').catch(() => null);
      if (res && res.ok) {
        setEmailHealth('Email server: Healthy');
      } else {
        setEmailHealth('Email server: Unreachable');
      }
    } catch {
      setEmailHealth('Email server: Unreachable');
    }
  };

  const loadAuditLogs = async (page = 0) => {
    try {
      setAuditLoading(true);
      const { data, error } = await supabase
        .from('audit_logs' as any)
        .select('id, action, actor_email, target, details, created_at')
        .order('created_at', { ascending: false })
        .range(page * auditPageSize, page * auditPageSize + auditPageSize - 1);
      if (error) throw error;
      setAuditLogs(data || []);
    } catch (e: any) {
      // If table doesn't exist, show empty state silently
      setAuditLogs([]);
    } finally {
      setAuditLoading(false);
    }
  };

  return (
    <div className="bg-background">
      <Navigation />
      <div className="pt-16 sm:pt-20 pb-12 sm:pb-16">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Welcome back, <span className="text-primary">{user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'admin'}</span>!
              </h1>
              <span className="text-xs sm:text-sm text-muted-foreground px-2 sm:px-3 py-1 bg-muted rounded-full w-fit">Admin</span>
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">System Admin – Manage users, roles and platform settings</p>
          </div>

          {/* Quick Actions */}
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4 flex items-center">
              <Settings className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Button variant="hero" className="h-16 sm:h-20" onClick={() => setActiveTab('users')}>
              <Users className="w-5 h-5 mr-2" /> Users
            </Button>
            <Button variant="outline" className="h-16 sm:h-20" onClick={() => setActiveTab('roles')}>
              <Shield className="w-5 h-5 mr-2" /> Roles & Access
            </Button>
            <Button variant="outline" className="h-16 sm:h-20" onClick={() => setActiveTab('settings')}>
              <Settings className="w-5 h-5 mr-2" /> System Settings
            </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="users">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="flex items-center"><Users className="w-5 h-5 mr-2" /> All Users</CardTitle>
                  <Button variant="outline" size="sm" onClick={exportUsersCSV}><Download className="w-4 h-4 mr-2" /> Export CSV</Button>
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <div className="text-center py-6 text-muted-foreground">Loading users...</div>
                  ) : usersList.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">No users found</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-2 pr-4">Name</th>
                            <th className="py-2 pr-4">Email</th>
                            <th className="py-2 pr-4">Department</th>
                            <th className="py-2 pr-4">Year</th>
                            <th className="py-2 pr-4">Joined</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map((u) => (
                            <tr key={u.user_id} className="border-t border-border/50">
                              <td className="py-2 pr-4">{(u.first_name || '') + ' ' + (u.last_name || '') || '—'}</td>
                              <td className="py-2 pr-4">{u.email || '—'}</td>
                              <td className="py-2 pr-4">{u.department || '—'}</td>
                              <td className="py-2 pr-4">{u.year || '—'}</td>
                              <td className="py-2 pr-4">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="roles">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><UserCog className="w-5 h-5 mr-2" /> Roles & Access</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Invite user */}
                    <Card className="bg-gradient-subtle border-border">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm flex items-center"><Mail className="w-4 h-4 mr-2" /> Invite user</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input className="h-10 rounded-md border border-border bg-background px-3 text-sm" placeholder="email@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
                          <select className="h-10 rounded-md border border-border bg-background px-3 text-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
                            <option value="organizer">organizer</option>
                            <option value="volunteer">volunteer</option>
                            <option value="participant">participant</option>
                            <option value="staff">staff</option>
                            <option value="coordinator">coordinator</option>
                            <option value="admin">admin</option>
                          </select>
                          <Button disabled={!inviteEmail || sendingInvite} onClick={async () => {
                            try {
                              setSendingInvite(true);
                              const res = await fetch('/api/send-invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: inviteEmail, role: inviteRole }) });
                              const j = await res.json();
                              if (!res.ok || !j.success) throw new Error(j.error || 'Failed');
                              toast({ title: 'Invite sent', description: `${inviteEmail} invited as ${inviteRole}` });
                              setInviteEmail('');
                            } catch (e: any) {
                              toast({ title: 'Failed to send invite', description: e.message || 'Try again', variant: 'destructive' });
                            } finally {
                              setSendingInvite(false);
                            }
                          }}>Send Invite</Button>
                        </div>
                      </CardContent>
                    </Card>

                    <p className="text-sm text-muted-foreground">Click any row below to add/remove roles.</p>

                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-muted-foreground">
                            <th className="py-2 pr-4">User</th>
                            <th className="py-2 pr-4">Roles</th>
                            <th className="py-2 pr-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersList.map((u) => (
                            <tr key={u.user_id} className="border-t border-border/50 hover:bg-muted/30 cursor-pointer" onClick={() => openRolesDialog(u)}>
                              <td className="py-2 pr-4">{(u.first_name || '') + ' ' + (u.last_name || '') || u.email}</td>
                              <td className="py-2 pr-4">
                                {(userRolesMap[u.user_id] || ['participant']).join(', ')}
                              </td>
                              <td className="py-2 pr-4 text-muted-foreground">
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); openRolesDialog(u); }}>Manage</Button>
                                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700" disabled={(userRolesMap[u.user_id] || []).includes('admin')} onClick={(e) => { e.stopPropagation(); if ((userRolesMap[u.user_id] || []).includes('admin')) { toast({ title: 'Not allowed', description: 'Admin users cannot be deleted.', variant: 'destructive' }); return; } setDeleteTarget(u); setIsDeleteDialogOpen(true); }}>
                                    <Trash2 className="w-4 h-4 mr-1" /> Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings">
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Left nav */}
                <Card className="lg:col-span-1 h-fit sticky top-20">
                  <CardContent className="p-3 space-y-2">
                    {(['general','email','security','integrations','audit'] as const).map(p => (
                      <Button key={p} variant={settingsPage === p ? 'hero' : 'outline'} className="w-full justify-start" onClick={() => { setSettingsPage(p); if (p==='audit') loadAuditLogs(0); }}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Button>
                    ))}
                  </CardContent>
                </Card>

                {/* Right content */}
                <div className="lg:col-span-4 space-y-4">
                  {settingsPage === 'general' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>General</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Track event views</div>
                              <div className="text-sm text-muted-foreground">Enable client-side logging to event_views</div>
                            </div>
                            <input type="checkbox" checked={viewsTracking} onChange={(e) => setViewsTracking(e.target.checked)} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Force 12-hour time</div>
                              <div className="text-sm text-muted-foreground">Override to 12h for all users</div>
                            </div>
                            <input type="checkbox" checked={force12h} onChange={(e) => setForce12h(e.target.checked)} />
                          </div>
                          <div className="flex justify-end">
                            <Button onClick={saveSettings}>Save Settings</Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {settingsPage === 'email' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Email & Notifications</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Email server health</div>
                            <div className="text-sm text-muted-foreground">Ping /health on the email microservice</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={checkEmailHealth}>Check</Button>
                            <span className="text-sm text-muted-foreground">{emailHealth}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {settingsPage === 'security' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Security</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Future: 2FA enforcement, session timeouts, IP allowlist.</p>
                      </CardContent>
                    </Card>
                  )}

                  {settingsPage === 'integrations' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Integrations</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">Future: Slack/Webhooks, Resend/SendGrid, Analytics.</p>
                      </CardContent>
                    </Card>
                  )}

                  {settingsPage === 'audit' && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Audit Logs</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {auditLoading ? (
                          <div className="text-center py-6 text-muted-foreground">Loading logs...</div>
                        ) : auditLogs.length === 0 ? (
                          <div className="text-sm text-muted-foreground">No logs to display (or table not configured).</div>
                        ) : (
                          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                            {auditLogs.map(l => (
                              <div key={l.id} className="p-2 rounded border border-border/40 bg-background/60">
                                <div className="text-sm"><span className="text-muted-foreground">{new Date(l.created_at).toLocaleString()}</span> • <strong>{l.actor_email || 'system'}</strong> {l.action}</div>
                                <div className="text-xs text-muted-foreground">Target: {l.target || '—'}</div>
                                {l.details && <pre className="mt-1 text-xs whitespace-pre-wrap break-words">{typeof l.details === 'string' ? l.details : JSON.stringify(l.details)}</pre>}
                              </div>
                            ))}
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" disabled={auditPage<=0} onClick={() => { const p = Math.max(0, auditPage-1); setAuditPage(p); loadAuditLogs(p); }}>Prev</Button>
                              <Button variant="outline" size="sm" onClick={() => { const p = auditPage+1; setAuditPage(p); loadAuditLogs(p); }}>Next</Button>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Roles dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Roles</DialogTitle>
            <DialogDescription>
              {roleUser ? ((roleUser.first_name || '') + ' ' + (roleUser.last_name || '') || roleUser.email) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {(['participant','organizer','volunteer','staff','coordinator','admin'] as const).map(r => (
              <label key={r} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                <span className="capitalize">{r}</span>
                <input type="checkbox" checked={selectedRoles.includes(r)} onChange={() => toggleRole(r)} />
              </label>
            ))}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
              <Button onClick={saveRoleChanges}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              This will permanently delete the user profile and roles. To confirm, type the user's email below and click Delete.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="p-2 rounded bg-muted text-sm text-muted-foreground">{deleteTarget?.email || ((deleteTarget?.first_name || '') + ' ' + (deleteTarget?.last_name || ''))}</div>
            <input className="h-10 rounded-md border border-border bg-background px-3 text-sm w-full" placeholder="Type user email to confirm" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setDeleteConfirm(''); setDeleteTarget(null); }}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" disabled={!deleteTarget || deleteConfirm !== (deleteTarget?.email || '')} onClick={async () => { if (deleteTarget) { await deleteUser(deleteTarget.user_id); setIsDeleteDialogOpen(false); setDeleteConfirm(''); setDeleteTarget(null); } }}>Delete</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


