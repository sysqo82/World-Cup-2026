// Import Firebase services
import { db, auth } from './firebase-config.js';
import { handleRegularTimeSubmission } from './score-submissions/regular-time.js';
import { handleExtraTimeSubmission } from './score-submissions/extra-time.js';
import { handlePenaltyShootoutsSubmission } from './score-submissions/penalty-shootouts.js';

// Navigation function
function navigateToPage() {
    const selectedPage = document.getElementById('navigation-select').value;
    if (selectedPage === 'round-of-16') {
        window.location.href = 'round-of-16.html';
    } else if (selectedPage === 'group-stage') {
        window.location.href = 'index.html';
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

// Fetch Round of 16 matches from Firestore
async function fetchRoundOf16Matches() {
    try {
        const doc = await db.collection('roundOf16Teams').doc('matches').get();
        if (!doc.exists) {
            console.error('No Round of 16 matches found in Firestore.');
            return [];
        }
        return doc.data().matches || [];
    } catch (error) {
        console.error('Error fetching Round of 16 matches:', error);
        return [];
    }
}

// Generate Round of 16 Matches
async function generateRoundOf16() {
    const container = document.querySelector('.round-of-16-container');
    if (!container) {
        console.error('Error: Element with class "round-of-16-container" not found.');
        return;
    }
    container.innerHTML = ''; // Clear any existing content to prevent duplicates

    const matches = await fetchRoundOf16Matches();

    if (matches.length === 0) {
        container.innerHTML = '<p>No matches available for the Round of 16.</p>';
        return;
    }

    matches.forEach((match, index) => {
        const table = document.createElement('table');
        table.classList.add('match-table');
        table.innerHTML = `
            <tr>
                <td class="team-name" data-team="team1" data-match="${match.match}">${match.team1}</td>
                <td class="score-section">
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}" data-team="team1" value="${match.team1Score || ''}">
                    <span class="score-divider">-</span>
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}" data-team="team2" value="${match.team2Score || ''}">
                </td>
                <td class="team-name" data-team="team2" data-match="${match.match}">${match.team2}</td>
                <td>
                    <button class="submit-button" data-match="${match.match}" data-team1="${match.team1}" data-team2="${match.team2}">Submit</button>
                </td>
            </tr>
        `;
        container.appendChild(table);

        // Highlight the winner if it exists
        if (match.winner) {
            const teamCells = table.querySelectorAll(`td[data-match="${match.match}"]`);
            teamCells.forEach(cell => {
                if (cell.textContent.trim() === match.winner) {
                    cell.classList.add('winner');
                } else {
                    cell.classList.remove('winner');
                }
            });
        }

        // Add event listeners to submit buttons
        const submitButtons = document.querySelectorAll('.submit-button');
        submitButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                const matchType = match.type; // Assume match.type indicates "regular", "extra", or "penalty"
                if (matchType === 'regular') {
                    handleRegularTimeSubmission(event);
                } else if (matchType === 'extra') {
                    handleExtraTimeSubmission(event);
                } else if (matchType === 'penalty') {
                    handlePenaltyShootoutsSubmission(event);
                }
            });
        });
    });
}

// Generate matches on page load
document.addEventListener('DOMContentLoaded', generateRoundOf16);