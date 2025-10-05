import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Account = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [customDepartment, setCustomDepartment] = useState('');
  const [year, setYear] = useState('');
  const [customYear, setCustomYear] = useState('');
  const [college, setCollege] = useState('');
  const [gender, setGender] = useState('');
  const [customGender, setCustomGender] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [initialProfile, setInitialProfile] = useState<any | null>(null);

  const normalizeYear = (val: any): { yearValue: string; custom?: string } => {
    if (!val) return { yearValue: '' };
    const raw = String(val).trim().toLowerCase();
    if (["1", "1st", "first", "first year", "1st year"].includes(raw)) return { yearValue: '1st Year' };
    if (["2", "2nd", "second", "second year", "2nd year"].includes(raw)) return { yearValue: '2nd Year' };
    if (["3", "3rd", "third", "third year", "3rd year"].includes(raw)) return { yearValue: '3rd Year' };
    if (["4", "4th", "fourth", "fourth year", "final", "final year", "4th year"].includes(raw)) return { yearValue: '4th Year' };
    // Unknown → set as Other and keep custom text with original value
    return { yearValue: 'Other', custom: String(val) };
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setProfileLoading(true);
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, phone, department, year, college, gender')
        .eq('user_id', user.id)
        .maybeSingle();
      if (profile) {
        setFirstName((profile as any).first_name || '');
        setLastName((profile as any).last_name || '');
        setEmail((profile as any).email || user.email || '');
        setPhone((profile as any).phone || '');
        setDepartment((profile as any).department || '');
        const yr = (profile as any).year;
        if (yr) {
          const norm = normalizeYear(yr);
          setYear(norm.yearValue);
          if (norm.custom) setCustomYear(norm.custom);
        } else {
          setYear('');
        }
        setCollege((profile as any).college || '');
        setGender((profile as any).gender || '');
        setInitialProfile({
          first_name: (profile as any).first_name || '',
          last_name: (profile as any).last_name || '',
          email: (profile as any).email || user.email || '',
          phone: (profile as any).phone || '',
          department: (profile as any).department || '',
          year: (profile as any).year || '',
          college: (profile as any).college || '',
          gender: (profile as any).gender || '',
        });
      } else {
        setEmail(user.email || '');
        setInitialProfile({
          first_name: '',
          last_name: '',
          email: user.email || '',
          phone: '',
          department: '',
          year: '',
          college: '',
          gender: '',
        });
      }

      // Fallbacks from auth.user.user_metadata if profile fields are empty
      const { data: authUser } = await supabase.auth.getUser();
      const meta: any = authUser?.user?.user_metadata || {};
      if (!firstName && meta.first_name) setFirstName(meta.first_name);
      if (!lastName && meta.last_name) setLastName(meta.last_name);
      if (!phone && meta.phone) setPhone(meta.phone);
      if (!department && meta.department) setDepartment(meta.department);
      if (!year && meta.year) {
        const norm = normalizeYear(meta.year);
        setYear(norm.yearValue);
        if (norm.custom) setCustomYear(norm.custom);
      }
      if (!college && meta.college) setCollege(meta.college);
      if (!gender && meta.gender) setGender(meta.gender);

      setProfileLoading(false);
    };
    loadProfile();
  }, [user]);

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      setLoading(true);
      // Update profiles table
      const resolvedDepartment = department === 'Other' ? customDepartment : department;
      const resolvedYear = year === 'Other' ? customYear : year;
      const resolvedGender = gender === 'Other' ? customGender : gender;

      const upsertPayload: any = {
        user_id: user.id,
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        department: resolvedDepartment,
        year: resolvedYear,
        college,
        gender: resolvedGender,
        updated_at: new Date().toISOString(),
      };
      const { error: upsertErr } = await supabase.from('profiles').upsert(upsertPayload, { onConflict: 'user_id' });
      if (upsertErr) throw upsertErr;

      // If email changed, update auth email
      if (email && email !== (user.email || '')) {
        const { error: authErr } = await supabase.auth.updateUser({ email });
        if (authErr) throw authErr;
      }

      // Also mirror core fields into auth user_metadata for consistency
      await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          department: resolvedDepartment,
          year: resolvedYear,
          college,
          gender: resolvedGender,
        }
      });

      toast({ title: 'Profile saved', description: 'Your details have been updated.' });
    } catch (e: any) {
      toast({ title: 'Failed to save profile', description: e.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user) return;
    if (!newPassword || newPassword.length < 6) {
      toast({ title: 'Invalid password', description: 'Use at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Confirm your new password.', variant: 'destructive' });
      return;
    }
    try {
      setLoading(true);
      // Supabase does not require current password for update when session is valid
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Password updated', description: 'Your password has been changed.' });
    } catch (e: any) {
      toast({ title: 'Failed to update password', description: e.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancelProfile = () => {
    if (!initialProfile) return;
    setFirstName(initialProfile.first_name || '');
    setLastName(initialProfile.last_name || '');
    setEmail(initialProfile.email || '');
    setPhone(initialProfile.phone || '');
    setDepartment(initialProfile.department || '');
    setYear(initialProfile.year || '');
    setCollege(initialProfile.college || '');
    setGender(initialProfile.gender || '');
    setCustomDepartment('');
    setCustomYear('');
    setCustomGender('');
  };

  const handleCancelPassword = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="pt-20 px-3 sm:px-4 lg:px-8 max-w-4xl mx-auto w-full">
      <div className="space-y-4">
        <Card className="bg-background/60 backdrop-blur-md border-border/40">
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-lg sm:text-xl">Account Center</CardTitle>
              <CardDescription>Manage your profile and security</CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Close">
              <X className="w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} disabled={profileLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} disabled={profileLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} disabled={profileLoading} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={profileLoading} />
            </div>
            <div className="space-y-2">
              <Label>Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</SelectItem>
                  <SelectItem value="Computer Science Engineering in Cyber Security">Computer Science Engineering in Cyber Security</SelectItem>
                  <SelectItem value="Civil Engineering">Civil Engineering</SelectItem>
                  <SelectItem value="Electronics & Communication Engineering">Electronics & Communication Engineering</SelectItem>
                  <SelectItem value="Safety & Fire Engineering">Safety & Fire Engineering</SelectItem>
                  <SelectItem value="Computer Science & Engineering">Computer Science & Engineering</SelectItem>
                  <SelectItem value="Computer Science & Business Systems">Computer Science & Business Systems</SelectItem>
                  <SelectItem value="Mechanical Engineering">Mechanical Engineering</SelectItem>
                  <SelectItem value="Science & Humanities">Science & Humanities</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {department === 'Other' && (
                <Input placeholder="Type your department" value={customDepartment} onChange={(e) => setCustomDepartment(e.target.value)} />
              )}
            </div>
            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1st Year">1st Year</SelectItem>
                  <SelectItem value="2nd Year">2nd Year</SelectItem>
                  <SelectItem value="3rd Year">3rd Year</SelectItem>
                  <SelectItem value="4th Year">4th Year</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {year === 'Other' && (
                <Input placeholder="Type your year" value={customYear} onChange={(e) => setCustomYear(e.target.value)} />
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="college">College</Label>
              <Input id="college" value={college} onChange={(e) => setCollege(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
              {gender === 'Other' && (
                <Input placeholder="Type your gender" value={customGender} onChange={(e) => setCustomGender(e.target.value)} />
              )}
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={handleCancelProfile} disabled={loading}>
                Cancel
              </Button>
              <Button variant="hero" onClick={handleSaveProfile} disabled={loading || profileLoading}>
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background/60 backdrop-blur-md border-border/40">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg sm:text-xl">Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input id="currentPassword" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
            </div>
            <div className="sm:col-span-2 flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={handleCancelPassword} disabled={loading}>
                Cancel
              </Button>
              <Button variant="secondary" onClick={handleChangePassword} disabled={loading}>
                Update Password
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Account;


