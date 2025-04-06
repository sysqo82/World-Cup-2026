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

    matches.forEach((match) => {
        const table = document.createElement('table');
        table.classList.add('match-table');
        table.innerHTML = `
            <tr>
                <td class="team-name" data-team="team1" data-type="regular" data-match="${match.match}">${match.team1}</td>
                <td class="score-section">
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}" data-team="team1" data-type="regular" value="${match.regularTimeTeam1Score || ''}">
                    <span class="score-divider">-</span>
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}" data-team="team2" data-type="regular" value="${match.regularTimeTeam2Score || ''}">
                </td>
                <td class="team-name" data-team="team2" data-type="regular" data-match="${match.match}">${match.team2}</td>
                <td>
                    <button class="submit-button" data-match="${match.match}" data-team1="${match.team1}" data-team2="${match.team2}" data-type="regular">Submit</button>
                </td>
            </tr>
            <tr class="extra-time-row ${match.displayExtraTime ? '' : 'hidden'}" data-match="${match.match}">
                <td class="extra-time-label">Extra Time</td>
                <td class="score-section">
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}"data-team="team1" data-type="extra" value="${match.extraTimeTeam1Score || ''}">
                    <span class="score-divider">-</span>
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}"data-team="team2" data-type="extra" value="${match.extraTimeTeam2Score || ''}">
                </td>
                <td>
                    <button class="submit-button" data-match="${match.match}" data-team1="${match.team1}" data-team2="${match.team2}" data-type="extra">Submit</button>
                </td>
                <td></td>
            </tr>
            <tr class="penalty-row ${match.displayPenaltyShootouts ? '' : 'hidden'}" data-match="${match.match}         ">
                <td>Penalties</td>
                <td class="score-section">
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}"data-team="team1" data-type="penalty" value="${match.penaltyShootoutsTeam1Score || ''}">
                    <span class="score-divider">-</span>
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}"data-team="team2" data-type="penalty" value="${match.penaltyShootoutsTeam2Score || ''}">
                </td>
                <td>
                    <button class="submit-button" data-match="${match.match}" data-team1="${match.team1}" data-team2="${match.team2}" data-type="penalty">Submit</button>
                </td>
                <td></td>
            </tr>
        `;
        container.appendChild(table);

        // Disable all inputs and buttons if the match has ended
        if (match.winner) {
            const inputs = table.querySelectorAll(`input[data-match="${match.match}"]`);
            inputs.forEach(input => input.disabled = true);
        
            const buttons = table.querySelectorAll(`button[data-match="${match.match}"]`);
            buttons.forEach(button => button.disabled = true);
        
            // Highlight the winner's name
            const teamCells = table.querySelectorAll(`td[data-match="${match.match}"]`);
            teamCells.forEach(cell => {
                if (cell.textContent.trim() === match.winner) {
                    cell.classList.add('winner');
                } else {
                    cell.classList.remove('winner');
                }
                if (cell.textContent.trim() === match.loser) {
                    cell.classList.add('loser');
                } else {
                    cell.classList.remove('loser');
                }
            });
        }

        // Add event listener to the regular time submit button
        const submitButton = table.querySelector('.submit-button[data-type="regular"]');
        submitButton.addEventListener('click', async (event) => {
            await handleRegularTimeSubmission(event, table);

            // Fetch updated match data from the database
            const updatedMatch = await fetchMatchFromDB(match.match);

            // Update extra time row visibility based on the database flag
            const extraTimeRow = table.querySelector(`.extra-time-row[data-match="${updatedMatch.match}"]`);
            if (updatedMatch.displayExtraTime) {
                extraTimeRow.classList.remove('hidden');
            } else {
                extraTimeRow.classList.add('hidden');
            }

            // Disable inputs and buttons if a winner is declared
            if (updatedMatch.winner) {
                const inputs = table.querySelectorAll(`input[data-match="${updatedMatch.match}"]`);
                inputs.forEach(input => input.disabled = true);

                const buttons = table.querySelectorAll(`button[data-match="${updatedMatch.match}"]`);
                buttons.forEach(button => button.disabled = true);
            }
        });

        const extraTimeButton = table.querySelector('.submit-button[data-type="extra"]');
        extraTimeButton.addEventListener('click', async (event) => {
            await handleExtraTimeSubmission(event, table);

            // Fetch updated match data from the database
            const updatedMatch = await fetchMatchFromDB(match.match);

            // Update penalty row visibility based on the database flag
            const penaltyRow = table.querySelector(`.penalty-row[data-match="${updatedMatch.match}"]`);
            if (updatedMatch.displayPenaltyShootouts) {
                penaltyRow.classList.remove('hidden');
            } else {
                penaltyRow.classList.add('hidden');
            }

            // Disable inputs and buttons if a winner is declared
            if (updatedMatch.winner) {
                const inputs = table.querySelectorAll(`input[data-match="${updatedMatch.match}"]`);
                inputs.forEach(input => input.disabled = true);

                const buttons = table.querySelectorAll(`button[data-match="${updatedMatch.match}"]`);
                buttons.forEach(button => button.disabled = true);
            }
        });

        const penaltyButton = table.querySelector('.submit-button[data-type="penalty"]');
        penaltyButton.addEventListener('click', async (event) => {
            await handlePenaltyShootoutsSubmission(event, table);

            // Disable inputs and buttons after penalty shootouts
            const inputs = table.querySelectorAll(`input[data-match="${match.match}"]`);
            inputs.forEach(input => input.disabled = true);

            const buttons = table.querySelectorAll(`button[data-match="${match.match}"]`);
            buttons.forEach(button => button.disabled = true);
        });
    });
}

// Helper function to fetch a single match from the database
async function fetchMatchFromDB(matchId) {
    try {
        const doc = await db.collection('roundOf16Teams').doc('matches').get();
        if (!doc.exists) {
            console.error(`Match with ID ${matchId} not found in Firestore.`);
            return null;
        }
        const matches = doc.data().matches || [];
        return matches.find(match => match.match === matchId);
    } catch (error) {
        console.error('Error fetching match from Firestore:', error);
        return null;
    }
}

// Generate matches on page load
document.addEventListener('DOMContentLoaded', generateRoundOf16);