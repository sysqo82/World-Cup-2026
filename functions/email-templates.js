// Email templates for Cloud Functions
// This file contains email templates that can be used in the serverless environment

export function generateVerificationCodeEmail(email, verificationCode) {
  return {
    email: email,
    subject: "Your Login Verification Code",
    message: `Your verification code is: ${verificationCode}

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Thank you,
World Cup 2026 Team`
  };
}