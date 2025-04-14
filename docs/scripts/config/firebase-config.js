// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBxdeTLscpv1RK8W7SabyJJckYiBjLQRvM",
    authDomain: "world-cup-2026-b1fda.firebaseapp.com",
    projectId: "world-cup-2026-b1fda",
    storageBucket: "world-cup-2026-b1fda.firebasestorage.app",
    messagingSenderId: "355932893733",
    appId: "1:355932893733:web:cb338ea08dc12705bf05cc",
    measurementId: "G-6QWWJLC2LM",
    functionsURL: "https://us-central1-world-cup-2026-b1fda.cloudfunctions.net/registerUser"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Export Firebase services
export { app, db, auth };
export const functionsURL = firebaseConfig.functionsURL;
