import { onRequest } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import pkg from "firebase-admin";
import { readFileSync } from "fs";
import crypto from "crypto";
import nodemailer from "nodemailer";

const { firestore: firestoreAdmin, auth: _auth } = pkg;

const credentials = JSON.parse(readFileSync("./credentials.json"));
const allowedOrigins = credentials.allowedOrigins.origin;

// Encryption configuration
const ENCRYPTION_KEY = credentials.encryptionKey || process.env.TEAM_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
const ALGORITHM = 'aes-256-cbc';

// Encryption helper functions
function encryptTeamName(teamName) {
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(teamName, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptTeamName(encryptedTeam) {
  const key = Buffer.from(ENCRYPTION_KEY.substring(0, 64), 'hex');
  const parts = encryptedTeam.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

pkg.initializeApp();

const serviceApp = pkg.initializeApp(
  {
    credential: pkg.credential.cert(credentials.serviceAccount),
    databaseURL: `https://${credentials.project_id}.firebaseio.com`
  },
  "serviceApp" // Name for the secondary app
);
const serviceFirestore = serviceApp.firestore();

// Helper function to validate origin (allows localhost/127.0.0.1 for development)
function isOriginAllowed(origin) {
  if (!origin) return false;
  if (origin.includes('127.0.0.1') || origin.includes('localhost')) return true;
  return allowedOrigins.includes(origin);
}

// Helper to handle CORS and return early for OPTIONS
function handleCorsAndOptions(req, res, origin) {
  const corsHeaders = {};
  if (isOriginAllowed(origin)) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
    corsHeaders['Access-Control-Allow-Credentials'] = 'true';
    corsHeaders['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS,PUT,DELETE';
    corsHeaders['Access-Control-Allow-Headers'] = 'Content-Type,Authorization';
    corsHeaders['Access-Control-Max-Age'] = '3600';
  }

  if (req.method === 'OPTIONS') {
    // Use writeHead + end to bypass any Express/emulator middleware that
    // might clear or override headers set via res.set()
    res.writeHead(204, corsHeaders);
    res.end();
    return { handled: true };
  }

  // For normal requests, set CORS headers so they appear on the actual response
  Object.entries(corsHeaders).forEach(([k, v]) => res.set(k, v));
  return { handled: false };
}

// SECURITY FIX 2.3: Validate email format to prevent injection attacks
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required and must be a string' };
  }

  // Trim and check length (RFC 5321 limit is 254 characters)
  const trimmedEmail = email.toLowerCase().trim();
  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  if (trimmedEmail.length < 5) {
    return { valid: false, error: 'Email is too short' };
  }

  // Validate email format using RFC 5322 simplified regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true, normalizedEmail: trimmedEmail };
}

// SECURITY FIX 1.5: Rate limiting configuration for authentication endpoints
const RATE_LIMIT_CONFIG = {
  VERIFICATION_CODE: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    lockoutMs: 5 * 60 * 1000, // 5 minute lockout after max attempts
  },
  EMAIL_SENDING: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    lockoutMs: 30 * 60 * 1000, // 30 minute lockout
  },
};

// SECURITY FIX 1.5: Check and enforce rate limits on sensitive operations
async function checkRateLimit(identifier, limitType) {
  const rateLimitDoc = serviceFirestore.collection('rateLimits').doc(`${limitType}:${identifier}`);
  const doc = await rateLimitDoc.get();
  const now = Date.now();
  
  let rateLimitData = {
    attempts: 0,
    firstAttemptTime: now,
    lastAttemptTime: now,
    isLocked: false,
    lockUntil: null,
  };
  
  if (doc.exists) {
    rateLimitData = doc.data();
  }
  
  const config = RATE_LIMIT_CONFIG[limitType];
  
  // Check if user is currently locked out
  if (rateLimitData.isLocked && rateLimitData.lockUntil && now < rateLimitData.lockUntil) {
    const remainingMs = rateLimitData.lockUntil - now;
    return {
      allowed: false,
      error: 'Too many attempts. Please try again later.',
      retryAfter: Math.ceil(remainingMs / 1000),
    };
  }
  
  // Reset if window has passed
  if (now - rateLimitData.firstAttemptTime > config.windowMs) {
    rateLimitData.attempts = 0;
    rateLimitData.firstAttemptTime = now;
    rateLimitData.isLocked = false;
    rateLimitData.lockUntil = null;
  }
  
  // Increment attempts
  rateLimitData.attempts += 1;
  rateLimitData.lastAttemptTime = now;
  
  // Check if limit exceeded
  if (rateLimitData.attempts > config.maxAttempts) {
    rateLimitData.isLocked = true;
    const jitterFactor = 0.8 + Math.random() * 0.4;
    rateLimitData.lockUntil = now + Math.floor(config.lockoutMs * jitterFactor);
    
    await rateLimitDoc.set(rateLimitData);
    
    const retryAfter = Math.ceil((rateLimitData.lockUntil - now) / 1000);
    return {
      allowed: false,
      error: 'Too many attempts. Please try again later.',
      retryAfter: retryAfter,
    };
  }
  
  // Save updated attempt count
  await rateLimitDoc.set(rateLimitData);
  
  return { allowed: true };
}

// SECURITY FIX 1.5: Helper to log rate limit event for monitoring
async function logRateLimitEvent(action, identifier, success, reason = null) {
  try {
    await serviceFirestore.collection('rateLimitEvents').add({
      action,
      identifier: identifier.toLowerCase(),
      success,
      reason,
      timestamp: pkg.firestore.FieldValue.serverTimestamp(),
      ip: null, // Would need request context to capture IP
    });
  } catch (error) {
    console.error('Failed to log rate limit event');
  }
}

export const registerUser = onRequest(async (req, res) => {
  const origin = req.get('origin');
  const corsResult = handleCorsAndOptions(req, res, origin);
  if (corsResult.handled) return;
  
  if (!isOriginAllowed(origin)) {
    return res.status(403).send('Forbidden: Invalid request');
  }
  
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { firstName, lastName, email } = req.body;

  if (!firstName || !lastName || !email) {
    return res.status(400).send("Missing required fields");
  }

  // SECURITY FIX 2.3: Validate email format
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    return res.status(400).send(emailValidation.error);
  }

  try {
    const teamsRef = serviceFirestore.collection("teams");
      const availableTeamsSnapshot = await teamsRef.where("assigned", "==", false).get();

      if (availableTeamsSnapshot.empty) {
        return res.status(400).send("No teams available");
      }

      const availableTeams = availableTeamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      const randomIndex = Math.floor(Math.random() * availableTeams.length);
      const selectedTeam = availableTeams[randomIndex];
      const normalizedEmail = emailValidation.normalizedEmail;

      // SECURITY/DATA INTEGRITY: Check if user already exists before registering
      const existingUserDoc = await serviceFirestore.collection("users").doc(normalizedEmail).get();
      if (existingUserDoc.exists) {
        // SECURITY FIX 1.6: Don't reveal that email is taken, use generic response
        await logRateLimitEvent('DUPLICATE_REGISTRATION_ATTEMPT', normalizedEmail, false, 'Email already registered');
        return res.status(200).json({
          message: "Thank you for registering. If you already have an account, please use the login form to access it."
        });
      }

      // Get the current highest index number
      const usersSnapshot = await serviceFirestore.collection("users")
        .orderBy("index", "desc")
        .limit(1)
        .get();
      
      let nextIndex = 1; // Default to 1 if no users exist
      if (!usersSnapshot.empty) {
        const highestUser = usersSnapshot.docs[0].data();
        nextIndex = (highestUser.index || 0) + 1;
      }

      await serviceFirestore.collection("users").doc(normalizedEmail).set({
        firstName,
        lastName,
        email: normalizedEmail,
        team: encryptTeamName(selectedTeam.fullName),
        index: nextIndex,
        hasPaid: 'Pending',
        allowUpdates: true,
        verificationCode: null,
        verificationCodeExpiry: null,
      });

      await teamsRef.doc(selectedTeam.id).update({ assigned: true });

      // Create a session immediately so the client can go straight to the payment screen
      const sessionToken = generateSessionToken();
      const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await serviceFirestore.collection("users").doc(normalizedEmail).update({
        sessionToken: sessionToken,
        sessionExpiry: pkg.firestore.Timestamp.fromDate(sessionExpiry),
      });

      res.set('Set-Cookie', `sessionId=${sessionToken}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Strict`);
      res.status(200).json({
        message: "User registered successfully.",
        sessionToken: sessionToken,
      });
    } catch (error) {
      res.status(500).send("Error registering user: " + error.message);
    }
});

// Load credentials and create email transporter with Gmail App Password
const senderEmail = 'slowest.captain@gmail.com';
const appPassword = 'omws mqhp smmy nqwx'; // Gmail app-specific password (2FA enabled account)

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: senderEmail,
    pass: appPassword,
  },
});

export const sendEmail = onRequest(async (req, res) => {
  const origin = req.get('origin');
  const corsResult = handleCorsAndOptions(req, res, origin);
  if (corsResult.handled) return;

  if (!isOriginAllowed(origin)) {
    return res.status(403).send('Forbidden: Invalid request');
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { type, recipient, subject, message, email, newEmail, verificationCode, requestCode } = req.body;

  try {
      if (type === "verification") {
        // Verification code email flow
        if (!email) {
          return res.status(400).send("Missing required field: email");
        }
        
        // SECURITY FIX 2.3: Validate email format
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
          return res.status(400).send(emailValidation.error);
        }
        const normalizedEmail = emailValidation.normalizedEmail;
        
        // SECURITY FIX 1.5: Check rate limit on verification code requests
        const rateLimitCheck = await checkRateLimit(normalizedEmail, 'VERIFICATION_CODE');
        if (!rateLimitCheck.allowed) {
          res.set('Retry-After', rateLimitCheck.retryAfter);
          await logRateLimitEvent('VERIFICATION_CODE_REQUEST_BLOCKED', normalizedEmail, false, rateLimitCheck.error);
          return res.status(429).json({ error: rateLimitCheck.error });
        }
        
        // SECURITY FIX 1.6: Check if user exists (log but don't reveal to prevent email enumeration)
        const userDoc = await serviceFirestore.collection("users").doc(normalizedEmail).get();
        if (!userDoc.exists) {
          await logRateLimitEvent('VERIFICATION_CODE_USER_NOT_FOUND', normalizedEmail, false, 'Email not registered');
          return res.status(200).json({
            message: "If this email is registered, a verification code has been sent. Please check your inbox."
          });
        }
        // Generate a 6-digit verification code using cryptographically secure method
        const verificationCode = generateVerificationCode();
        // Set expiry time to 10 minutes from now
        const expiryTime = new Date(Date.now() + 10 * 60 * 1000);
        // Update user document with verification code and expiry
        await serviceFirestore.collection("users").doc(normalizedEmail).update({
          verificationCode: verificationCode,
          verificationCodeExpiry: pkg.firestore.Timestamp.fromDate(expiryTime),
        });
        // Generate email content for verification code
        const verificationSubject = 'Your World Cup 2026 Login Verification Code';
        const verificationMessage = `Your verification code for logging in to the World Cup 2026 website is: ${verificationCode}\n\nThis code will expire in 10 minutes. If you did not request this code, please ignore this email.`;
        
        await transporter.sendMail({
          from: '"World Cup 2026 Verification" <' + senderEmail + '>',
          to: normalizedEmail,
          subject: verificationSubject,
          text: verificationMessage,
        });
        return res.status(200).json({
          message: "Verification code sent successfully",
        });
      } else if (type === "emailChange") {
        // Email change flow
        if (!email || !newEmail) {
          return res.status(400).send("Missing required fields");
        }

        // SECURITY FIX 2.3: Validate both email addresses
        const emailValidation = validateEmail(email);
        if (!emailValidation.valid) {
          return res.status(400).send(emailValidation.error);
        }
        
        const newEmailValidation = validateEmail(newEmail);
        if (!newEmailValidation.valid) {
          return res.status(400).send(newEmailValidation.error);
        }

        const normalizedEmail = emailValidation.normalizedEmail;
        const normalizedNewEmail = newEmailValidation.normalizedEmail;

        // Check if the new email already exists in the database
        const newEmailSnapshot = await serviceFirestore
          .collection("users")
          .where("email", "==", normalizedNewEmail)
          .get();

        if (!newEmailSnapshot.empty) {
          // SECURITY FIX 1.6: Don't reveal if email is already taken
          await logRateLimitEvent('EMAIL_ALREADY_EXISTS', normalizedNewEmail, false, 'Email in use');
          return res.status(200).json({
            message: "Email change request received. Please check your inbox for verification details."
          });
        }

        // Find the user with the current email
        const userDoc = await serviceFirestore.collection("users").doc(normalizedEmail).get();

        // SECURITY FIX 1.6: Don't reveal if user exists
        if (!userDoc.exists) {
          await logRateLimitEvent('EMAIL_CHANGE_USER_NOT_FOUND', normalizedEmail, false, 'Email not registered');
          return res.status(200).json({
            message: "If this email is registered, you will receive a verification code. Check your inbox."
          });
        }

        // If requestCode is true, generate and send verification code
        if (requestCode === true) {
          // SECURITY FIX 1.5: Check rate limit on email change code requests
          const rateLimitCheck = await checkRateLimit(normalizedEmail, 'VERIFICATION_CODE');
          if (!rateLimitCheck.allowed) {
            res.set('Retry-After', rateLimitCheck.retryAfter);
            await logRateLimitEvent('EMAIL_CHANGE_CODE_REQUEST_BLOCKED', normalizedEmail, false, rateLimitCheck.error);
            return res.status(429).json({ error: rateLimitCheck.error });
          }
          
          // Generate a 6-digit verification code using cryptographically secure method
          const emailChangeCode = generateVerificationCode();
          
          // Set expiry time to 10 minutes from now
          const expiryTime = new Date(Date.now() + 10 * 60 * 1000);

          // Store verification code and new email in current user's document
          await serviceFirestore.collection("users").doc(normalizedEmail).update({
            emailChangeVerificationCode: emailChangeCode,
            emailChangeVerificationExpiry: pkg.firestore.Timestamp.fromDate(expiryTime),
            pendingNewEmail: normalizedNewEmail,
          });

          // Send verification email to NEW email address
          const verificationSubject = 'Your World Cup 2026 Email Change Verification Code';
          const verificationMessage = `Your verification code for changing your email address is: ${emailChangeCode}\n\nThis code will expire in 10 minutes. If you did not request this change, please ignore this email.`;
          
          await transporter.sendMail({
            from: '"World Cup 2026 Updates" <' + senderEmail + '>',
            to: normalizedNewEmail,
            subject: verificationSubject,
            text: verificationMessage,
          });

          return res.status(200).json({
            message: "Verification code sent successfully",
          });
        }

        // If verificationCode is provided, verify and change email
        if (verificationCode) {
          const userData = userDoc.data();

          // Check if verification code exists
          if (!userData.emailChangeVerificationCode) {
            await logRateLimitEvent('EMAIL_CHANGE_CODE_NOT_FOUND', normalizedEmail, false, 'No code sent');
            return res.status(400).json({ error: "Invalid verification code or email." });
          }

          // Check if verification code has expired
          const now = new Date();
          if (userData.emailChangeVerificationExpiry && userData.emailChangeVerificationExpiry.toDate() < now) {
            // Clear expired code
            await serviceFirestore.collection("users").doc(normalizedEmail).update({
              emailChangeVerificationCode: null,
              emailChangeVerificationExpiry: null,
              pendingNewEmail: null,
            });
            await logRateLimitEvent('EMAIL_CHANGE_CODE_EXPIRED', normalizedEmail, false, 'Code expired');
            return res.status(400).json({ error: "Invalid verification code or email." });
          }

          // Check if verification code matches
          if (userData.emailChangeVerificationCode !== verificationCode.trim()) {
            await logRateLimitEvent('EMAIL_CHANGE_CODE_INVALID', normalizedEmail, false, 'Invalid code');
            return res.status(400).json({ error: "Invalid verification code or email." });
          }

          // Check if pending new email matches
          if (userData.pendingNewEmail !== normalizedNewEmail) {
            await logRateLimitEvent('EMAIL_CHANGE_MISMATCH', normalizedEmail, false, 'Email mismatch');
            return res.status(400).json({ error: "Invalid verification code or email." });
          }

          // Get all user data
          const userDataToTransfer = {
            ...userData,
            email: normalizedNewEmail,
            emailChangeVerificationCode: null,
            emailChangeVerificationExpiry: null,
            pendingNewEmail: null,
          };

          // Create new document with new email as ID
          await serviceFirestore.collection("users").doc(normalizedNewEmail).set(userDataToTransfer);

          // Delete old document
          await serviceFirestore.collection("users").doc(normalizedEmail).delete();

          return res.status(200).json({
            message: "Email updated successfully",
          });
        }

        return res.status(400).send("Invalid request: missing requestCode or verificationCode");
      } else {
        // Default: match result or other email
        if (!recipient || !subject || !message) {
          return res.status(400).send("Missing required fields");
        }
        
        // SECURITY FIX 2.3: Validate recipient email format
        const recipientValidation = validateEmail(recipient);
        if (!recipientValidation.valid) {
          return res.status(400).send(recipientValidation.error);
        }
        const normalizedRecipient = recipientValidation.normalizedEmail;
        
        // SECURITY FIX 2.3: Validate subject and message to prevent email header injection
        if (typeof subject !== 'string' || typeof message !== 'string') {
          return res.status(400).send("Subject and message must be strings");
        }
        const trimmedSubject = subject.trim();
        const trimmedMessage = message.trim();
        
        // Prevent email header injection by rejecting subjects with newlines/carriage returns
        if (trimmedSubject.includes('\n') || trimmedSubject.includes('\r') || trimmedSubject.length === 0 || trimmedSubject.length > 255) {
          return res.status(400).send("Subject must be a single line, non-empty, and under 255 characters");
        }
        if (trimmedMessage.length === 0 || trimmedMessage.length > 10000) {
          return res.status(400).send("Message must be non-empty and under 10000 characters");
        }
        
        // Check if the user has allowUpdates set to true
        const userSnapshot = await serviceFirestore
          .collection("users")
          .where("email", "==", normalizedRecipient)
          .get();
        if (userSnapshot.empty) {
          await logRateLimitEvent('EMAIL_SEND_USER_NOT_FOUND', normalizedRecipient, false, 'Email not registered');
          return res.status(200).send("Email sent successfully!");
        }
        const userData = userSnapshot.docs[0].data();
        // Check if allowUpdates is explicitly set to true
        if (userData.allowUpdates !== true) {
          return res.status(200).send("User has opted out of email updates");
        }
        
        await transporter.sendMail({
          from: '"World Cup 2026 Updates" <' + senderEmail + '>',
          to: normalizedRecipient,
          subject: trimmedSubject,
          text: trimmedMessage,
        });
        return res.status(200).send("Email sent successfully!");
      }
    } catch (error) {
      res.status(500).send("Failed to send email: " + error.message);
    }
});

// SECURITY FIX 1.4: Generate cryptographically secure verification codes
// Replaces weak Math.random() with crypto.randomBytes() per CWE-338
function generateVerificationCode() {
  // Generate a random 32-bit unsigned integer
  const buffer = crypto.randomBytes(4);
  // Read the value as a big-endian unsigned 32-bit integer
  const randomValue = buffer.readUInt32BE(0);
  // Map to 6-digit range (100000-999999) using modulo
  const code = (randomValue % 900000) + 100000;
  // Ensure it's zero-padded to 6 digits
  return code.toString().padStart(6, '0');
}

// SECURITY FIX 1.2: Generate secure session tokens for server-side session management
function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

export const verifyLoginCode = onRequest(async (req, res) => {
  const origin = req.get('origin');
  const corsResult = handleCorsAndOptions(req, res, origin);
  if (corsResult.handled) return;

  if (!isOriginAllowed(origin)) {
    return res.status(403).send('Forbidden: Invalid request');
  }
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { email, verificationCode } = req.body;

  if (!email || !verificationCode) {
    return res.status(400).send("Missing required fields");
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();

    // SECURITY FIX 1.5: Check rate limit on verification attempts (brute force protection)
    const rateLimitCheck = await checkRateLimit(normalizedEmail, 'VERIFICATION_CODE');
    if (!rateLimitCheck.allowed) {
      res.set('Retry-After', rateLimitCheck.retryAfter);
      await logRateLimitEvent('VERIFICATION_CODE_VERIFY_BLOCKED', normalizedEmail, false, rateLimitCheck.error);
      return res.status(429).json({ error: rateLimitCheck.error });
    }

    // Get user document
    const userDoc = await serviceFirestore.collection("users").doc(normalizedEmail).get();

    // SECURITY FIX 1.6: Don't reveal account existence (prevent email enumeration)
    if (!userDoc.exists) {
      await logRateLimitEvent('VERIFY_CODE_USER_NOT_FOUND', normalizedEmail, false, 'Unknown email');
      return res.status(400).json({ error: "Invalid email or verification code." });
    }

    const userData = userDoc.data();

      // Check if verification code exists
      if (!userData.verificationCode) {
        await logRateLimitEvent('VERIFY_CODE_NOT_SENT', normalizedEmail, false, 'No code requested');
        return res.status(400).json({ error: "Invalid email or verification code." });
      }

      // Check if verification code has expired
      const now = new Date();
      if (userData.verificationCodeExpiry && userData.verificationCodeExpiry.toDate() < now) {
        // Clear expired code
        await serviceFirestore.collection("users").doc(normalizedEmail).update({
          verificationCode: null,
          verificationCodeExpiry: null,
        });
        // SECURITY FIX 1.6: Use generic message (don't reveal code was sent)
        await logRateLimitEvent('VERIFY_CODE_EXPIRED', normalizedEmail, false, 'Code expired');
        return res.status(400).json({ error: "Invalid email or verification code." });
      }

      // Check if verification code matches
      if (userData.verificationCode !== verificationCode.trim()) {
        await logRateLimitEvent('VERIFICATION_CODE_INVALID', normalizedEmail, false, 'Invalid code submitted');
        return res.status(400).json({ error: "Invalid email or verification code." });
      }

      // SECURITY FIX 1.5: Clear rate limit on successful verification
      await serviceFirestore.collection('rateLimits').doc(`VERIFICATION_CODE:${normalizedEmail}`).delete();
      await logRateLimitEvent('VERIFICATION_CODE_SUCCESS', normalizedEmail, true);

      // SECURITY FIX 1.2: Generate secure session token
      const sessionToken = generateSessionToken();
      const sessionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      // SECURITY FIX 1.2: Store session token on server-side
      await serviceFirestore.collection("users").doc(normalizedEmail).update({
        verificationCode: null,
        verificationCodeExpiry: null,
        sessionToken: sessionToken,
        sessionExpiry: pkg.firestore.Timestamp.fromDate(sessionExpiry),
      });

      // Set HttpOnly cookie for production (HTTPS) environments
      res.set('Set-Cookie', `sessionId=${sessionToken}; Path=/; Max-Age=${30 * 24 * 60 * 60}; HttpOnly; SameSite=Strict`);

      // Also return the token in the body so the client can store it for
      // environments where cookies aren't reliably sent (e.g. local emulator)
      res.status(200).json({
        message: "Verification successful",
        sessionToken: sessionToken
      });
    } catch (error) {
      res.status(500).send("Error verifying code: " + error.message);
    }
});

// SECURITY FIX 1.2: New endpoint to get user status from session token (server-side verification)
export const getUserStatus = onRequest(async (req, res) => {
  const origin = req.get('origin');
  const corsResult = handleCorsAndOptions(req, res, origin);
  if (corsResult.handled) return;

  if (!isOriginAllowed(origin)) {
    return res.status(403).send('Forbidden: Invalid request');
  }
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    try {
      // Accept session token from Authorization: Bearer header (SPA/local dev)
      // or fall back to the HttpOnly cookie (production)
      let sessionToken = null;
      const authHeader = req.get('Authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7).trim();
      }
      if (!sessionToken) {
        const cookies = req.get('cookie') || '';
        const sessionIdMatch = cookies.match(/sessionId=([^;]+)/);
        sessionToken = sessionIdMatch ? sessionIdMatch[1] : null;
      }

      if (!sessionToken) {
        return res.status(200).json({ authenticated: false, message: "No session token" });
      }

      // Find user by session token
      const usersSnapshot = await serviceFirestore.collection("users")
        .where("sessionToken", "==", sessionToken)
        .limit(1)
        .get();

      if (usersSnapshot.empty) {
        return res.status(200).json({ authenticated: false, message: "Invalid session token" });
      }

      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();

      // Check session expiry
      const now = new Date();
      if (userData.sessionExpiry && userData.sessionExpiry.toDate() < now) {
        // Clear expired session
        await userDoc.ref.update({
          sessionToken: null,
          sessionExpiry: null,
        });
        return res.status(200).json({ authenticated: false, message: "Session expired" });
      }

      // Return user status from server (server decides what user can access)
      res.status(200).json({
        authenticated: true,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        hasPaid: userData.hasPaid,
        team: userData.team, // Still encrypted on server
      });
    } catch (error) {
      res.status(500).send("Error getting user status: " + error.message);
    }
});

export const setAdminRole = onRequest(async (req, res) => {
  const origin = req.get('origin');
  const corsResult = handleCorsAndOptions(req, res, origin);
  if (corsResult.handled) return;

  if (!isOriginAllowed(origin)) {
    return res.status(403).send('Forbidden: Invalid request');
  }
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // Check if the request is authenticated
  if (!req.headers.authorization || !req.headers.authorization.startsWith("Bearer ")) {
    return res.status(403).send("Unauthorized");
  }

  const idToken = req.headers.authorization.split("Bearer ")[1];

  try {
    // Verify the ID token
    const decodedToken = await _auth().verifyIdToken(idToken);

    // Check if the user has the admin claim
    if (!decodedToken.admin) {
      return res.status(403).send("Permission denied: Only admins can assign admin roles.");
    }

    const { uid } = req.body;

    if (!uid) {
      return res.status(400).send("Missing required field: uid");
    }

    // Set the admin custom claim
    await _auth().setCustomUserClaims(uid, { admin: true });

    res.status(200).json({
      message: `Admin role assigned to user with UID: ${uid}`,
    });
  } catch (error) {
    res.status(500).send("Failed to assign admin role: " + error.message);
  }
});

// Firestore trigger to sync teams table when groups collection changes
export const syncTeamsOnGroupsUpdate = onDocumentWritten("groups/{groupId}", async (event) => {
  try {
    console.log('Groups collection changed, syncing teams table...');
    
    // Load country mappings
    let countryMap = new Map();
    try {
      const countriesText = readFileSync('./countries.txt', 'utf8');
      const lines = countriesText.split('\n').slice(1); // Skip header
      lines.forEach(line => {
        const parts = line.split('\t');
        if (parts.length >= 2) {
          const abbreviation = parts[0].trim();
          const fullName = parts[1].trim();
          if (abbreviation && fullName) {
            countryMap.set(abbreviation, fullName);
          }
        }
      });
      console.log(`Loaded ${countryMap.size} country mappings`);
    } catch (error) {
      console.warn('Could not load countries.txt, using abbreviations as full names');
    }
    
    // Get all groups to extract all teams
    const groupsSnapshot = await serviceFirestore.collection('groups').get();
    
    // Extract all teams from all groups
    const teamsInGroups = new Set();
    const teamDetails = new Map(); // Map to store full name -> full details
    
    groupsSnapshot.forEach(groupDoc => {
      const groupData = groupDoc.data();
      if (groupData.teams) {
        Object.values(groupData.teams).forEach(team => {
          if (team.name && team.name !== 'TBD') {
            const abbreviation = team.name;
            const fullName = countryMap.get(abbreviation) || abbreviation;
            
            teamsInGroups.add(fullName);
            if (!teamDetails.has(fullName)) {
              teamDetails.set(fullName, {
                fullName: fullName,
                abbreviation: abbreviation,
                assigned: false // Will be updated based on users collection
              });
            }
          }
        });
      }
    });
    
    console.log(`Found ${teamsInGroups.size} unique teams in groups`);
    
    // Get all existing teams in teams table
    const teamsSnapshot = await serviceFirestore.collection('teams').get();
    const existingTeams = new Set();
    const teamsToDelete = [];
    
    teamsSnapshot.forEach(teamDoc => {
      const teamData = teamDoc.data();
      const teamName = teamData.fullName || teamData.abbreviation;
      existingTeams.add(teamName);
      
      // Mark teams for deletion if they're not in groups anymore
      if (!teamsInGroups.has(teamName)) {
        teamsToDelete.push(teamDoc.id);
      }
    });
    
    // Check which users have teams assigned
    const usersSnapshot = await serviceFirestore.collection('users').get();
    const assignedTeamsSet = new Set();
    
    usersSnapshot.forEach(userDoc => {
      const userData = userDoc.data();
      if (userData.team) {
        try {
          // Decrypt the team name if it's encrypted
          const decrypted = userData.team.includes(':') ? decryptTeamName(userData.team) : userData.team;
          console.log(`User ${userData.email} has team: ${decrypted}`);
          assignedTeamsSet.add(decrypted);
        } catch (error) {
          console.warn(`Failed to decrypt team for user ${userData.email}: ${error.message}`);
          // Fall back to using encrypted value if decryption fails
          assignedTeamsSet.add(userData.team);
        }
      }
    });
    
    console.log(`Teams assigned to users: ${Array.from(assignedTeamsSet).join(', ')}`);
    
    // Update assigned status for teams
    teamsInGroups.forEach(teamName => {
      const details = teamDetails.get(teamName);
      const isAssigned = assignedTeamsSet.has(teamName);
      if (isAssigned) {
        console.log(`Team ${teamName} is ASSIGNED`);
      }
      details.assigned = isAssigned;
    });
    
    // Delete teams that are no longer in groups
    const batch = serviceFirestore.batch();
    let batchCount = 0;
    
    for (const teamId of teamsToDelete) {
      console.log(`Deleting team ${teamId} (no longer in groups)`);
      batch.delete(serviceFirestore.collection('teams').doc(teamId));
      batchCount++;
      
      if (batchCount === 500) {
        await batch.commit();
        batchCount = 0;
      }
    }
    
    // Add or update teams from groups
    for (const [teamName, details] of teamDetails) {
      // Check if team already exists
      const existingTeamQuery = await serviceFirestore.collection('teams')
        .where('fullName', '==', teamName)
        .get();
      
      if (existingTeamQuery.empty) {
        // Add new team
        console.log(`Adding new team: ${teamName}`);
        batch.set(serviceFirestore.collection('teams').doc(), details);
        batchCount++;
      } else {
        // Update existing team
        console.log(`Updating team: ${teamName}`);
        existingTeamQuery.forEach(doc => {
          batch.update(doc.ref, { assigned: details.assigned });
          batchCount++;
        });
      }
      
      if (batchCount === 500) {
        await batch.commit();
        batchCount = 0;
      }
    }
    
    // Commit any remaining operations
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log('Teams table synced successfully');
    console.log(`Deleted ${teamsToDelete.length} obsolete teams`);
    console.log(`Updated/added ${teamsInGroups.size} teams`);
    
    return null;
  } catch (error) {
    console.error('Error syncing teams table:', error);
    return null;
  }
});

// Export decrypt function for client use
export const decryptTeam = onRequest(async (req, res) => {
  const origin = req.get('origin');
  const corsResult = handleCorsAndOptions(req, res, origin);
  if (corsResult.handled) return;

  if (!isOriginAllowed(origin)) {
    return res.status(403).send('Forbidden: Invalid request');
  }
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  // SECURITY FIX 1.8: Require authentication to decrypt team data
  let sessionToken = null;
  const authHeader = req.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    sessionToken = authHeader.substring(7).trim();
  }

  if (!sessionToken) {
    return res.status(401).json({ error: "Unauthorized: No session token provided" });
  }

  const { encryptedTeam } = req.body;

  if (!encryptedTeam) {
    return res.status(400).send("Missing required field: encryptedTeam");
  }

  try {
    // First, try to verify as a session token
    let isValid = false;
    const usersSnapshot = await serviceFirestore.collection("users")
      .where("sessionToken", "==", sessionToken)
      .limit(1)
      .get();

    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();

      // SECURITY FIX: Verify user has paid before allowing team decryption
      if (!userData.hasPaid || (userData.hasPaid !== true && userData.hasPaid !== 'Paid')) {
        return res.status(403).json({ 
          error: "Forbidden: Cannot decrypt team data before payment. Please complete your payment first." 
        });
      }

      // Check session expiry
      const now = new Date();
      if (userData.sessionExpiry && userData.sessionExpiry.toDate() < now) {
        // Clear expired session
        await userDoc.ref.update({
          sessionToken: null,
          sessionExpiry: null,
        });
      } else {
        isValid = true;
      }
    }

    // If not a valid session token, try to verify as Firebase ID token
    if (!isValid) {
      try {
        await _auth().verifyIdToken(sessionToken);
        isValid = true;
      } catch (error) {
        console.warn('Failed to verify token as Firebase ID token:', error.message);
      }
    }

    if (!isValid) {
      return res.status(401).json({ error: "Unauthorized: Invalid token" });
    }

    const decrypted = decryptTeamName(encryptedTeam);
    res.status(200).json({ teamName: decrypted });
  } catch (error) {
    res.status(500).send("Error decrypting team: " + error.message);
  }
});