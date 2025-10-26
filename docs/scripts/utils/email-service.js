import { sendEmailURL } from '../config/firebase-config.js';

// Function to send email notifications (match results)
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

// Function to send verification code email
export async function sendVerificationEmail(email) {
  try {
    const response = await fetch(sendEmailURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'verification', email }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('Verification email sent successfully!');
      return { sent: true, message: result.message || 'Verification code sent successfully' };
    } else {
      const errorText = await response.text();
      console.error('Failed to send verification email:', errorText);
      return { sent: false, message: errorText || 'Failed to send verification email' };
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { sent: false, message: 'Error sending verification email' };
  }
}