import { generateRoundMatches } from '../create-round-matches/create-round-matches.js';
import { getAssignedTeam, logoutUser } from '../utils/user-utils.js';
import { isAllowed, isRegistered } from "../navigation/navigation.js";

// Add event listener for navigation dropdown
document.getElementById('navigation-select').addEventListener('change', navigateToPage);

// Generate matches on page load
document.addEventListener('DOMContentLoaded', async () => {
    await isRegistered();
    await isAllowed();
    
    document.getElementById('logout').addEventListener('click', logoutUser);

    generateRoundMatches('.quarter-finals-container', 'quarterFinalsTeams', 'Quarter Finals');
    getAssignedTeam();
});
