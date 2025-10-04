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
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Lock className="w-5 h-5 text-primary flex-shrink-0" />
            <span className="break-words">Login Required</span>
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            {eventTitle 
              ? `You need to be logged in to register for "${eventTitle}". Please sign in or create an account to continue.`
              : "You need to be logged in to register for events. Please sign in or create an account to continue."
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto">
          {/* Benefits of logging in */}
          <div className="bg-muted/50 p-3 sm:p-4 rounded-lg space-y-3">
            <h4 className="font-semibold text-sm sm:text-base">Why create an account?</h4>
            <div className="space-y-2 text-xs sm:text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="break-words">Register for events and track your participation</span>
              </div>
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="break-words">Secure access to your event history and certificates</span>
              </div>
              <div className="flex items-start gap-2">
                <UserPlus className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span className="break-words">Join the techfest community and earn rewards</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="w-full sm:flex-1"
            >
              Maybe Later
            </Button>
            <Button 
              variant="hero" 
              onClick={handleSignUp}
              className="w-full sm:flex-1"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Create Account
            </Button>
            <Button 
              onClick={handleLogin}
              className="w-full sm:flex-1"
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
