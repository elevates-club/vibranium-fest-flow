import type { VercelRequest, VercelResponse } from '@vercel/node';
import { emailService } from '../src/services/emailService';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { eventDetails, userDetails, qrDataURL, participantId } = req.body || {};

    if (!eventDetails || !userDetails || !userDetails.email) {
      return res.status(400).json({ success: false, error: 'Missing event details or user email.' });
    }

    const formattedEventDetails = {
      title: eventDetails.title || 'Untitled Event',
      date: eventDetails.start_date
        ? new Date(eventDetails.start_date).toLocaleDateString()
        : 'TBD',
      time: eventDetails.start_date
        ? new Date(eventDetails.start_date).toLocaleTimeString(undefined, {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          })
        : 'TBD',
      location: eventDetails.location || 'TBD',
      category: eventDetails.category || 'General',
      description: eventDetails.description || 'No description available',
      attendees: eventDetails.attendees || 0,
      maxAttendees: eventDetails.max_attendees || 0,
      registrationFee: eventDetails.registration_fee || 0,
      pointsReward: eventDetails.points_reward || 0,
    };

    const formattedUserDetails = {
      firstName: userDetails.first_name || userDetails.firstName || 'User',
      lastName: userDetails.last_name || userDetails.lastName || '',
      email: userDetails.email,
    };

    const result = await emailService.sendEventRegistrationEmail(
      formattedEventDetails,
      formattedUserDetails,
      { qrDataURL, participantId }
    );

    if (result.success) {
      return res.status(200).json({ success: true, messageId: result.messageId });
    }

    return res.status(500).json({ success: false, error: result.error || 'Failed to send email' });
  } catch (error: any) {
    console.error('Error in api/send-event-registration:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Internal server error.' });
  }
}


