// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBxdeTLscpv1RK8W7SabyJJckYiBjLQRvM",
    authDomain: "world-cup-2026-b1fda.firebaseapp.com",
    projectId: "world-cup-2026-b1fda",
    storageBucket: "world-cup-2026-b1fda.firebasestorage.app",
    messagingSenderId: "355932893733",
    appId: "1:355932893733:web:cb338ea08dc12705bf05cc",
    measurementId: "G-6QWWJLC2LM",
    registerUser: "https://us-central1-world-cup-2026-b1fda.cloudfunctions.net/registerUser",
    sendEmailURL: "https://us-central1-world-cup-2026-b1fda.cloudfunctions.net/sendEmail",
    setAdminRoleURL: "https://us-central1-world-cup-2026-b1fda.cloudfunctions.net/setAdminRole",
    changeEmailURL: "https://us-central1-world-cup-2026-b1fda.cloudfunctions.net/changeEmail",
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// Export Firebase services
export { app, db, auth };
export const registerUser = firebaseConfig.registerUser;
export const sendEmailURL = firebaseConfig.sendEmailURL;
export const setAdminRoleURL = firebaseConfig.setAdminRoleURL;
export const changeEmailURL = firebaseConfig.changeEmailURL;
