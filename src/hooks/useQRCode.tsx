import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import QRCodeService from '@/services/qrCodeService';

interface QRCodeData {
  qrCodeDataURL: string;
  participantId: string;
  generatedAt: string;
}

export const useQRCode = () => {
  const { user } = useAuth();
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateQRCode = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // First check if user has any event registrations
      const { data: registrations, error: regError } = await supabase
        .from('event_registrations')
        .select('event_id')
        .eq('user_id', user.id);

      if (regError) {
        throw new Error('Failed to check event registrations');
      }

      if (!registrations || registrations.length === 0) {
        throw new Error('You must register for at least one event to generate a QR code');
      }

      // Get user profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        throw new Error('Failed to fetch user profile');
      }

      // Generate QR code using participant_id for security (not exposing user data)
      const qrCodeDataURL = await QRCodeService.generateUserQRCode({
        userId: user.id,
        userEmail: user.email || '',
        userName: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Participant',
        participantId: profile.participant_id || undefined,
      });

      // Update profile with QR code data and ensure qr_code field is set
      const qrToken = profile.participant_id || `VIB-${user.id}`;
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          qr_code: qrToken, // Store the token for lookup
          qr_code_data: qrCodeDataURL,
          qr_code_generated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.warn('Failed to save QR code to database:', updateError);
      }

      setQrCodeData({
        qrCodeDataURL,
        participantId: profile.participant_id || '',
        generatedAt: new Date().toISOString(),
      });

    } catch (err) {
      console.error('Error generating QR code:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate QR code');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const loadQRCode = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('qr_code_data, participant_id, qr_code_generated_at')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        throw new Error('Failed to fetch QR code data');
      }

      if (profile.qr_code_data && profile.participant_id) {
        setQrCodeData({
          qrCodeDataURL: profile.qr_code_data,
          participantId: profile.participant_id,
          generatedAt: profile.qr_code_generated_at || new Date().toISOString(),
        });
      } else {
        // Generate new QR code if none exists
        await generateQRCode();
      }

    } catch (err) {
      console.error('Error loading QR code:', err);
      setError(err instanceof Error ? err.message : 'Failed to load QR code');
    } finally {
      setIsLoading(false);
    }
  }, [user, generateQRCode]);

  const refreshQRCode = useCallback(async () => {
    await generateQRCode();
  }, [generateQRCode]);

  const downloadQRCode = useCallback(() => {
    if (!qrCodeData) return;

    const link = document.createElement('a');
    link.href = qrCodeData.qrCodeDataURL;
    link.download = `vibranium-pass-${qrCodeData.participantId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrCodeData]);

  const shareQRCode = useCallback(async () => {
    if (!qrCodeData) return;

    try {
      // Convert data URL to blob
      const response = await fetch(qrCodeData.qrCodeDataURL);
      const blob = await response.blob();
      
      const file = new File([blob], `vibranium-pass-${qrCodeData.participantId}.png`, {
        type: 'image/png',
      });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My Vibranium 5.0 Digital Pass',
          text: 'Check out my digital pass for Vibranium 5.0!',
          files: [file],
        });
      } else {
        // Fallback to copying to clipboard
        await navigator.clipboard.writeText(window.location.href);
        alert('Pass link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing QR code:', error);
      downloadQRCode(); // Fallback to download
    }
  }, [qrCodeData, downloadQRCode]);

  useEffect(() => {
    loadQRCode();
  }, [loadQRCode]);

  return {
    qrCodeData,
    isLoading,
    error,
    generateQRCode,
    refreshQRCode,
    downloadQRCode,
    shareQRCode,
  };
};

export default useQRCode;
