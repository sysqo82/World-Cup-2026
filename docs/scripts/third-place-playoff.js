import { auth } from './config/firebase-config.js';
import { generateRoundMatches } from './create-round-matches/create-round-matches.js';

// Check if the user is logged in
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`User is logged in: ${user.email}`);
    } else {
        console.log('No user is logged in.');
    }
});

// Add event listener for navigation dropdown
document.getElementById('navigation-select').addEventListener('change', navigateToPage);

// Generate matches on page load
document.addEventListener('DOMContentLoaded', generateRoundMatches('.third-place-playoff-container', 'thirdPlacePlayoffTeams', 'Third Place Playoff'));