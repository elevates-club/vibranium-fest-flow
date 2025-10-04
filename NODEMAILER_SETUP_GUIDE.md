# 📧 Nodemailer Event Registration Email Setup Guide

## Overview
This guide will help you set up email notifications for event registrations using Nodemailer. Users will receive beautiful confirmation emails with event details when they register for events.

## 🚀 Quick Start

### 1. Environment Setup
Create a `.env` file in your project root:
```env
# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Server Configuration
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 2. Gmail Setup (For Development)
1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate password for "Mail"
   - Use this password in `EMAIL_PASS`

### 3. Running the Application

**Option A: Run Both Servers Separately**
```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Email Server
npm run email-server
```

**Option B: Run Both Together**
```bash
npm run dev:full
```

## 📧 Email Features

### What Users Receive:
- ✅ **Registration Confirmation**
- ✅ **Event Details** (Date, Time, Location)
- ✅ **Event Description**
- ✅ **Registration Information**
- ✅ **Important Instructions**
- ✅ **Beautiful HTML Design**
- ✅ **Mobile Responsive**

### Email Template Includes:
- 🎯 Vibranium 5.0 branding
- 📅 Event date and time
- 📍 Location details
- 👥 Registration status
- 💰 Registration fee (if applicable)
- ⭐ Points reward (if applicable)
- 📝 Full event description
- 📋 Important instructions
- 🔗 Link to view all events

## 🔧 Configuration Options

### Development (Gmail SMTP)
```javascript
const emailConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App Password
  },
};
```

### Production Options

**Option 1: SendGrid**
```bash
npm install @sendgrid/mail
```
```env
SENDGRID_API_KEY=your-sendgrid-api-key
```

**Option 2: Mailgun**
```bash
npm install mailgun-js
```
```env
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=your-domain.com
```

**Option 3: AWS SES**
```bash
npm install aws-sdk
```
```env
AWS_SES_ACCESS_KEY=your-access-key
AWS_SES_SECRET_KEY=your-secret-key
AWS_SES_REGION=us-east-1
```

## 🧪 Testing

### Test Email Connection
```bash
curl http://localhost:3001/test-email
```

### Test Registration Email
```bash
curl -X POST http://localhost:3001/send-event-registration \
  -H "Content-Type: application/json" \
  -d '{
    "eventDetails": {
      "title": "Test Event",
      "start_date": "2024-01-15T10:00:00Z",
      "location": "Test Location",
      "description": "This is a test event"
    },
    "userDetails": {
      "email": "test@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  }'
```

## 📱 Frontend Integration

The email service is automatically integrated into the event registration flow:

1. **User registers for event** → Registration saved to database
2. **Email API called** → `POST /send-event-registration`
3. **Email sent** → User receives confirmation
4. **Success notification** → User sees confirmation toast

## 🎨 Customizing Email Templates

Edit `src/services/emailService.ts` to customize:
- Email design and colors
- Template content
- Branding elements
- Additional information

## 🔒 Security Considerations

### Production Checklist:
- ✅ Use environment variables for credentials
- ✅ Implement rate limiting
- ✅ Validate email addresses
- ✅ Use proper email service (not Gmail SMTP)
- ✅ Implement error handling
- ✅ Log email activities
- ✅ Use HTTPS in production

### Rate Limiting Example:
```javascript
import rateLimit from 'express-rate-limit';

const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many email requests, please try again later.'
});

app.use('/send-event-registration', emailLimiter);
```

## 🚨 Troubleshooting

### Common Issues:

**1. Gmail Authentication Failed**
- ✅ Enable 2FA
- ✅ Use App Password (not regular password)
- ✅ Check credentials in `.env`

**2. Email Not Sending**
- ✅ Check server logs
- ✅ Verify email service configuration
- ✅ Test connection: `curl http://localhost:3001/test-email`

**3. Frontend Can't Connect to Email Server**
- ✅ Ensure email server is running on port 3001
- ✅ Check CORS configuration
- ✅ Verify API endpoint URL

**4. Emails Going to Spam**
- ✅ Use proper email service (not Gmail SMTP for production)
- ✅ Set up SPF/DKIM records
- ✅ Use verified sender domain

## 📊 Monitoring

### Email Logs
The server logs all email activities:
```bash
# Check email server logs
npm run email-server
```

### Health Check
```bash
curl http://localhost:3001/health
```

## 🎯 Production Deployment

### Vercel Deployment
1. **Deploy Frontend**: `vercel --prod`
2. **Deploy Email Server**: Use Vercel Functions or separate server
3. **Update Environment Variables**: Set production email credentials
4. **Update API URL**: Change from `localhost:3001` to production URL

### Docker Deployment
```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "run", "email-server"]
```

## ✅ Success!

Once set up, users will receive beautiful confirmation emails like this:

```
🎯 Vibranium 5.0 - Registration Confirmed!

Hello John Doe,

Your registration for "Code Crack Competition" has been successfully confirmed!

Event Details:
- Date: Jan 15, 2024
- Time: 10:00 AM
- Location: Main Auditorium
- Category: Competition
- Capacity: 25/50 registered

[Beautiful HTML email with full event details]
```

**The email notification system is now ready to use!** 🎉
