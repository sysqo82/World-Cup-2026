const functions = require("firebase-functions");
const admin = require("firebase-admin");
const cors = require("cors");

admin.initializeApp();
const corsHandler = cors({ origin: true });

exports.registerUser = functions.https.onRequest((req, res) => {
  corsHandler(req, res, async () => {
    if (req.method !== "POST") {
      return res.status(405).send("Method Not Allowed");
    }

    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).send("Missing required fields");
    }

    try {
      const teamsRef = admin.firestore().collection("teams");
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

      await admin.firestore().collection("users").add({
        firstName,
        lastName,
        email: normalizedEmail,
        team: selectedTeam.fullName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
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