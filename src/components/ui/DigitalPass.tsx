import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Share2, MapPin, Calendar, User, QrCode } from 'lucide-react';
import { useQRCode } from '@/hooks/useQRCode';
import { useAuth } from '@/hooks/useAuth';

interface DigitalPassProps {
  eventId?: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  className?: string;
}

const DigitalPass: React.FC<DigitalPassProps> = ({
  eventId,
  eventTitle = "Vibranium 5.0",
  eventDate,
  eventLocation = "EKC College",
  className = ""
}) => {
  const { user } = useAuth();
  const { qrCodeData, isLoading, downloadQRCode, shareQRCode } = useQRCode();

  if (isLoading) {
    return (
      <Card className={`w-full max-w-sm mx-auto ${className}`}>
        <div className="p-6 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Generating your digital pass...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-sm mx-auto overflow-hidden ${className}`}>
      {/* Main Pass Design */}
      <div className="relative">
        {/* Left Section - Event Info */}
        <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 p-6 text-white relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 right-4 w-16 h-16 bg-white rounded-full"></div>
            <div className="absolute top-12 right-8 w-8 h-8 bg-white rounded-full"></div>
            <div className="absolute top-20 right-4 w-12 h-12 bg-white rounded-full"></div>
          </div>
          
          {/* Event Title */}
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs opacity-80">Via Vibranium 5.0</span>
              <div className="text-right">
                <div className="text-lg font-bold">VIB</div>
                <div className="text-xs opacity-80">2025</div>
              </div>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
              {eventTitle}
            </h1>
            
            {/* Event Date */}
            {eventDate && (
              <div className="bg-yellow-400 text-black px-3 py-1 rounded-md text-sm font-semibold mb-3 inline-block">
                {eventDate}
              </div>
            )}
            
            {/* Event Location */}
            <div className="flex items-center text-sm opacity-90">
              <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{eventLocation}</span>
            </div>
          </div>
        </div>

        {/* Right Section - Participant Info & QR Code */}
        <div className="bg-white p-6 border-l-4 border-purple-600">
          <div className="space-y-4">
            {/* Participant Name */}
            <div>
              <div className="text-xs text-purple-600 font-medium mb-1">Participant Name</div>
              <div className="text-lg font-bold text-gray-900">
                {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
              </div>
            </div>

            {/* Participant ID */}
            <div>
              <div className="text-xs text-purple-600 font-medium mb-1">Participant ID</div>
              <div className="text-sm font-mono font-semibold text-gray-900">
                {qrCodeData?.participantId || 'Loading...'}
              </div>
            </div>

            {/* QR Code */}
            <div className="text-center">
              <div className="text-xs text-purple-600 font-medium mb-2">Entry Pass</div>
              {qrCodeData?.qrCodeDataURL && (
                <div className="inline-block p-2 bg-white border-2 border-gray-200 rounded-lg">
                  <img 
                    src={qrCodeData.qrCodeDataURL} 
                    alt="QR Code" 
                    className="w-32 h-32"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-gray-50 border-t">
        <div className="flex gap-2">
          <Button 
            onClick={downloadQRCode}
            variant="outline" 
            size="sm" 
            className="flex-1"
            disabled={!qrCodeData}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button 
            onClick={shareQRCode}
            variant="outline" 
            size="sm" 
            className="flex-1"
            disabled={!qrCodeData}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default DigitalPass;
