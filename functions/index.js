import { google } from "googleapis";
import { https, config } from "firebase-functions";
import pkg from "firebase-admin";
import cors from "cors";
import { readFileSync } from "fs";

const { firestore, auth: _auth } = pkg;

pkg.initializeApp();
const corsHandler = cors({ origin: true });

export const registerUser = https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).send("Missing required fields");
    }

    try {
      const teamsRef = firestore().collection("teams");
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

      await firestore().collection("users").add({
        firstName,
        lastName,
        email: normalizedEmail,
        team: selectedTeam.fullName,
        createdAt: firestore.FieldValue.serverTimestamp(),
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

// Load OAuth2 credentials
const credentials = JSON.parse(readFileSync("./credentials.json"));
const { client_id, client_secret, redirect_uris, refresh_token } = credentials.web;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// Set the refresh token
oAuth2Client.setCredentials({
  refresh_token: refresh_token,
});

export const sendEmail = https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
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
        `From: "Immediate World Cup 2026 Updates" <${config().email.user}>`, // Use display name and email
        `To: ${recipient}`,
        `Subject: ${subject}`,
        "",
        `${message}`,
      ].join("\n");

      const encodedEmail = Buffer.from(email).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      
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