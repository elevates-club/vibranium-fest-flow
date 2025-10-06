import type { VercelRequest, VercelResponse } from '@vercel/node';
import { emailService } from '../src/services/emailService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { action, testEmail } = req.body || {};

    if (action === 'test-connection') {
      // Test Gmail SMTP connection
      const result = await emailService.testEmailConnection();
      
      if (result.success) {
        return res.status(200).json({ 
          success: true, 
          message: 'Gmail SMTP connection is working correctly',
          details: result.message 
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          error: result.error 
        });
      }
    }

    if (action === 'send-test-email') {
      if (!testEmail) {
        return res.status(400).json({ 
          success: false, 
          error: 'Test email address is required' 
        });
      }

      // Send test email
      const result = await emailService.sendTestEmail(testEmail);
      
      if (result.success) {
        return res.status(200).json({ 
          success: true, 
          message: 'Test email sent successfully',
          messageId: result.messageId 
        });
      } else {
        return res.status(500).json({ 
          success: false, 
          error: result.error 
        });
      }
    }

    return res.status(400).json({ 
      success: false, 
      error: 'Invalid action. Use "test-connection" or "send-test-email"' 
    });

  } catch (error: any) {
    console.error('Error in api/test-email:', error);
    return res.status(500).json({ 
      success: false, 
      error: error?.message || 'Internal server error' 
    });
  }
}
