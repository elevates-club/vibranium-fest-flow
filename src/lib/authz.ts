import { supabase } from '@/integrations/supabase/client';

export type UserLike = { id: string } | null | undefined;

export const getUserRoles = async (userId: string): Promise<string[]> => {
  const { data } = await (supabase as any)
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  return (data || []).map((r: any) => r.role);
};

export const getStaffDepartment = async (userId: string): Promise<string | undefined> => {
  const { data } = await (supabase as any)
    .from('event_staff')
    .select('department')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.department;
};

export const isCoordinatorForEvent = async (userId: string, eventId: string): Promise<boolean> => {
  const { data } = await (supabase as any)
    .from('event_coordinators')
    .select('id')
    .eq('user_id', userId)
    .eq('event_id', eventId)
    .maybeSingle();
  return !!data;
};

export const canEditEvent = async (user: UserLike, event: { id?: string; department?: string }): Promise<boolean> => {
  if (!user?.id) return false;
  const roles = await getUserRoles(user.id);
  if (roles.includes('admin')) return true;
  if (roles.includes('coordinator') && event.id) {
    if (await isCoordinatorForEvent(user.id, event.id)) return true;
  }
  if (roles.includes('staff') && event.department) {
    const dept = await getStaffDepartment(user.id);
    if (dept && dept === event.department) return true;
  }
  return false;
};

export const canModerateRegistration = async (user: UserLike, eventId: string): Promise<boolean> => {
  if (!user?.id) return false;
  const roles = await getUserRoles(user.id);
  if (roles.includes('admin')) return true;
  if (roles.includes('coordinator')) {
    return await isCoordinatorForEvent(user.id, eventId);
  }
  return false;
};
