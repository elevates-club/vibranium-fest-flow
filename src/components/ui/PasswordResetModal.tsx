import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react';

interface PasswordResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  email?: string;
}

const PasswordResetModal = ({ isOpen, onClose, email }: PasswordResetModalProps) => {
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: email || '',
    code: '',
    password: '',
    confirmPassword: ''
  });
  const { toast } = useToast();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Generate a simple 6-digit code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store the reset code in localStorage (in production, use a secure backend)
      localStorage.setItem('passwordResetCode', resetCode);
      localStorage.setItem('passwordResetEmail', formData.email);
      localStorage.setItem('passwordResetExpiry', (Date.now() + 10 * 60 * 1000).toString()); // 10 minutes

      // In a real app, you would send this code via email/SMS
      // For now, we'll show it in a toast (remove this in production)
      toast({
        title: "Reset Code Generated",
        description: `Your reset code is: ${resetCode}. This is for demo purposes only.`,
        duration: 10000,
      });

      setStep('code');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate reset code",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const storedCode = localStorage.getItem('passwordResetCode');
      const storedEmail = localStorage.getItem('passwordResetEmail');
      const expiry = localStorage.getItem('passwordResetExpiry');

      if (!storedCode || !storedEmail || !expiry) {
        throw new Error('Reset code not found or expired');
      }

      if (Date.now() > parseInt(expiry)) {
        localStorage.removeItem('passwordResetCode');
        localStorage.removeItem('passwordResetEmail');
        localStorage.removeItem('passwordResetExpiry');
        throw new Error('Reset code has expired');
      }

      if (formData.code !== storedCode) {
        throw new Error('Invalid reset code');
      }

      if (storedEmail !== formData.email) {
        throw new Error('Email does not match');
      }

      setStep('password');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (formData.password !== formData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      const storedEmail = localStorage.getItem('passwordResetEmail');
      if (!storedEmail) {
        throw new Error('Reset session expired');
      }

      // Update password using Supabase
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      });

      if (error) throw error;

      // Clean up stored data
      localStorage.removeItem('passwordResetCode');
      localStorage.removeItem('passwordResetEmail');
      localStorage.removeItem('passwordResetExpiry');

      toast({
        title: "Password Updated Successfully!",
        description: "Your password has been reset. You can now sign in with your new password.",
      });

      onClose();
      setStep('email');
      setFormData({ email: '', code: '', password: '', confirmPassword: '' });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setStep('email');
    setFormData({ email: '', code: '', password: '', confirmPassword: '' });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <KeyRound className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="break-words">
              {step === 'email' && 'Reset Password'}
              {step === 'code' && 'Enter Reset Code'}
              {step === 'password' && 'Set New Password'}
            </span>
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {step === 'email' && 'Enter your email address to receive a reset code'}
            {step === 'code' && 'Enter the 6-digit code sent to your email'}
            {step === 'password' && 'Create a new password for your account'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto">
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button variant="outline" onClick={handleClose} className="w-full sm:flex-1">
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="w-full sm:flex-1">
                  {isLoading ? 'Sending...' : 'Send Reset Code'}
                </Button>
              </div>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Reset Code</Label>
                <Input
                  id="code"
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="123456"
                  maxLength={6}
                  className="text-center text-2xl tracking-widest"
                  required
                />
                <p className="text-xs text-muted-foreground text-center">
                  Check your email for the 6-digit code
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button variant="outline" onClick={() => setStep('email')} className="w-full sm:flex-1">
                  Back
                </Button>
                <Button type="submit" disabled={isLoading} className="w-full sm:flex-1">
                  {isLoading ? 'Verifying...' : 'Verify Code'}
                </Button>
              </div>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Enter new password"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm new password"
                  required
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button variant="outline" onClick={() => setStep('code')} className="w-full sm:flex-1">
                  Back
                </Button>
                <Button type="submit" disabled={isLoading} className="w-full sm:flex-1">
                  {isLoading ? 'Updating...' : 'Update Password'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordResetModal;
