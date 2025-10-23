import { sendEmailURL } from '../config/firebase-config.js';

// Function to send email notifications
export async function sendEmailNotification(recipient, subject, message) {
  try {
    const response = await fetch(sendEmailURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient, subject, message }),
    });

    if (response.ok) {
      const responseText = await response.text();
      const wasEmailSent = responseText === 'Email sent successfully!';
      
      if (wasEmailSent) {
        console.log('Email sent successfully!');
        return { sent: true, message: 'Email sent successfully!' };
      } else {
        console.log('Email not sent: User has opted out of updates');
        return { sent: false, message: 'User has opted out of email updates' };
      }
    } else {
      console.error('Failed to send email.');
      return { sent: false, message: 'Failed to send email' };
    }
  } catch (error) {
    console.error('Error sending email:', error);
    return { sent: false, message: 'Error sending email' };
  }
}