import { google } from "googleapis";
import { onRequest } from "firebase-functions/v2/https";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import pkg from "firebase-admin";
import cors from "cors";
import { readFileSync } from "fs";

const { firestore: firestoreAdmin, auth: _auth } = pkg;

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

export const registerUser = onRequest((req, res) => {
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
        team: selectedTeam.fullName,
        index: nextIndex,
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

// Load OAuth2 credentials
const { client_id, client_secret, redirect_uris, refresh_token } = credentials.web;

const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

// Set the refresh token
oAuth2Client.setCredentials({
  refresh_token: refresh_token,
});

export const sendEmail = onRequest((req, res) => {
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

    const { type, recipient, subject, message, email, newEmail, verificationCode, requestCode } = req.body;

    try {
      if (type === "verification") {
        // Verification code email flow
        if (!email) {
          return res.status(400).send("Missing required field: email");
        }
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
        // Generate email content for verification code
        const verificationSubject = 'Your World Cup 2026 Login Verification Code';
        const verificationMessage = `Your verification code for logging in to the World Cup 2026 website is: ${verificationCode}\n\nThis code will expire in 10 minutes. If you did not request this code, please ignore this email.`;
        
        const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
        const rawEmail = [
          `From: "Immediate World Cup 2026 Verification" <slowest.captain@gmail.com>`,
          `To: ${normalizedEmail}`,
          `Subject: ${verificationSubject}`,
          "",
          `${verificationMessage}`,
        ].join("\n");
        const encodedEmail = Buffer.from(rawEmail)
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
        return res.status(200).json({
          message: "Verification code sent successfully",
        });
      } else if (type === "emailChange") {
        // Email change flow
        if (!email || !newEmail) {
          return res.status(400).send("Missing required fields");
        }

        const normalizedEmail = email.toLowerCase().trim();
        const normalizedNewEmail = newEmail.toLowerCase().trim();

        // Check if the new email already exists in the database
        const newEmailSnapshot = await serviceFirestore
          .collection("users")
          .where("email", "==", normalizedNewEmail)
          .get();

        if (!newEmailSnapshot.empty) {
          return res.status(409).send("Email already registered");
        }

        // Find the user with the current email
        const userDoc = await serviceFirestore.collection("users").doc(normalizedEmail).get();

        if (!userDoc.exists) {
          return res.status(404).send("User not found");
        }

        // If requestCode is true, generate and send verification code
        if (requestCode === true) {
          // Generate a 6-digit verification code
          const emailChangeCode = Math.floor(100000 + Math.random() * 900000).toString();
          
          // Set expiry time to 10 minutes from now
          const expiryTime = new Date(Date.now() + 10 * 60 * 1000);

          // Store verification code and new email in current user's document
          await serviceFirestore.collection("users").doc(normalizedEmail).update({
            emailChangeVerificationCode: emailChangeCode,
            emailChangeVerificationExpiry: pkg.firestore.Timestamp.fromDate(expiryTime),
            pendingNewEmail: normalizedNewEmail,
          });

          // Send verification email to NEW email address
          const gmail = google.gmail({ version: "v1", auth: oAuth2Client });
          const verificationSubject = 'Your World Cup 2026 Email Change Verification Code';
          const verificationMessage = `Your verification code for changing your email address is: ${emailChangeCode}\n\nThis code will expire in 10 minutes. If you did not request this change, please ignore this email.`;
          
          const rawEmail = [
            `From: "Immediate World Cup 2026 Updates" <slowest.captain@gmail.com>`,
            `To: ${normalizedNewEmail}`,
            `Subject: ${verificationSubject}`,
            "",
            `${verificationMessage}`,
          ].join("\n");
          
          const encodedEmail = Buffer.from(rawEmail)
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

          return res.status(200).json({
            message: "Verification code sent successfully",
          });
        }

        // If verificationCode is provided, verify and change email
        if (verificationCode) {
          const userData = userDoc.data();

          // Check if verification code exists
          if (!userData.emailChangeVerificationCode) {
            return res.status(400).send("No verification code found. Please request a new one.");
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
            return res.status(400).send("Verification code has expired. Please request a new one.");
          }

          // Check if verification code matches
          if (userData.emailChangeVerificationCode !== verificationCode.trim()) {
            return res.status(400).send("Invalid verification code.");
          }

          // Check if pending new email matches
          if (userData.pendingNewEmail !== normalizedNewEmail) {
            return res.status(400).send("New email does not match the pending change request.");
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
        const emailContent = [
          `From: "Immediate World Cup 2026 Updates" <slowest.captain@gmail.com>`,
          `To: ${recipient}`,
          `Subject: ${subject}`,
          "",
          `${message}`,
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
        return res.status(200).send("Email sent successfully!");
      }
    } catch (error) {
      console.error("Error sending email:", error);
      res.status(500).send("Failed to send email: " + error.message);
    }
  });
});

export const verifyLoginCode = onRequest((req, res) => {
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

export const setAdminRole = onRequest((req, res) => {
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
        assignedTeamsSet.add(userData.team);
      }
    });
    
    // Update assigned status for teams
    teamsInGroups.forEach(teamName => {
      const details = teamDetails.get(teamName);
      details.assigned = assignedTeamsSet.has(teamName);
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