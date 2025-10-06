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

// Email templates
export const emailTemplates = {
  eventRegistration: (eventDetails: any, userDetails: any, opts?: { participantId?: string }) => ({
    subject: `🎉 Registration Confirmed: ${eventDetails.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Event Registration Confirmation</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 10px;
            padding: 30px;
            color: white;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #fff;
          }
          .event-card {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            backdrop-filter: blur(10px);
          }
          .event-title {
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
            color: #fff;
          }
          .event-details {
            display: grid;
            gap: 10px;
          }
          .detail-item {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
          }
          .detail-icon {
            width: 20px;
            height: 20px;
            margin-right: 10px;
            color: #ffd700;
          }
          .detail-text {
            flex: 1;
          }
          .registration-info {
            background: rgba(255, 255, 255, 0.2);
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
          }
          .confirmation-badge {
            background: #4CAF50;
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: bold;
            display: inline-block;
            margin: 10px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            font-size: 14px;
            opacity: 0.8;
          }
          .button {
            background: #ffd700;
            color: #333;
            padding: 12px 24px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
            display: inline-block;
            margin: 15px 0;
          }
          @media (max-width: 600px) {
            .container {
              padding: 20px;
            }
            .title {
              font-size: 20px;
            }
            .event-title {
              font-size: 18px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🎯 Vibranium 5.0</div>
            <h1 class="title">Registration Confirmed!</h1>
          </div>

          <div class="registration-info">
            <div class="confirmation-badge">✅ REGISTRATION CONFIRMED</div>
            <p>Hello <strong>${userDetails.firstName} ${userDetails.lastName}</strong>,</p>
            <p>Your registration for the event has been successfully confirmed!</p>
          </div>

          <div class="event-card">
            <h2 class="event-title">${eventDetails.title}</h2>
            <div class="event-details">
              <div class="detail-item">
                <span class="detail-icon">📅</span>
                <span class="detail-text"><strong>Date:</strong> ${eventDetails.date}</span>
              </div>
              <div class="detail-item">
                <span class="detail-icon">🕒</span>
                <span class="detail-text"><strong>Time:</strong> ${eventDetails.time}</span>
              </div>
              <div class="detail-item">
                <span class="detail-icon">📍</span>
                <span class="detail-text"><strong>Location:</strong> ${eventDetails.location}</span>
              </div>
              <div class="detail-item">
                <span class="detail-icon">👥</span>
                <span class="detail-text"><strong>Capacity:</strong> ${eventDetails.attendees}/${eventDetails.maxAttendees} registered</span>
              </div>
              <div class="detail-item">
                <span class="detail-icon">🏷️</span>
                <span class="detail-text"><strong>Category:</strong> ${eventDetails.category}</span>
              </div>
              ${eventDetails.registrationFee > 0 ? `
              <div class="detail-item">
                <span class="detail-icon">💰</span>
                <span class="detail-text"><strong>Registration Fee:</strong> ₹${eventDetails.registrationFee}</span>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="event-card">
            <h3 style="color: #ffd700; margin-bottom: 15px;">📝 Event Description</h3>
            <p style="line-height: 1.6;">${eventDetails.description}</p>
          </div>

          ${opts?.participantId ? `
          <div class="event-card" style="text-align:center;">
            <h3 style="color: #ffd700; margin-bottom: 15px;">🎟️ Your Digital Pass</h3>
            <p style="margin-bottom:8px;">Participant ID: <strong>${opts.participantId}</strong></p>
            <img src="cid:qrcode" alt="Your QR Code" style="width:180px;height:180px;border-radius:8px;background:#fff;padding:8px;" />
          </div>
          ` : ''}

          <div class="event-card">
            <h3 style="color: #ffd700; margin-bottom: 15px;">📋 Important Information</h3>
            <ul style="padding-left: 20px;">
              <li>Please arrive 15 minutes before the event starts</li>
              <li>Bring a valid ID for verification</li>
              <li>Check your email for any updates or changes</li>
              <li>Contact organizers if you have any questions</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/events" class="button">
              View All Events
            </a>
          </div>

          <div class="footer">
            <p>Thank you for participating in Vibranium 5.0!</p>
            <p>If you have any questions, please contact us at support@vibranium.com</p>
            <p style="margin-top: 20px; font-size: 12px; opacity: 0.6;">
              This is an automated email. Please do not reply to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
      🎯 Vibranium 5.0 - Registration Confirmed!

      Hello ${userDetails.firstName} ${userDetails.lastName},

      Your registration for "${eventDetails.title}" has been successfully confirmed!

      Event Details:
      - Date: ${eventDetails.date}
      - Time: ${eventDetails.time}
      - Location: ${eventDetails.location}
      - Category: ${eventDetails.category}
      - Capacity: ${eventDetails.attendees}/${eventDetails.maxAttendees} registered
      ${eventDetails.registrationFee > 0 ? `- Registration Fee: ₹${eventDetails.registrationFee}` : ''}
      ${eventDetails.pointsReward > 0 ? `- Points Reward: ${eventDetails.pointsReward} points` : ''}

      Description:
      ${eventDetails.description}

      Important Information:
      - Please arrive 15 minutes before the event starts
      - Bring a valid ID for verification
      - Check your email for any updates or changes
      - Contact organizers if you have any questions

      Thank you for participating in Vibranium 5.0!

      Best regards,
      Vibranium 5.0 Team
    `
  })
};

// Email service functions
export const emailService = {
  // Send event registration confirmation email
  sendEventRegistrationEmail: async (
    eventDetails: any,
    userDetails: any,
    options?: { qrDataURL?: string; participantId?: string }
  ) => {
    try {
      // Verify transporter configuration
      await transporter.verify();
      console.log('Gmail SMTP connection verified successfully');

      const template = emailTemplates.eventRegistration(eventDetails, userDetails, { participantId: options?.participantId });
      
      const mailOptions: any = {
        from: `"Vibranium 5.0" <${emailConfig.auth.user}>`,
        to: userDetails.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
        // Gmail-specific headers
        headers: {
          'X-Mailer': 'Vibranium 5.0 Event System',
          'X-Priority': '3',
        },
      };

      // Add QR code as attachment if provided
      if (options?.qrDataURL) {
        mailOptions.attachments = [{
          filename: 'vibranium-digital-pass.png',
          content: options.qrDataURL.split(',')[1],
          encoding: 'base64',
          cid: 'qrcode'
        }];
      }

      const result = await transporter.sendMail(mailOptions);
      console.log('Event registration email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error: any) {
      console.error('Error sending event registration email:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Failed to send email';
      if (error.code === 'EAUTH') {
        errorMessage = 'Gmail authentication failed. Please check your app password.';
      } else if (error.code === 'ECONNECTION') {
        errorMessage = 'Failed to connect to Gmail SMTP server.';
      } else if (error.code === 'EMESSAGE') {
        errorMessage = 'Invalid email message format.';
      }
      
      return { success: false, error: errorMessage };
    }
  },

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

export default emailService;
