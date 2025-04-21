import { generateRoundMatches } from '../create-round-matches/create-round-matches.js';
import { getAssignedTeam } from '../utils/user-utils.js';

// Add event listener for navigation dropdown
document.getElementById('navigation-select').addEventListener('change', navigateToPage);

// Generate matches on page load
document.addEventListener('DOMContentLoaded', () => {
    generateRoundMatches('.quarter-finals-container', 'quarterFinalsTeams', 'Quarter Finals');
    getAssignedTeam();
});