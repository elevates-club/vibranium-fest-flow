import React, { useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Share2, MapPin } from 'lucide-react';
import { useQRCode } from '@/hooks/useQRCode';
import { useAuth } from '@/hooks/useAuth';
import html2canvas from 'html2canvas';
import composeVibraniumTicket from '@/lib/ticketComposer';
import ticketBg from '@/assets/pngvibraniumticket.png';

interface VibraniumTicketProps {
  eventId?: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
  className?: string;
}

const VibraniumTicket: React.FC<VibraniumTicketProps> = ({
  eventId,
  eventTitle = "VIBRANIUM 5.0",
  eventDate = "09 OCT 2025",
  eventLocation = "Eranad Knowledge City Technical Campus",
  className = ""
}) => {
  const { user } = useAuth();
  const { qrCodeData, isLoading, downloadQRCode, shareQRCode } = useQRCode();
  const ticketRef = useRef<HTMLDivElement>(null);

  const downloadTicket = async () => {
    if (!qrCodeData) return;

    try {
      const name = `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim();
      const dataUrl = await composeVibraniumTicket({
        backgroundSrc: ticketBg,
        participantName: name || 'Participant',
        participantId: qrCodeData.participantId,
        qrCodeDataURL: qrCodeData.qrCodeDataURL,
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `vibranium-ticket-${qrCodeData.participantId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading ticket:', error);
      downloadQRCode();
    }
  };

  const shareTicket = async () => {
    if (!qrCodeData) return;

    try {
      const name = `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim();
      const dataUrl = await composeVibraniumTicket({
        backgroundSrc: ticketBg,
        participantName: name || 'Participant',
        participantId: qrCodeData.participantId,
        qrCodeDataURL: qrCodeData.qrCodeDataURL,
      });

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `vibranium-ticket-${qrCodeData.participantId}.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My Vibranium 5.0 Ticket',
          text: 'Check out my ticket for Vibranium 5.0!',
          files: [file],
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Ticket link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing ticket:', error);
      shareQRCode();
    }
  };

  if (isLoading) {
    return (
      <Card className={`w-full max-w-4xl mx-auto ${className}`}>
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Generating your ticket...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-4xl mx-auto overflow-hidden ${className}`}>
      {/* Main Ticket Design */}
      <div className="relative" ref={ticketRef}>
        {/* Ticket Container */}
        <div className="relative w-full h-[400px] bg-[#09090B] rounded-2xl overflow-hidden">
          
          {/* Noise Texture Overlay */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute inset-0" style={{
              backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)`,
              backgroundSize: '20px 20px'
            }}></div>
          </div>

          {/* Left Section - Participant Information */}
          <div className="absolute left-0 top-0 w-[30%] h-full bg-[#09090B]">
            
            {/* Purple Accent Shape */}
            <div className="absolute -left-[30%] -top-[15%] w-[200%] h-[200%] bg-[rgba(166,85,247,0.5)] rounded-full transform rotate-[-38deg]"></div>
            
            {/* Participant Info Container */}
            <div className="relative z-10 p-8 h-full flex flex-col justify-center">
              
              {/* Participant Name */}
              <div className="mb-6">
                <div className="text-[#EFC5FF] text-sm font-medium mb-2" style={{ fontFamily: 'Asap Condensed, sans-serif' }}>
                  Participant Name:
                </div>
                <div className="text-white text-lg font-medium" style={{ fontFamily: 'Asap Condensed, sans-serif' }}>
                  {user?.user_metadata?.first_name} {user?.user_metadata?.last_name}
                </div>
              </div>

              {/* Participant ID */}
              <div className="mb-8">
                <div className="text-[#EFC5FF] text-sm font-medium mb-2" style={{ fontFamily: 'Asap Condensed, sans-serif' }}>
                  Participant ID:
                </div>
                <div className="text-white text-lg font-medium" style={{ fontFamily: 'Asap Condensed, sans-serif' }}>
                  {qrCodeData?.participantId || 'Loading...'}
                </div>
              </div>

              {/* QR Code Area */}
              <div className="relative">
                <div className="w-32 h-32 bg-[#F5F5F5] rounded-lg border border-black flex items-center justify-center">
                  {qrCodeData?.qrCodeDataURL ? (
                    <img 
                      src={qrCodeData.qrCodeDataURL} 
                      alt="QR Code" 
                      className="w-28 h-28"
                    />
                  ) : (
                    <div className="text-black text-sm" style={{ fontFamily: 'Asap Condensed, sans-serif' }}>
                      {"{qr_code}"}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Section - Event Information */}
          <div className="absolute right-0 top-0 w-[70%] h-full bg-[#09090B] rounded-r-2xl">
            
            {/* Purple Background Shapes */}
            <div className="absolute -left-[10%] -top-[6%] w-[80%] h-[30%] bg-[rgba(166,85,247,0.5)] transform rotate-[-30deg]"></div>
            <div className="absolute -right-[6%] -top-[100%] w-[120%] h-[200%] bg-[rgba(166,85,247,0.5)] rounded-full transform rotate-[6deg]"></div>
            
            {/* Event Info Container */}
            <div className="relative z-10 p-8 h-full flex flex-col justify-between">
              
              {/* Top Section */}
              <div>
                {/* Event Title */}
                <div className="mb-4">
                  <div className="text-white text-4xl font-normal mb-2" style={{ fontFamily: 'Viga, sans-serif' }}>
                    {eventTitle}
                  </div>
                  <div className="text-white text-2xl font-normal" style={{ fontFamily: 'Viga, sans-serif' }}>
                    TECH FEST
                  </div>
                </div>

                {/* Powered By */}
                <div className="text-white text-sm font-medium" style={{ fontFamily: 'Asap Condensed, sans-serif' }}>
                  POWERED BY ELEVATES
                </div>
              </div>

              {/* Bottom Section */}
              <div className="flex items-end justify-between">
                
                {/* Location */}
                <div className="flex items-center">
                  <div className="w-8 h-8 mr-3 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-[#AFAFAF]" />
                  </div>
                  <div>
                    <div className="text-white text-sm font-normal" style={{ fontFamily: 'Asap Condensed, sans-serif' }}>
                      Eranad Knowledge City
                    </div>
                    <div className="text-white text-sm font-normal" style={{ fontFamily: 'Asap Condensed, sans-serif' }}>
                      Technical Campus
                    </div>
                  </div>
                </div>

                {/* Date */}
                <div className="text-right">
                  <div className="text-white text-4xl font-normal" style={{ fontFamily: 'Viga, sans-serif' }}>
                    {eventDate.split(' ')[0]}
                  </div>
                  <div className="text-white text-lg font-normal" style={{ fontFamily: 'Viga, sans-serif' }}>
                    {eventDate.split(' ')[1]}
                  </div>
                  <div className="text-white text-lg font-normal" style={{ fontFamily: 'Viga, sans-serif' }}>
                    {eventDate.split(' ')[2]}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Perforated Line */}
          <div className="absolute left-[30%] top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-white to-transparent opacity-50">
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#09090B] rounded-full border border-white"></div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-4 bg-muted/50 border-t border-border/50">
        <div className="flex gap-2">
          <Button 
            onClick={downloadTicket}
            variant="outline" 
            size="sm" 
            className="flex-1"
            disabled={!qrCodeData}
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button 
            onClick={shareTicket}
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

export default VibraniumTicket;
