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
            await admin.firestore().collection("users").add({
                firstName,
                lastName,
                email,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            res.status(200).send("User registered successfully");
        } catch (error) {
            res.status(500).send("Error registering user: " + error.message);
        }
    });
});
