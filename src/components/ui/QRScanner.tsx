import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { QrCode, Camera, CheckCircle, XCircle, User, Mail, Calendar } from 'lucide-react';
import QRCodeService from '@/services/qrCodeService';
import { supabase } from '@/integrations/supabase/client';
import { BrowserMultiFormatReader } from '@zxing/library';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface QRScannerProps {
  eventId?: string;
  onScanSuccess?: (data: any) => void;
  className?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({
  eventId,
  onScanSuccess,
  className = ""
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedData, setScannedData] = useState<any>(null);
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mode, setMode] = useState<'camera' | 'manual'>('camera');
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | undefined>(eventId);
  const [manualCode, setManualCode] = useState('');
  const [zone, setZone] = useState('');
  const [notes, setNotes] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize the QR code reader
    codeReaderRef.current = new BrowserMultiFormatReader();
    fetchEvents();
    
    return () => {
      // Cleanup on unmount
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, title, start_date, end_date')
        .order('start_date', { ascending: true });
      if (!error) setEvents(data || []);
    } catch {}
  };

  const startScanning = async () => {
    try {
      setScannedData(null);
      setScanResult(null);

      if (!codeReaderRef.current) {
        throw new Error('QR code reader not initialized');
      }

      // Request camera access explicitly first (rear camera preferred)
      const constraints: MediaStreamConstraints = {
        video: { facingMode: { ideal: 'environment' } },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);

      // Start scanning with ZXing
      codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, error) => {
          if (result) {
            handleQRCodeDetected(result.getText());
          }
          if (error && error.name !== 'NotFoundException') {
            console.error('QR code scanning error:', error);
          }
        }
      );

    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Access Error",
        description: "Please allow camera access and ensure HTTPS or localhost.",
        variant: "destructive",
      });
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    // Stop camera tracks
    const media = videoRef.current?.srcObject as MediaStream | undefined;
    media?.getTracks().forEach(t => t.stop());
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleQRCodeDetected = async (qrDataString: string) => {
    try {
      setIsProcessing(true);
      stopScanning();

      let qrData = QRCodeService.parseQRCodeData(qrDataString);
      
      // Fallback: treat input as Participant ID (manual entry)
      if (!qrData) {
        const { data: profileByPid } = await (supabase as any)
          .from('profiles')
          .select('*')
          .eq('participant_id', qrDataString)
          .single();

        if (!profileByPid) {
          setScanResult('error');
          toast({
            title: "Failed to scan QR code",
            description: "Invalid QR or Participant ID. Please check and try again.",
            variant: "destructive",
          });
          return;
        }

        qrData = {
          userId: profileByPid.user_id,
          userEmail: profileByPid.email || '',
          userName: `${profileByPid.first_name || ''} ${profileByPid.last_name || ''}`.trim() || 'Participant',
          generatedAt: new Date().toISOString(),
          type: 'user',
          participantId: (profileByPid as any).participant_id
        } as any;
      }

      // Verify user exists and get additional data
      const { data: profile } = await (supabase as any)
        .from('profiles')
        .select('*')
        .eq('user_id', qrData.userId)
        .single();

      if (!profile) {
        setScanResult('error');
        toast({
          title: "User Not Found",
          description: "The user associated with this QR code was not found.",
          variant: "destructive",
        });
        return;
      }

      // Check if user is registered for the event (if eventId provided)
      const targetEventId = selectedEventId || eventId;
      if (targetEventId) {
        const { data: registration } = await supabase
          .from('event_registrations')
          .select('*')
          .eq('user_id', qrData.userId)
          .eq('event_id', targetEventId)
          .single();

        if (!registration) {
          setScanResult('error');
          toast({
            title: "Not Registered",
            description: "This user is not registered for this event.",
            variant: "destructive",
          });
          return;
        }
      }

      setScannedData({
        ...qrData,
        profile,
        scannedAt: new Date().toISOString()
      });
      setScanResult('success');

      toast({
        title: "QR Code Scanned Successfully",
        description: `Welcome, ${qrData.userName}!`,
      });

      if (onScanSuccess) {
        onScanSuccess({ ...qrData, profile });
      }

    } catch (error) {
      console.error('Error processing QR code:', error);
      setScanResult('error');
      toast({
        title: "Scan Error",
        description: "An error occurred while processing the QR code.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualEntry = async () => {
    if (!manualCode) return;
    await handleQRCodeDetected(manualCode);
  };

  const handleCheckIn = async () => {
    try {
      if (!scannedData || !(selectedEventId || eventId)) return;
      const targetEventId = selectedEventId || eventId!;

      // Update registration as checked_in
      const { error: updErr } = await supabase
        .from('event_registrations')
        .update({ checked_in: true })
        .eq('event_id', targetEventId)
        .eq('user_id', scannedData.userId);
      if (updErr) throw updErr;

      // Optional: log check-in row if table exists
      await (supabase as any)
        .from('check_in_logs')
        .insert({
          event_id: targetEventId,
          user_id: scannedData.userId,
          qr_code: scannedData.participantId || null,
          zone: zone || null,
          notes: notes || null,
          check_in_time: new Date().toISOString()
        });

      toast({ title: 'Checked In', description: `${scannedData.userName} checked in successfully.` });
    } catch (e) {
      console.error(e);
      toast({ title: 'Check-in failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const resetScanner = () => {
    setScannedData(null);
    setScanResult(null);
    setIsProcessing(false);
  };

  return (
    <Card className={`w-full max-w-md mx-auto ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="w-5 h-5" />
          Participant Check-in
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Event Select */}
        <div>
          <Label className="text-sm font-medium">Select Event *</Label>
          <Select value={selectedEventId} onValueChange={(v) => setSelectedEventId(v)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choose event for check-in" />
            </SelectTrigger>
            <SelectContent>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Mode Switch */}
        <div className="grid grid-cols-2 gap-2">
          <Button variant={mode === 'camera' ? 'default' : 'outline'} onClick={() => setMode('camera')}>📷 Camera Scan</Button>
          <Button variant={mode === 'manual' ? 'default' : 'outline'} onClick={() => setMode('manual')}>🧾 Manual Entry</Button>
        </div>

        {/* Scanner Area */}
        {mode === 'camera' ? (
          <div className="relative">
            {!isScanning ? (
              <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300">
                <div className="text-center">
                  <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Camera not active</p>
                </div>
              </div>
            ) : (
              <div className="relative aspect-square rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />
                <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none">
                  <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-primary"></div>
                  <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-primary"></div>
                  <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-primary"></div>
                  <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-primary"></div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <Label>QR Code / Participant ID *</Label>
            <Input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Enter QR code or participant ID" />
            <p className="text-xs text-muted-foreground">Enter the code from the participant's digital pass</p>
          </div>
        )}

        {/* Scan Result */}
        {scanResult && (
          <Alert className={scanResult === 'success' ? 'border-green-500' : 'border-red-500'}>
            <div className="flex items-center gap-2">
              {scanResult === 'success' ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <AlertDescription>
                {scanResult === 'success' ? 'QR Code scanned successfully!' : 'Failed to scan QR code'}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Scanned Data Display */}
        {scannedData && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-800">
                    {scannedData.userName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    {scannedData.userEmail}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-green-700">
                    Scanned: {new Date(scannedData.scannedAt).toLocaleString()}
                  </span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {scannedData.type === 'event_registration' ? 'Event Registration' : 'User Pass'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Zone and Notes */}
        <div className="space-y-2">
          <Label>Zone (Optional)</Label>
          <Input placeholder="e.g., Main Hall, Lab A" value={zone} onChange={(e) => setZone(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Notes (Optional)</Label>
          <Textarea placeholder="Any additional notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {/* Action Buttons */}
        {mode === 'camera' ? (
          <div className="flex gap-2">
            {!isScanning ? (
              <Button onClick={startScanning} className="flex-1" disabled={isProcessing || !selectedEventId && !eventId}>
                <Camera className="w-4 h-4 mr-2" />
                Start Camera Scan
              </Button>
            ) : (
              <Button onClick={stopScanning} variant="outline" className="flex-1">
                Stop Scanning
              </Button>
            )}
          </div>
        ) : (
          <Button onClick={handleManualEntry} disabled={!manualCode || !selectedEventId && !eventId}>
            Check In Participant
          </Button>
        )}

        {scannedData && (
          <div className="space-y-2">
            <Button onClick={handleCheckIn} disabled={!selectedEventId && !eventId}>Check In Participant</Button>
            <Button onClick={resetScanner} variant="outline" className="w-full">Scan Another</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QRScanner;
