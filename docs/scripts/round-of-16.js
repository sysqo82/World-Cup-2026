import { generateRoundMatches } from './create-round-matches/create-round-matches.js';
import { getCookie } from './utils/cookie-utils.js';

// Add event listener for navigation dropdown
document.getElementById('navigation-select').addEventListener('change', navigateToPage);

// Generate matches on page load
document.addEventListener('DOMContentLoaded', generateRoundMatches('.round-of-16-container', 'roundOf16Teams', 'Round of 16'));

document.addEventListener('DOMContentLoaded', () => {
    const assignedTeamDisplay = document.getElementById('assigned-team-display');
    const teamDiscoveryForm = document.getElementById('team-discovery');
    const assignedTeam = getCookie('assignedTeam');
    if (assignedTeam) {
        assignedTeamDisplay.innerHTML = `Your winning team is: <strong>${assignedTeam}</strong>`;
        assignedTeamDisplay.classList.remove('hidden');
    } else {
        teamDiscoveryForm.classList.add('hidden');
    }
});