import nodemailer from 'nodemailer';

// Email configuration
const emailConfig = {
  // For development/testing - using Gmail SMTP
  // For production, use a proper email service like SendGrid, Mailgun, etc.
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER || 'elevates@ekc.edu.in',
    pass: process.env.EMAIL_PASS || '', // Use App Password for Gmail
  },
};

// Create transporter
const transporter = nodemailer.createTransport(emailConfig);

// Email templates
export const emailTemplates = {
  eventRegistration: (eventDetails: any, userDetails: any) => ({
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
  sendEventRegistrationEmail: async (eventDetails: any, userDetails: any) => {
    try {
      const template = emailTemplates.eventRegistration(eventDetails, userDetails);
      
      const mailOptions = {
        from: `"Vibranium 5.0" <${emailConfig.auth.user}>`,
        to: userDetails.email,
        subject: template.subject,
        html: template.html,
        text: template.text,
      };

      const result = await transporter.sendMail(mailOptions);
      console.log('Event registration email sent:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Error sending event registration email:', error);
      return { success: false, error: error.message };
    }
  },

  // Test email configuration
  testEmailConnection: async () => {
    try {
      await transporter.verify();
      console.log('Email server connection verified');
      return { success: true };
    } catch (error) {
      console.error('Email server connection failed:', error);
      return { success: false, error: error.message };
    }
  }
};

export default emailService;
