// Import Firebase services
import { auth } from './config/firebase-config.js';
import { generateRoundMatches } from './create-round-matches/create-round-matches.js';

// Navigation function
function navigateToPage() {
    const selectedPage = document.getElementById('navigation-select').value;
    if (selectedPage === 'round-of-16') {
        window.location.href = 'round-of-16.html';
    } else if (selectedPage === 'group-stage') {
        window.location.href = 'index.html';
    } else if (selectedPage === 'quarter-final') {
        window.location.href = 'quarter-final.html';
    } else if (selectedPage === 'semi-final') {
        window.location.href = 'semi-final.html';
    } else if (selectedPage === 'final') {
        window.location.href = 'final.html';
    } else if (selectedPage === 'third-place') {
        window.location.href = 'third-place.html';
    }
}

// Attach navigateToPage to the global scope
window.navigateToPage = navigateToPage;

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
document.addEventListener('DOMContentLoaded', generateRoundMatches('.quarter-finals-container', 'quarterFinalsTeams', 'Quarter Finals'));