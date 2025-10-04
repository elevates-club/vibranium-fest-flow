import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { emailService } from './src/services/emailService.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Email service is running' });
});

// Test email connection
app.get('/test-email', async (req, res) => {
  try {
    const result = await emailService.testEmailConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Send event registration email
app.post('/send-event-registration', async (req, res) => {
  try {
    const { eventDetails, userDetails } = req.body;

    // Validate required fields
    if (!eventDetails || !userDetails) {
      return res.status(400).json({
        success: false,
        error: 'Event details and user details are required'
      });
    }

    if (!userDetails.email) {
      return res.status(400).json({
        success: false,
        error: 'User email is required'
      });
    }

    // Format event details for email template
    const formattedEventDetails = {
      title: eventDetails.title || 'Untitled Event',
      date: eventDetails.start_date ? new Date(eventDetails.start_date).toLocaleDateString() : 'TBD',
      time: eventDetails.start_date ? new Date(eventDetails.start_date).toLocaleTimeString() : 'TBD',
      location: eventDetails.location || 'TBD',
      category: eventDetails.category || 'General',
      description: eventDetails.description || 'No description available',
      attendees: eventDetails.attendees || 0,
      maxAttendees: eventDetails.max_attendees || 0,
      registrationFee: eventDetails.registration_fee || 0,
      pointsReward: eventDetails.points_reward || 0,
    };

    // Format user details
    const formattedUserDetails = {
      firstName: userDetails.first_name || userDetails.firstName || 'User',
      lastName: userDetails.last_name || userDetails.lastName || '',
      email: userDetails.email,
    };

    // Send email
    const result = await emailService.sendEventRegistrationEmail(
      formattedEventDetails,
      formattedUserDetails
    );

    if (result.success) {
      res.json({
        success: true,
        message: 'Event registration email sent successfully',
        messageId: result.messageId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to send email'
      });
    }
  } catch (error) {
    console.error('Error in send-event-registration endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`📧 Email service running on port ${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📨 Test email: http://localhost:${PORT}/test-email`);
});

export default app;
