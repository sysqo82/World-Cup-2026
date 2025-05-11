import { google } from "googleapis";
import { https, config } from "firebase-functions";
import pkg from "firebase-admin";
import cors from "cors";
import { readFileSync } from "fs";

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

      await serviceFirestore.collection("users").add({
        firstName,
        lastName,
        email: normalizedEmail,
        team: selectedTeam.fullName,
        createdAt: pkg.firestore.FieldValue.serverTimestamp(),
        hasPaid: 'Pending',
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
      return res.status(403).send('Forbidden: Invalid request');
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
        return res.status(409).send("Forbidden: invalid request");
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
      const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

      const email = [
        `From: "Immediate World Cup 2026 Updates" <${config().email.user}>`,
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