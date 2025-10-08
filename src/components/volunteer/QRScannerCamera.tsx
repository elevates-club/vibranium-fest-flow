import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Camera, CheckCircle, XCircle, ShieldCheck, Lock, Pause, Play } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface QRScannerCameraProps {
  onQRCodeDetected: (qrCode: string) => void;
  isProcessing: boolean;
}

type CameraStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'scanning' | 'paused' | 'error';

const QRScannerCamera: React.FC<QRScannerCameraProps> = ({
  onQRCodeDetected,
  isProcessing
}) => {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isProcessingQR, setIsProcessingQR] = useState(false); // Prevent multiple scans
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivId = useRef(`qr-reader-${Math.random().toString(36).substr(2, 9)}`);
  const lastDecodedRef = useRef<{ text: string; ts: number } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check camera permission on mount
    checkCameraPermission();
    
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current && (cameraStatus === 'scanning' || cameraStatus === 'paused')) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const checkCameraPermission = async () => {
    try {
      // Check if Permissions API is available
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
        if (result.state === 'granted') {
          setPermissionGranted(true);
          setCameraStatus('granted');
        } else if (result.state === 'denied') {
          setCameraStatus('denied');
        }
      }
    } catch (error) {
      console.log('Permissions API not available, will request on button click');
    }
  };

  const requestCameraAccess = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
      }

      // Check for HTTPS (required by most browsers)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
        console.warn('Camera access typically requires HTTPS. Current protocol:', window.location.protocol);
      }

      setCameraStatus('requesting');
      setCameraError(null);

      // Request camera access with proper constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      // Permission granted - stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
      setPermissionGranted(true);
      setCameraStatus('granted');
      
      toast({
        title: "Camera Access Granted ✓",
        description: "You can now start scanning QR codes.",
      });

    } catch (error: any) {
      console.error('Camera permission error:', error);
      setCameraStatus('denied');
      
      let errorMsg = 'Failed to access camera';
      let errorTitle = 'Camera Access Error';
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = 'Camera access denied. Please click the camera icon in your browser\'s address bar and allow camera access, then click "Request Camera Access Again".';
        errorTitle = 'Permission Denied';
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        errorMsg = 'No camera found on this device. Please ensure your device has a working camera.';
        errorTitle = 'No Camera Found';
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        errorMsg = 'Camera is already in use by another application. Please close other apps using the camera and try again.';
        errorTitle = 'Camera In Use';
      } else if (error.name === 'OverconstrainedError' || error.name === 'ConstraintNotSatisfiedError') {
        errorMsg = 'Camera constraints not satisfied. Your camera may not support the requested settings.';
        errorTitle = 'Camera Settings Error';
      } else if (error.name === 'NotSupportedError') {
        errorMsg = 'Camera access is not supported in this browser. Please use Chrome, Firefox, or Safari.';
        errorTitle = 'Browser Not Supported';
      } else if (error.name === 'SecurityError') {
        errorMsg = 'Camera access blocked due to security settings. Please ensure you\'re using HTTPS or localhost.';
        errorTitle = 'Security Error';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setCameraError(errorMsg);
      toast({
        title: errorTitle,
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const startScanning = async () => {
    try {
      setCameraError(null);
      
      // First set status to scanning to render the DOM element
      setCameraStatus('scanning');

      // CRITICAL: Wait for React to render the DOM element
      await new Promise(resolve => setTimeout(resolve, 300));

      const element = document.getElementById(scannerDivId.current);
      
      if (!element) {
        throw new Error('Scanner element not found in DOM. Please try again.');
      }

      // Stop any existing scanner first
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
          scannerRef.current = null;
        } catch (e) {
          // ignore
        }
      }

      // Initialize new scanner
      scannerRef.current = new Html5Qrcode(scannerDivId.current);

      // Check if cameras are available
      const cameras = await Html5Qrcode.getCameras();
      
      if (cameras.length === 0) {
        throw new Error('No cameras available on this device');
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // Start scanning
      await scannerRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Suppress rapid duplicates (same text within 2s)
          const now = Date.now();
          if (lastDecodedRef.current && lastDecodedRef.current.text === decodedText && now - lastDecodedRef.current.ts < 2000) {
            return;
          }
          lastDecodedRef.current = { text: decodedText, ts: now };

          if (!isProcessingQR) {
            setIsProcessingQR(true);
            onQRCodeDetected(decodedText);
            // Pause (not destroy) camera immediately after detection
            pauseScanning();
          }
        },
        () => {}
      );

      setIsProcessingQR(false); // Reset processing flag

    } catch (error: any) {
      console.error('Error starting scanner:', error);
      
      let errorMsg = 'Failed to start scanner';
      let errorTitle = 'Scanner Error';
      
      if (error.message?.includes('NotAllowedError') || error.message?.includes('Permission')) {
        errorMsg = 'Camera permission not granted. Please allow camera access first.';
        errorTitle = 'Permission Required';
        setCameraStatus('denied');
        setPermissionGranted(false);
      } else if (error.message?.includes('NotFoundError') || error.message?.includes('No cameras')) {
        errorMsg = 'No camera found. Please ensure your device has a working camera.';
        errorTitle = 'Camera Not Found';
        setCameraStatus('error');
      } else if (error.message?.includes('NotReadableError')) {
        errorMsg = 'Camera is in use by another application. Please close other apps and try again.';
        errorTitle = 'Camera In Use';
        setCameraStatus('error');
      } else {
        errorMsg = error.message || 'Failed to start scanner. Please try again.';
        setCameraStatus('error');
      }
      
      setCameraError(errorMsg);
      toast({
        title: errorTitle,
        description: errorMsg,
        variant: "destructive",
      });
    }
  };

  const stopScanning = async () => {
    try {
      if (scannerRef.current && (cameraStatus === 'scanning' || cameraStatus === 'paused')) {
        await scannerRef.current.stop();
      }
    } catch (error) {
      console.error('Error stopping scanner:', error);
    } finally {
      setCameraStatus(permissionGranted ? 'granted' : 'idle');
      setIsProcessingQR(false); // Reset processing flag
    }
  };

  const pauseScanning = async () => {
    try {
      if (scannerRef.current && cameraStatus === 'scanning') {
        await scannerRef.current.stop();
        setCameraStatus('paused');
      }
    } catch (error) {
      console.error('Error pausing scanner:', error);
    }
  };

  const resumeScanning = async () => {
    if (cameraStatus === 'paused') {
      await startScanning();
    }
  };

  return (
    <div className="space-y-4">
      {/* Permission Status Banner */}
      {cameraStatus === 'denied' && (
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <strong>Camera access blocked.</strong> Please:
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Click the camera/lock icon in your browser's address bar</li>
              <li>Select "Allow" for camera permissions</li>
              <li>Click "Request Camera Access Again" below</li>
            </ol>
          </AlertDescription>
        </Alert>
      )}

      {cameraStatus === 'requesting' && (
        <Alert className="bg-blue-50 border-blue-200">
          <ShieldCheck className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <strong>Requesting camera permission...</strong>
            <br />
            Please allow camera access when prompted by your browser. A popup should appear asking for permission.
          </AlertDescription>
        </Alert>
      )}

      {cameraStatus === 'granted' && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Camera access granted! ✓</strong>
            <br />
            Click "Start Camera Scan" below to begin scanning QR codes.
          </AlertDescription>
        </Alert>
      )}

      {/* Scanner Area */}
      <div className="relative">
        {cameraStatus === 'scanning' || cameraStatus === 'paused' ? (
          <div className="relative rounded-lg overflow-hidden bg-black" style={{ width: '100%', height: '400px' }}>
            <div 
              id={scannerDivId.current} 
              className="w-full h-full"
              style={{
                border: '2px solid #8b5cf6',
                borderRadius: '0.5rem'
              }}
            />
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white px-4 py-2 rounded-full text-sm z-10">
              {cameraStatus === 'paused' ? '⏸️ Camera Paused' : (isProcessingQR ? '✅ QR Code Detected!' : '📱 Position QR code in frame')}
            </div>
          </div>
        ) : (
          <div className="bg-muted rounded-lg flex items-center justify-center border-2 border-dashed border-border" style={{ minHeight: '200px', maxHeight: '300px', height: '250px' }}>
            <div className="text-center space-y-2">
              <Camera className="w-12 h-12 text-muted-foreground mx-auto" />
              <p className="text-sm text-muted-foreground">
                {cameraStatus === 'idle' && 'Camera not active'}
                {cameraStatus === 'requesting' && 'Requesting camera access...'}
                {cameraStatus === 'granted' && 'Camera ready - Click Start to scan'}
                {cameraStatus === 'denied' && 'Camera access denied'}
                {cameraStatus === 'error' && 'Camera error - Try again'}
              </p>
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
      <div className="flex flex-col gap-3 pt-2">
        {/* Permission Request Button */}
        {(cameraStatus === 'idle' || cameraStatus === 'denied' || cameraStatus === 'error') && (
          <Button 
            onClick={requestCameraAccess}
            variant="default"
            className="w-full h-12 text-base font-semibold"
            disabled={false}
            type="button"
          >
            <ShieldCheck className="mr-2 h-5 w-5" />
            {cameraStatus === 'denied' ? 'Request Camera Access Again' : 
             cameraStatus === 'error' ? 'Try Camera Access Again' : 
             'Allow Camera Access'}
          </Button>
        )}

        {/* Requesting status indicator */}
        {cameraStatus === 'requesting' && (
          <Button 
            variant="outline"
            className="w-full"
            disabled={true}
            type="button"
          >
            <ShieldCheck className="mr-2 h-4 w-4 animate-pulse" />
            Requesting Permission...
          </Button>
        )}

        {/* Start/Stop/Pause/Resume Buttons */}
        {permissionGranted && (
          <div className="flex gap-2">
            {cameraStatus !== 'scanning' && cameraStatus !== 'paused' ? (
              <Button 
                onClick={startScanning}
                className="flex-1 h-12 text-base font-semibold"
                disabled={isProcessing || cameraStatus === 'requesting'}
                type="button"
              >
                <Camera className="mr-2 h-5 w-5" />
                Start Camera Scan
              </Button>
            ) : (
              <>
                {cameraStatus === 'scanning' ? (
                  <Button 
                    onClick={pauseScanning}
                    variant="secondary"
                    className="flex-1 h-12"
                    type="button"
                  >
                    <Pause className="mr-2 h-5 w-5" />
                    Pause Camera
                  </Button>
                ) : (
                  <Button 
                    onClick={resumeScanning}
                    className="flex-1 h-12"
                    type="button"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Resume Camera
                  </Button>
                )}
                <Button 
                  onClick={stopScanning}
                  variant="outline"
                  className="flex-1 h-12"
                  type="button"
                >
                  Stop Camera
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div className="text-sm text-muted-foreground text-center p-3 bg-muted/30 rounded-lg">
        {!permissionGranted && (
          <p className="leading-relaxed">💡 Camera permission is required to scan QR codes. Your privacy is protected - we only access the camera when you allow it.</p>
        )}
        {permissionGranted && cameraStatus !== 'scanning' && cameraStatus !== 'paused' && (
          <p className="text-green-600 font-medium">✓ Camera is ready. Start scanning to check in participants.</p>
        )}
      </div>
    </div>
  );
};

export default QRScannerCamera;
