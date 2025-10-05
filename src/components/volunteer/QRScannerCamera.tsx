import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Camera, CheckCircle, XCircle } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/library';

interface QRScannerCameraProps {
  onQRCodeDetected: (qrCode: string) => void;
  isProcessing: boolean;
}

const QRScannerCamera: React.FC<QRScannerCameraProps> = ({
  onQRCodeDetected,
  isProcessing
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader();
    
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const startScanning = async () => {
    try {
      setCameraError(null);
      setIsScanning(true);

      if (!codeReaderRef.current || !videoRef.current) {
        throw new Error('QR code reader not initialized');
      }

      await codeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, error) => {
          if (result) {
            const qrCodeText = result.getText();
            onQRCodeDetected(qrCodeText);
            stopScanning();
          }
          // Ignore NotFoundException - it just means no QR code is visible yet
          if (error && error.name !== 'NotFoundException') {
            console.warn('QR scanning error:', error.message);
          }
        }
      );

    } catch (error: any) {
      console.error('Error accessing camera:', error);
      setCameraError(error.message || 'Failed to access camera');
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

  return (
    <div className="space-y-4">
      {/* Scanner Area */}
      <div className="relative">
        {!isScanning ? (
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border">
            <div className="text-center">
              <Camera className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Camera not active</p>
            </div>
          </div>
        ) : (
          <div className="relative aspect-video rounded-lg overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />
            <div className="absolute inset-0 border-4 border-primary rounded-lg pointer-events-none">
              <div className="absolute top-2 left-2 w-8 h-8 border-t-4 border-l-4 border-primary"></div>
              <div className="absolute top-2 right-2 w-8 h-8 border-t-4 border-r-4 border-primary"></div>
              <div className="absolute bottom-2 left-2 w-8 h-8 border-b-4 border-l-4 border-primary"></div>
              <div className="absolute bottom-2 right-2 w-8 h-8 border-b-4 border-r-4 border-primary"></div>
            </div>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm">
              Position QR code in frame
            </div>
          </div>
        )}
      </div>

      {/* Camera Error */}
      {cameraError && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{cameraError}</AlertDescription>
        </Alert>
      )}

      {/* Camera Controls */}
      <div className="flex gap-2">
        {!isScanning ? (
          <Button 
            onClick={startScanning}
            className="flex-1"
            disabled={isProcessing}
            type="button"
          >
            <Camera className="mr-2 h-4 w-4" />
            Start Camera Scan
          </Button>
        ) : (
          <Button 
            onClick={stopScanning}
            variant="outline"
            className="flex-1"
            type="button"
          >
            Stop Camera
          </Button>
        )}
      </div>
    </div>
  );
};

export default QRScannerCamera;
