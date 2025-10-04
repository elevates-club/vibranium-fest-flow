#!/usr/bin/env node

/**
 * Email Service Test Script
 * Tests the email functionality without running the full server
 */

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Email configuration
const emailConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password',
  },
};

async function testEmailConnection() {
  console.log('🧪 Testing email connection...');
  
  try {
    const transporter = nodemailer.createTransport(emailConfig);
    
    // Verify connection
    await transporter.verify();
    console.log('✅ Email server connection verified successfully!');
    
    return transporter;
  } catch (error) {
    console.error('❌ Email server connection failed:', error.message);
    console.log('\n📝 Troubleshooting tips:');
    console.log('1. Check your EMAIL_USER and EMAIL_PASS in .env file');
    console.log('2. For Gmail, use App Password (not regular password)');
    console.log('3. Enable 2-Factor Authentication on Gmail');
    console.log('4. Check if Gmail SMTP is enabled');
    return null;
  }
}

async function sendTestEmail(transporter) {
  console.log('\n📧 Sending test email...');
  
  const testEventDetails = {
    title: 'Test Event - Code Crack Competition',
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    location: 'Main Auditorium',
    category: 'Competition',
    description: 'This is a test event to verify email functionality. If you receive this email, the system is working correctly!',
    attendees: 1,
    maxAttendees: 50,
    registrationFee: 0,
    pointsReward: 100,
  };

  const testUserDetails = {
    firstName: 'Test',
    lastName: 'User',
    email: process.env.TEST_EMAIL || process.env.EMAIL_USER || 'test@example.com',
  };

  const mailOptions = {
    from: `"Vibranium TechFest" <${emailConfig.auth.user}>`,
    to: testUserDetails.email,
    subject: `🎉 Test Email: Registration Confirmed - ${testEventDetails.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">🎯 Vibranium TechFest 2024</h1>
          <h2 style="margin: 10px 0; font-size: 24px;">Test Email - Registration Confirmed!</h2>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #333; margin-top: 0;">✅ Registration Confirmed</h3>
          <p>Hello <strong>${testUserDetails.firstName} ${testUserDetails.lastName}</strong>,</p>
          <p>This is a test email to verify that the email notification system is working correctly!</p>
        </div>

        <div style="background: #e3f2fd; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h3 style="color: #1976d2; margin-top: 0;">📅 Event Details</h3>
          <p><strong>Event:</strong> ${testEventDetails.title}</p>
          <p><strong>Date:</strong> ${testEventDetails.date}</p>
          <p><strong>Time:</strong> ${testEventDetails.time}</p>
          <p><strong>Location:</strong> ${testEventDetails.location}</p>
          <p><strong>Category:</strong> ${testEventDetails.category}</p>
          <p><strong>Description:</strong> ${testEventDetails.description}</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <p style="color: #666; font-size: 14px;">
            If you received this email, the Nodemailer integration is working perfectly! 🎉
          </p>
        </div>
      </div>
    `,
    text: `
      🎯 Vibranium TechFest 2024 - Test Email

      Hello ${testUserDetails.firstName} ${testUserDetails.lastName},

      This is a test email to verify that the email notification system is working correctly!

      Event Details:
      - Event: ${testEventDetails.title}
      - Date: ${testEventDetails.date}
      - Time: ${testEventDetails.time}
      - Location: ${testEventDetails.location}
      - Category: ${testEventDetails.category}
      - Description: ${testEventDetails.description}

      If you received this email, the Nodemailer integration is working perfectly! 🎉

      Best regards,
      Vibranium TechFest Team
    `
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log(`📧 Message ID: ${result.messageId}`);
    console.log(`📬 Sent to: ${testUserDetails.email}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Email Service Test\n');
  
  // Test connection
  const transporter = await testEmailConnection();
  
  if (!transporter) {
    console.log('\n❌ Cannot proceed without email connection');
    process.exit(1);
  }
  
  // Send test email
  const emailSent = await sendTestEmail(transporter);
  
  if (emailSent) {
    console.log('\n🎉 Email service test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Check your email inbox (and spam folder)');
    console.log('2. Run the email server: npm run email-server');
    console.log('3. Run the frontend: npm run dev');
    console.log('4. Register for an event to test the full flow');
  } else {
    console.log('\n❌ Email service test failed');
    process.exit(1);
  }
}

// Run the test
main().catch(console.error);
