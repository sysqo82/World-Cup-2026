import { google } from "googleapis";
import { https, config } from "firebase-functions";
import pkg from "firebase-admin";
import cors from "cors";
import { readFileSync } from "fs";
import { generateVerificationCodeEmail } from "./email-templates.js";

const { firestore, auth: _auth } = pkg;

const credentials = JSON.parse(readFileSync("./credentials.json"));
const allowedOrigins = credentials.allowedOrigins.origin;

pkg.initializeApp();
const corsHandler = cors({
  origin: function(origin, callback) {
    if (!origin) return callback(new Error('Not allowed by CORS'));
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  }
});

const serviceApp = pkg.initializeApp(
  {
    credential: pkg.credential.cert(credentials.serviceAccount),
    databaseURL: `https://${credentials.project_id}.firebaseio.com`
  },
  "serviceApp" // Name for the secondary app
);
const serviceFirestore = serviceApp.firestore();

export const registerUser = https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const origin = req.get('origin');
    if (!origin || !allowedOrigins.includes(origin)) {
      return res.status(403).send('Forbidden: Invalid request');
    }
    if (req.method === "OPTIONS") {
      return res.status(204).send('');
    }
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).send("Missing required fields");
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
      const normalizedEmail = email.toLowerCase().trim();

      await serviceFirestore.collection("users").doc(normalizedEmail).set({
        firstName,
        lastName,
        email: normalizedEmail,
        team: selectedTeam.fullName,
        createdAt: pkg.firestore.FieldValue.serverTimestamp(),
        hasPaid: 'Pending',
        allowUpdates: true,
        verificationCode: null,
        verificationCodeExpiry: null,
      });

      await teamsRef.doc(selectedTeam.id).update({ assigned: true });

      res.status(200).json({
        message: "User registered successfully.",
      });
    } catch (error) {
      res.status(500).send("Error registering user: " + error.message);
    }
  });
});

export const changeEmail = https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const origin = req.get('origin');
    if (!origin || !allowedOrigins.includes(origin)) {
      return res.status(403).send('Forbidden: Invalid_scope');
    }
    if (req.method === "OPTIONS") {
      return res.status(204).send('');
    }
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { email, newEmail } = req.body;

    if (!email || !newEmail) {
      return res.status(400).send("Missing required fields");
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const normalizedNewEmail = newEmail.toLowerCase().trim();

      // Check if the new email already exists in the database
      const newEmailSnapshot = await firestore()
        .collection("users")
        .where("email", "==", normalizedNewEmail)
        .get();

      if (!newEmailSnapshot.empty) {
        return res.status(409).send("Forbidden: Invalid_scope");
      }

      // Find the user with the current email
      const snapshot = await firestore()
        .collection("users")
        .where("email", "==", normalizedEmail)
        .get();

      if (snapshot.empty) {
        return res.status(404).send("User not found");
      }

      // Update the user's email
      const userDoc = snapshot.docs[0];
      await firestore()
        .collection("users")
        .doc(userDoc.id)
        .update({ email: normalizedNewEmail });

      res.status(200).send("Email updated successfully!");
    } catch (error) {
      res.status(500).send("Error changing email: " + error.message);
    }
  });
});

// Load OAuth2 credentials
const { client_id, client_secret, redirect_uris, refresh_token } = credentials.web;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// Set the refresh token
oAuth2Client.setCredentials({
  refresh_token: refresh_token,
});

export const sendEmail = https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const origin = req.get('origin');
    if (!origin || !allowedOrigins.includes(origin)) {
      return res.status(403).send('Forbidden: Invalid request');
    }
    if (req.method === "OPTIONS") {
      return res.status(204).send('');
    }
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { recipient, subject, message } = req.body;

    if (!recipient || !subject || !message) {
      return res.status(400).send("Missing required fields");
    }

    try {
      // Check if the user has allowUpdates set to true
      const normalizedRecipient = recipient.toLowerCase().trim();
      const userSnapshot = await serviceFirestore
        .collection("users")
        .where("email", "==", normalizedRecipient)
        .get();

      if (userSnapshot.empty) {
        return res.status(404).send("User not found in database");
      }

      const userData = userSnapshot.docs[0].data();
      
      // Check if allowUpdates is explicitly set to true
      if (userData.allowUpdates !== true) {
        return res.status(200).send("User has opted out of email updates");
      }

      const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

      const email = [
        `From: "Immediate World Cup 2026 Updates" <assaf.itzikson@immediate.co.uk>`,
        `To: ${recipient}`,
        `Subject: ${subject}`,
        "",
        `${message}`,
      ].join("\n");

      const encodedEmail = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
      
      await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedEmail,
        },
      });

      res.status(200).send("Email sent successfully!");
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).send("Failed to send email: " + error.message);
    }
  });
});

export const requestLoginCode = https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const origin = req.get('origin');
    if (!origin || !allowedOrigins.includes(origin)) {
      return res.status(403).send('Forbidden: Invalid request');
    }
    if (req.method === "OPTIONS") {
      return res.status(204).send('');
    }
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { email } = req.body;

    if (!email) {
      return res.status(400).send("Missing required field: email");
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if user exists
      const userDoc = await serviceFirestore.collection("users").doc(normalizedEmail).get();
      
      if (!userDoc.exists) {
        return res.status(404).send("User not found");
      }

      // Generate a 6-digit verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiry time to 10 minutes from now
      const expiryTime = new Date(Date.now() + 10 * 60 * 1000);

      // Update user document with verification code and expiry
      await serviceFirestore.collection("users").doc(normalizedEmail).update({
        verificationCode: verificationCode,
        verificationCodeExpiry: pkg.firestore.Timestamp.fromDate(expiryTime),
      });

      // Generate email template for verification code
      const emailTemplate = generateVerificationCodeEmail(email, verificationCode);
      
      // Send verification code via email
      const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

      const emailContent = [
        `From: "World Cup 2026 Verification" <assaf.itzikson@immediate.co.uk>`,
        `To: ${emailTemplate.email}`,
        `Subject: ${emailTemplate.subject}`,
        "",
        emailTemplate.message,
      ].join("\n");

      const encodedEmail = Buffer.from(emailContent)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");
      
      await gmail.users.messages.send({
        userId: "me",
        requestBody: {
          raw: encodedEmail,
        },
      });

      res.status(200).json({
        message: "Verification code sent successfully",
      });
    } catch (error) {
      console.error("Error sending verification code:", error);
      res.status(500).send("Error sending verification code: " + error.message);
    }
  });
});

export const verifyLoginCode = https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const origin = req.get('origin');
    if (!origin || !allowedOrigins.includes(origin)) {
      return res.status(403).send('Forbidden: Invalid request');
    }
    if (req.method === "OPTIONS") {
      return res.status(204).send('');
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
      
      // Get user document
      const userDoc = await serviceFirestore.collection("users").doc(normalizedEmail).get();
      
      if (!userDoc.exists) {
        return res.status(404).send("User not found");
      }

      const userData = userDoc.data();
      
      // Check if verification code exists
      if (!userData.verificationCode) {
        return res.status(400).send("No verification code found. Please request a new one.");
      }

      // Check if verification code has expired
      const now = new Date();
      if (userData.verificationCodeExpiry && userData.verificationCodeExpiry.toDate() < now) {
        // Clear expired code
        await serviceFirestore.collection("users").doc(normalizedEmail).update({
          verificationCode: null,
          verificationCodeExpiry: null,
        });
        return res.status(400).send("Verification code has expired. Please request a new one.");
      }

      // Check if verification code matches
      if (userData.verificationCode !== verificationCode.trim()) {
        return res.status(400).send("Invalid verification code.");
      }

      // Clear verification code after successful verification
      await serviceFirestore.collection("users").doc(normalizedEmail).update({
        verificationCode: null,
        verificationCodeExpiry: null,
      });

      // Return user data for successful login
      res.status(200).json({
        message: "Verification successful",
        userData: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          hasPaid: userData.hasPaid,
          team: userData.team,
        }
      });
    } catch (error) {
      console.error("Error verifying code:", error);
      res.status(500).send("Error verifying code: " + error.message);
    }
  });
});

export const setAdminRole = https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    const origin = req.get('origin');
    if (!origin || !allowedOrigins.includes(origin)) {
      return res.status(403).send('Forbidden: Invalid request');
    }
    if (req.method === "OPTIONS") {
      return res.status(204).send('');
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
      console.error("Error assigning admin role:", error);
      res.status(500).send("Failed to assign admin role: " + error.message);
    }
  });
});