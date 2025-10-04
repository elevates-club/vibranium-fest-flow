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
   * Generate a unique QR code for a user
   */
  static async generateUserQRCode(userData: {
    userId: string;
    userEmail: string;
    userName: string;
  }): Promise<string> {
    const qrData: QRCodeData = {
      userId: userData.userId,
      userEmail: userData.userEmail,
      userName: userData.userName,
      generatedAt: new Date().toISOString(),
      type: 'user'
    };

    try {
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'L'
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw new Error('Failed to generate QR code');
    }
  }

  /**
   * Generate a QR code for event registration
   */
  static async generateEventRegistrationQRCode(data: {
    userId: string;
    userEmail: string;
    userName: string;
    eventId: string;
    eventTitle: string;
  }): Promise<string> {
    const qrData: QRCodeData = {
      userId: data.userId,
      userEmail: data.userEmail,
      userName: data.userName,
      eventId: data.eventId,
      eventTitle: data.eventTitle,
      generatedAt: new Date().toISOString(),
      type: 'event_registration'
    };

    try {
      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrData), {
        width: 200,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'L'
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating event registration QR code:', error);
      throw new Error('Failed to generate event registration QR code');
    }
  }

  /**
   * Parse QR code data
   */
  static parseQRCodeData(qrCodeString: string): QRCodeData | null {
    try {
      const data = JSON.parse(qrCodeString);
      
      // Validate the data structure
      if (data.userId && data.userEmail && data.userName && data.type) {
        return data as QRCodeData;
      }
      
      return null;
    } catch (error) {
      console.error('Error parsing QR code data:', error);
      return null;
    }
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
