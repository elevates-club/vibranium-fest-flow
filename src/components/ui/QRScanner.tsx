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
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize the QR code reader
    codeReaderRef.current = new BrowserMultiFormatReader();
    
    return () => {
      // Cleanup on unmount
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setIsScanning(true);
      setScannedData(null);
      setScanResult(null);

      if (!codeReaderRef.current) {
        throw new Error('QR code reader not initialized');
      }

      // Start scanning
      const result = await codeReaderRef.current.decodeFromVideoDevice(
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
        description: "Please allow camera access to scan QR codes.",
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
  };

  const handleQRCodeDetected = async (qrDataString: string) => {
    try {
      setIsProcessing(true);
      stopScanning();

      const qrData = QRCodeService.parseQRCodeData(qrDataString);
      
      if (!qrData) {
        setScanResult('error');
        toast({
          title: "Invalid QR Code",
          description: "The scanned QR code is not valid.",
          variant: "destructive",
        });
        return;
      }

      // Verify user exists and get additional data
      const { data: profile } = await supabase
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
      if (eventId) {
        const { data: registration } = await supabase
          .from('event_registrations')
          .select('*')
          .eq('user_id', qrData.userId)
          .eq('event_id', eventId)
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

  const handleManualEntry = () => {
    const participantId = prompt('Enter Participant ID:');
    if (participantId) {
      // Handle manual entry
      toast({
        title: "Manual Entry",
        description: `Processing manual entry for ID: ${participantId}`,
      });
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
          QR Code Scanner
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Scanner Area */}
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

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!isScanning ? (
            <Button 
              onClick={startScanning}
              className="flex-1"
              disabled={isProcessing}
            >
              <Camera className="w-4 h-4 mr-2" />
              Start Scanning
            </Button>
          ) : (
            <Button 
              onClick={stopScanning}
              variant="outline"
              className="flex-1"
            >
              Stop Scanning
            </Button>
          )}
          
          <Button 
            onClick={handleManualEntry}
            variant="outline"
            size="sm"
          >
            Manual Entry
          </Button>
        </div>

        {scannedData && (
          <Button 
            onClick={resetScanner}
            variant="outline"
            className="w-full"
          >
            Scan Another
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default QRScanner;
