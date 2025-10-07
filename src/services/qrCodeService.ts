import QRCode from 'qrcode';

export interface QRCodeData {
  userId: string;
  userEmail: string;
  userName: string;
  eventId?: string;
  eventTitle?: string;
  generatedAt: string;
  type: 'user' | 'event_registration';
}

export class QRCodeService {
  /**
   * Generate a unique QR code for a user using their participant ID
   * Best Practice: Store only a secure token in QR code, not user data
   */
  static async generateUserQRCode(userData: {
    userId: string;
    userEmail: string;
    userName: string;
    participantId?: string;
  }): Promise<string> {
    // Use participant ID if provided, otherwise use a prefixed user ID
    const qrToken = userData.participantId || `VIB-${userData.userId}`;

    try {
      const qrCodeDataURL = await QRCode.toDataURL(qrToken, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H' // High error correction for better scanning
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate a QR code for event registration using participant ID
   * Best Practice: Store only participant ID, lookup user data from database
   */
  static async generateEventRegistrationQRCode(data: {
    userId: string;
    userEmail: string;
    userName: string;
    eventId: string;
    eventTitle: string;
    participantId?: string;
  }): Promise<string> {
    // Use participant ID if provided, otherwise use prefixed user ID
    const qrToken = data.participantId || `VIB-${data.userId}`;

    try {
      const qrCodeDataURL = await QRCode.toDataURL(qrToken, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'H' // High error correction for better scanning
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating event registration QR code:', error);
      throw new Error('Failed to generate event registration QR code');
    }
  }

  /**
   * Validate QR code token format
   * Accepts: participant_id (VIBxxxxx), qr_code (QR-uuid), or VIB-uuid format
   */
  static validateQRToken(token: string): boolean {
    if (!token || typeof token !== 'string') return false;
    
    // Trim whitespace
    const trimmedToken = token.trim();
    
    // Basic validation: must be non-empty and reasonable length
    if (trimmedToken.length < 3 || trimmedToken.length > 100) {
      console.log('QR Token Validation: Invalid length', {
        token: trimmedToken,
        length: trimmedToken.length
      });
      return false;
    }
    
    // Check for valid formats:
    // 1. Participant ID: VIB followed by alphanumeric (3-20 chars)
    // 2. QR Code: QR- followed by UUID
    // 3. Legacy: VIB- followed by UUID
    // 4. UUID format (for direct user IDs)
    // 5. Any alphanumeric string (more flexible)
    const validFormats = [
      /^VIB[A-Z0-9]{3,20}$/i,      // Participant ID: VIB + 3-20 alphanumeric
      /^QR-[a-f0-9-]{36}$/i,       // QR Code format: QR- + UUID
      /^VIB-[a-f0-9-]{36}$/i,      // Legacy format: VIB- + UUID
      /^[a-f0-9-]{36}$/i,          // Direct UUID format
      /^[A-Za-z0-9-_]{3,50}$/i     // General alphanumeric with dashes/underscores (3-50 chars)
    ];
    
    const isValid = validFormats.some(pattern => pattern.test(trimmedToken));
    
    // Debug logging
    console.log('QR Token Validation:', {
      token: trimmedToken,
      isValid,
      length: trimmedToken.length,
      patterns: validFormats.map((pattern, i) => ({
        pattern: i,
        matches: pattern.test(trimmedToken)
      }))
    });
    
    return isValid;
  }

  /**
   * Parse QR code data (deprecated - kept for backward compatibility)
   * New implementation validates token format only
   */
  static parseQRCodeData(qrCodeString: string): QRCodeData | null {
    // For backward compatibility, try to parse as JSON first
    try {
      const data = JSON.parse(qrCodeString);
      if (data.userId && data.userEmail && data.userName) {
        // Convert old format to new format
        return {
          userId: data.userId,
          userEmail: data.userEmail,
          userName: data.userName,
          eventId: data.eventId,
          eventTitle: data.eventTitle,
          generatedAt: data.generatedAt || new Date().toISOString(),
          type: data.type || 'user'
        } as QRCodeData;
      }
    } catch {
      // Not JSON, treat as token (this is expected for new implementation)
    }
    
    // Validate as token
    if (this.validateQRToken(qrCodeString)) {
      return null; // Return null to indicate it's a valid token, not legacy JSON
    }
    
    return null;
  }

  /**
   * Generate a unique participant ID
   */
  static generateParticipantId(): string {
    const prefix = 'VIB';
    const random = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `${prefix}${random}`;
  }
}

export default QRCodeService;
