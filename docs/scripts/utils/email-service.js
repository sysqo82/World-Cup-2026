import { sendEmailURL } from '../config/firebase-config.js';

// Function to send email notifications (match results)
export async function sendEmailNotification(recipient, subject, message, html) {
  try {
    const response = await fetch(sendEmailURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ recipient, subject, message, html }),
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
      // Try to parse response as JSON (for structured error responses)
      let errorResponse;
      try {
        errorResponse = await response.json();
      } catch (e) {
        // Fall back to text if JSON parsing fails
        const errorText = await response.text();
        console.error('Failed to send verification email:', errorText);
        return { sent: false, message: errorText || 'Failed to send verification email' };
      }
      
      console.error('Failed to send verification email:', errorResponse);
      return { 
        sent: false, 
        message: errorResponse.error || 'Failed to send verification email',
        sessionToken: errorResponse.sessionToken,
        needsPayment: errorResponse.needsPayment
      };
    }
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { sent: false, message: 'Error sending verification email' };
  }
}