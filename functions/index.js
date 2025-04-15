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
      const availableTeamsSnapshot = await teamsRef.where("assigned", "==", false).limit(1).get();

      if (availableTeamsSnapshot.empty) {
        return res.status(400).send("No teams available");
      }

      const teamDoc = availableTeamsSnapshot.docs[0];
      const teamData = teamDoc.data();

      // Assign the team to the user
      await admin.firestore().collection("users").add({
        firstName,
        lastName,
        email,
        team: teamData.name,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Mark the team as assigned
      await teamsRef.doc(teamDoc.id).update({ assigned: true });

      res.status(200).send(`User registered successfully. Assigned team: ${teamData.name}`);
    } catch (error) {
      res.status(500).send("Error registering user: " + error.message);
    }
  });
});
