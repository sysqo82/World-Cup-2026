import { generateRoundMatches } from '../create-round-matches/create-round-matches.js';
import { getAssignedTeam } from '../utils/user-utils.js';
import { isLoggedIn } from "../navigation/navigation.js";

// Check if the user is logged in
await isLoggedIn();
// Add event listener for navigation dropdown
document.getElementById('navigation-select').addEventListener('change', navigateToPage);

// Generate matches on page load
document.addEventListener('DOMContentLoaded', () => {
    generateRoundMatches('.round-of-16-container', 'roundOf16Teams', 'Round of 16');
    getAssignedTeam();
});
