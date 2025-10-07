import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { QrCode, CheckCircle, Keyboard, Camera } from 'lucide-react';
import QRCodeService from '@/services/qrCodeService';
// Removed global events; we will load only assigned events for this volunteer
import QRScannerCamera from './QRScannerCamera';

interface QRScannerProps {
  onCheckInSuccess?: () => void;
  onScanSuccess?: (data: any) => void;
}

export default function QRScanner({ onCheckInSuccess, onScanSuccess }: QRScannerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignedEvents, setAssignedEvents] = useState<any[]>([]);
  const [qrCode, setQrCode] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [zone, setZone] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [scanMode, setScanMode] = useState<'camera' | 'manual'>('camera');

  // Load only events assigned to this volunteer
  useEffect(() => {
    const loadAssigned = async () => {
      if (!user?.id) return;
      const { data } = await (supabase as any)
        .from('event_volunteers')
        .select('events:events(id, title, start_date, location)')
        .eq('user_id', user.id);
      const evs = (data || []).map((r: any) => r.events).filter(Boolean);
      setAssignedEvents(evs);
    };
    void loadAssigned();
  }, [user]);

  const handleQRCodeDetected = (qrCodeText: string) => {
    console.log('QR Code detected:', {
      raw: qrCodeText,
      trimmed: qrCodeText.trim(),
      length: qrCodeText.length,
      type: typeof qrCodeText
    });
    setQrCode(qrCodeText);
    toast({
      title: "QR Code Detected",
      description: "QR code scanned successfully. Select event and submit.",
    });
  };

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
      const trimmedToken = qrCode.trim();
      
      console.log('Processing QR code:', {
        original: qrCode,
        trimmed: trimmedToken,
        length: trimmedToken.length
      });

      let profile = null;
      let userId = null;

      // Try to parse as JSON first (old format)
      try {
        const qrData = JSON.parse(trimmedToken);
        if (qrData.userId) {
          console.log('Detected old JSON format QR code:', qrData);
          userId = qrData.userId;
          
          // Get profile by user_id
          const { data: jsonProfile, error: jsonError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name, participant_id, qr_code')
            .eq('user_id', userId)
            .maybeSingle();
          
          if (jsonProfile) {
            profile = jsonProfile;
            console.log('Found profile from JSON format:', profile);
          }
        }
      } catch (jsonError) {
        console.log('Not JSON format, trying token format');
      }

      // If not found via JSON, try token format (new format)
      if (!profile) {
        console.log('Trying token format lookup...');
        
        // Try qr_code field first
        const { data: qrProfile, error: qrError } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, participant_id, qr_code')
          .eq('qr_code', trimmedToken)
          .maybeSingle();

        if (qrProfile) {
          profile = qrProfile;
          console.log('Found profile by qr_code:', profile);
        } else {
          // Try participant_id
          const { data: pidProfile, error: pidError } = await supabase
        .from('profiles')
            .select('user_id, first_name, last_name, participant_id, qr_code')
            .eq('participant_id', trimmedToken)
            .maybeSingle();
          
          if (pidProfile) {
            profile = pidProfile;
            console.log('Found profile by participant_id:', profile);
          }
        }
      }

      if (!profile) {
        console.error('No profile found for QR token:', trimmedToken);
        toast({
          title: "Invalid QR Code",
          description: `No participant found with QR code "${trimmedToken}". Please ensure the QR code is valid and try again.`,
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

      if (updateError) {
        console.error('Check-in update error:', updateError);
        throw updateError;
      }

      // Create check-in log (optional - don't fail if this errors)
      try {
        const logData = {
          event_id: selectedEvent,
          user_id: profile.user_id,
          volunteer_id: user?.id || null,
          qr_code: trimmedToken,
          zone: zone || null,
          notes: notes || null,
          check_in_time: new Date().toISOString()
        };
        
        console.log('Creating check-in log:', logData);
        
        const { error: logError } = await supabase
          .from('check_in_logs')
          .insert(logData);
          
        if (logError) {
          console.warn('Check-in log error (non-critical):', logError);
        } else {
          console.log('Check-in log created successfully');
        }
      } catch (logError) {
        console.warn('Check-in log error (non-critical):', logError);
        // Don't throw - log is optional
      }

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
      if (onScanSuccess) {
        onScanSuccess({ profile, registration });
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
            <CardTitle>Participant Check-in</CardTitle>
            <CardDescription>Scan QR codes or enter manually to check in participants</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCheckIn} className="space-y-4">
          {/* Event Selection - REQUIRED FIRST */}
          <div className="space-y-2">
            <Label htmlFor="event">Select Event *</Label>
            <Select value={selectedEvent} onValueChange={setSelectedEvent} required>
              <SelectTrigger>
                <SelectValue placeholder="Choose event for check-in" />
              </SelectTrigger>
              <SelectContent>
                {assignedEvents.length === 0 ? (
                  <SelectItem disabled value="none">No assigned events</SelectItem>
                ) : (
                  assignedEvents.map((event: any) => (
                    <SelectItem key={event.id} value={event.id}>
                      {event.title}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Scan Mode Tabs */}
          <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as 'camera' | 'manual')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="camera">
                <Camera className="mr-2 h-4 w-4" />
                Camera Scan
              </TabsTrigger>
              <TabsTrigger value="manual">
                <Keyboard className="mr-2 h-4 w-4" />
                Manual Entry
              </TabsTrigger>
            </TabsList>

            <TabsContent value="camera" className="space-y-4 mt-4">
              <QRScannerCamera 
                onQRCodeDetected={handleQRCodeDetected}
                isProcessing={processing}
              />
              {qrCode && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">
                    <CheckCircle className="inline h-4 w-4 mr-1" />
                    QR Code Ready: {qrCode.substring(0, 20)}...
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="qrCode">QR Code / Participant ID *</Label>
                <Input
                  id="qrCode"
                  value={qrCode}
                  onChange={(e) => setQrCode(e.target.value)}
                  placeholder="Enter QR code or participant ID"
                  required
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  Enter the code from the participant's digital pass
                </p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Optional Fields */}
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

          <Button type="submit" disabled={processing || !selectedEvent} className="w-full">
            <CheckCircle className="mr-2 h-4 w-4" />
            {processing ? 'Processing...' : 'Check In Participant'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
