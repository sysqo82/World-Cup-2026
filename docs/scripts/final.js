import { generateRoundMatches } from './create-round-matches/create-round-matches.js';

// Add event listener for navigation dropdown
document.getElementById('navigation-select').addEventListener('change', navigateToPage);

// Generate matches on page load
document.addEventListener('DOMContentLoaded', generateRoundMatches('.final-container', 'finalTeams', 'Final'));