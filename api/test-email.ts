import type { VercelRequest, VercelResponse } from '@vercel/node';
import nodemailer from 'nodemailer';

// Gmail SMTP Configuration
const emailConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS, // Your Gmail App Password
  },
  tls: {
    rejectUnauthorized: false
  }
};

// Create transporter with Gmail configuration
const transporter = nodemailer.createTransport(emailConfig);

// Email service functions
const emailService = {
  // Test Gmail email configuration
  testEmailConnection: async () => {
    try {
      await transporter.verify();
      console.log('Gmail SMTP connection verified successfully');
      return { success: true, message: 'Gmail SMTP connection is working' };
    } catch (error: any) {
      console.error('Gmail SMTP connection failed:', error);
      
      let errorMessage = 'Gmail SMTP connection failed';
      if (error.code === 'EAUTH') {
        errorMessage = 'Gmail authentication failed. Please check your credentials and app password.';
      } else if (error.code === 'ECONNECTION') {
        errorMessage = 'Cannot connect to Gmail SMTP server. Check your internet connection.';
      }
      
      return { success: false, error: errorMessage };
    }
  },

  // Send test email
  sendTestEmail: async (toEmail: string) => {
    try {
      await transporter.verify();
      
      const mailOptions = {
        from: `"Vibranium 5.0 Test" <${emailConfig.auth.user}>`,
        to: toEmail,
        subject: '🧪 Vibranium 5.0 - Email Service Test',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #667eea;">✅ Email Service Test Successful!</h2>
            <p>This is a test email from Vibranium 5.0 event management system.</p>
            <p><strong>Configuration:</strong></p>
            <ul>
              <li>SMTP Host: ${emailConfig.host}</li>
              <li>Port: ${emailConfig.port}</li>
              <li>Secure: ${emailConfig.secure}</li>
              <li>From: ${emailConfig.auth.user}</li>
            </ul>
            <p style="margin-top: 30px; color: #666;">
              If you received this email, your Gmail SMTP configuration is working correctly!
            </p>
          </div>
        `,
        text: `
          Email Service Test Successful!
          
          This is a test email from Vibranium 5.0 event management system.
          
          Configuration:
          - SMTP Host: ${emailConfig.host}
          - Port: ${emailConfig.port}
          - Secure: ${emailConfig.secure}
          - From: ${emailConfig.auth.user}
          
          If you received this email, your Gmail SMTP configuration is working correctly!
        `
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Test email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error('Error sending test email:', error);
      return { success: false, error: error.message };
    }
  }
};

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
