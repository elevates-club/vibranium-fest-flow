# 📧 Gmail SMTP Setup Guide for Vibranium 5.0

## 🔧 **Step 1: Enable 2-Factor Authentication**

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification** if not already enabled
3. This is required to generate App Passwords

## 🔑 **Step 2: Generate Gmail App Password**

1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click on **App passwords** (under "How you sign in to Google")
3. Select **Mail** as the app
4. Select **Other (custom name)** as the device
5. Enter "Vibranium 5.0" as the name
6. Click **Generate**
7. **Copy the 16-character password** (e.g., `abcd efgh ijkl mnop`)

## 🌍 **Step 3: Set Environment Variables**

### **For Local Development (.env.local)**
```bash
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-character-app-password
FRONTEND_URL=http://localhost:5173
```

### **For Vercel Production**
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:
   - `EMAIL_USER`: your-gmail@gmail.com
   - `EMAIL_PASS`: your-16-character-app-password
   - `FRONTEND_URL`: https://your-domain.vercel.app

## 🧪 **Step 4: Test Your Configuration**

### **Test Connection**
```bash
curl -X POST https://your-domain.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"action": "test-connection"}'
```

### **Send Test Email**
```bash
curl -X POST https://your-domain.vercel.app/api/test-email \
  -H "Content-Type: application/json" \
  -d '{"action": "send-test-email", "testEmail": "your-test-email@gmail.com"}'
```

## 📋 **Step 5: Gmail SMTP Configuration Details**

```typescript
const emailConfig = {
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail address
    pass: process.env.EMAIL_PASS, // Your App Password
  },
  tls: {
    rejectUnauthorized: false
  }
};
```

## ⚠️ **Important Notes**

1. **Never use your regular Gmail password** - Always use App Passwords
2. **App Passwords are 16 characters** with spaces (remove spaces when setting env vars)
3. **2FA must be enabled** to generate App Passwords
4. **Test in production** - Gmail may block localhost connections

## 🔍 **Troubleshooting**

### **Authentication Failed (EAUTH)**
- Check if 2FA is enabled
- Verify App Password is correct
- Ensure no spaces in environment variable

### **Connection Failed (ECONNECTION)**
- Check internet connection
- Verify Gmail SMTP settings
- Try port 465 with secure: true

### **Email Not Delivered**
- Check spam folder
- Verify recipient email address
- Check Gmail sending limits

## 📊 **Gmail Limits**

- **Daily Limit**: 500 emails per day (free Gmail)
- **Rate Limit**: ~100 emails per hour
- **Recipients**: Up to 500 recipients per email

## 🚀 **Production Recommendations**

For high-volume email sending, consider:
- **Google Workspace** (higher limits)
- **SendGrid** (dedicated email service)
- **Mailgun** (transactional emails)
- **Amazon SES** (cost-effective)

## ✅ **Verification Checklist**

- [ ] 2-Factor Authentication enabled
- [ ] App Password generated
- [ ] Environment variables set
- [ ] Test connection successful
- [ ] Test email received
- [ ] Registration emails working
