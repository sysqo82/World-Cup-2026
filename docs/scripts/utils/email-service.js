import { db, sendEmailURL } from '../config/firebase-config.js';

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
      console.log('Email sent successfully!');
    } else {
      console.error('Failed to send email.');
    }
  } catch (error) {
    console.error('Error sending email:', error);
  }
}