import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { LogIn, UserPlus, Lock, Users } from 'lucide-react';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle?: string;
}

const LoginPromptModal = ({ isOpen, onClose, eventTitle }: LoginPromptModalProps) => {
  const navigate = useNavigate();

  const handleLogin = () => {
    onClose();
    navigate('/auth');
  };

  const handleSignUp = () => {
    onClose();
    navigate('/auth');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Login Required
          </DialogTitle>
          <DialogDescription>
            {eventTitle 
              ? `You need to be logged in to register for "${eventTitle}". Please sign in or create an account to continue.`
              : "You need to be logged in to register for events. Please sign in or create an account to continue."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Benefits of logging in */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm">Why create an account?</h4>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>Register for events and track your participation</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <span>Secure access to your event history and certificates</span>
              </div>
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                <span>Join the techfest community and earn rewards</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Maybe Later
            </Button>
            <Button 
              variant="hero" 
              onClick={handleSignUp}
              className="flex-1"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create Account
            </Button>
            <Button 
              onClick={handleLogin}
              className="flex-1"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LoginPromptModal;
