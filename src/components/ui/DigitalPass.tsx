import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Share2, MapPin, Calendar, User, QrCode } from 'lucide-react';
import { useQRCode } from '@/hooks/useQRCode';
import { useAuth } from '@/hooks/useAuth';
import html2canvas from 'html2canvas';
import composeVibraniumTicket from '@/lib/ticketComposer';
import ticketBg from '@/assets/pngvibraniumticket.png';

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
  const passRef = useRef<HTMLDivElement>(null);
  const [composedUrl, setComposedUrl] = useState<string | null>(null);

  useEffect(() => {
    const compose = async () => {
      if (!qrCodeData) return;
      const name = `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim();
      const url = await composeVibraniumTicket({
        backgroundSrc: ticketBg,
        participantName: name || 'Participant',
        participantId: qrCodeData.participantId,
        qrCodeDataURL: qrCodeData.qrCodeDataURL,
      });
      setComposedUrl(url);
    };
    compose();
  }, [qrCodeData, user]);

  const downloadFullPass = async () => {
    if (!qrCodeData || !composedUrl) return;
    try {
      const link = document.createElement('a');
      link.href = composedUrl;
      link.download = `vibranium-pass-${qrCodeData.participantId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading full pass:', error);
      downloadQRCode();
    }
  };

  const shareFullPass = async () => {
    if (!qrCodeData || !composedUrl) return;
    try {
      const res = await fetch(composedUrl);
      const blob = await res.blob();
      const file = new File([blob], `vibranium-pass-${qrCodeData.participantId}.png`, { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My Vibranium 5.0 Digital Pass',
          text: 'Check out my digital pass for Vibranium 5.0!',
          files: [file],
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert('Pass link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing full pass:', error);
      shareQRCode();
    }
  };

  if (isLoading) {
    return (
      <Card className={`w-full max-w-5xl mx-auto ${className}`}>
        <div className="p-6 text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Generating your ticket...</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`w-full max-w-5xl mx-auto overflow-hidden ${className}`}>
      <div className="relative" ref={passRef}>
        {composedUrl && (
          <img src={composedUrl} alt="Ticket" className="w-full h-auto block" />
        )}
      </div>
      {composedUrl && (
        <div className="p-4 flex justify-center bg-muted/50 border-t border-border/50">
          <Button onClick={downloadFullPass} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download Ticket
          </Button>
        </div>
      )}
    </Card>
  );
};

export default DigitalPass;
