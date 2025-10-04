import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, CheckCircle } from 'lucide-react';
import { useEvents } from '@/hooks/useEvents';

interface QRScannerProps {
  onCheckInSuccess?: () => void;
}

export default function QRScanner({ onCheckInSuccess }: QRScannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { events } = useEvents();
  const [qrCode, setQrCode] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [zone, setZone] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!qrCode || !selectedEvent) {
      toast({
        title: "Missing Information",
        description: "Please enter QR code and select an event",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);

    try {
      // Find user by QR code
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .eq('qr_code', qrCode)
        .single();

      if (profileError || !profile) {
        toast({
          title: "Invalid QR Code",
          description: "No user found with this QR code",
          variant: "destructive"
        });
        setProcessing(false);
        return;
      }

      // Check if user is registered for this event
      const { data: registration, error: regError } = await supabase
        .from('event_registrations')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('event_id', selectedEvent)
        .single();

      if (regError || !registration) {
        toast({
          title: "Not Registered",
          description: "This user is not registered for the selected event",
          variant: "destructive"
        });
        setProcessing(false);
        return;
      }

      // Check if already checked in
      if (registration.checked_in) {
        toast({
          title: "Already Checked In",
          description: `${profile.first_name} ${profile.last_name} was already checked in`,
          variant: "destructive"
        });
        setProcessing(false);
        return;
      }

      // Update registration to checked in
      const { error: updateError } = await supabase
        .from('event_registrations')
        .update({
          checked_in: true,
          check_in_time: new Date().toISOString()
        })
        .eq('id', registration.id);

      if (updateError) throw updateError;

      // Create check-in log
      const { error: logError } = await supabase
        .from('check_in_logs')
        .insert({
          event_id: selectedEvent,
          user_id: profile.user_id,
          volunteer_id: user?.id,
          qr_code: qrCode,
          zone: zone || null,
          notes: notes || null
        });

      if (logError) throw logError;

      toast({
        title: "Check-in Successful!",
        description: `${profile.first_name} ${profile.last_name} has been checked in`,
      });

      // Reset form
      setQrCode('');
      setZone('');
      setNotes('');
      
      if (onCheckInSuccess) {
        onCheckInSuccess();
      }
    } catch (error: any) {
      console.error('Check-in error:', error);
      toast({
        title: "Check-in Failed",
        description: error.message || "Failed to process check-in",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <QrCode className="h-6 w-6" />
          <div>
            <CardTitle>QR Code Check-in</CardTitle>
            <CardDescription>Scan participant QR codes to check them in</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCheckIn} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event">Event *</Label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent} required>
              <SelectTrigger>
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={event.id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qrCode">QR Code *</Label>
            <Input
              id="qrCode"
              value={qrCode}
              onChange={(e) => setQrCode(e.target.value)}
              placeholder="Enter or scan QR code"
              required
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              Enter the QR code from the participant's profile
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zone">Zone (Optional)</Label>
            <Input
              id="zone"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="e.g., Main Hall, Lab A"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={processing} className="w-full">
            <CheckCircle className="mr-2 h-4 w-4" />
            {processing ? 'Processing...' : 'Check In Participant'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
