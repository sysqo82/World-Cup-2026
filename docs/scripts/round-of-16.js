// Import Firebase services
import { db, auth } from './firebase-config.js';

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
            button.addEventListener('click', handleRoundOf16ScoreSubmission);
        });
    });
}

// Handle Round of 16 score submission
async function handleRoundOf16ScoreSubmission(event) {
    const button = event.target;
    const match = button.dataset.match;
    const team1 = button.dataset.team1;
    const team2 = button.dataset.team2;

    // Get the input fields for the match
    const scoreInputs = document.querySelectorAll(`input[data-match="${match}"]`);
    const team1Score = parseInt(scoreInputs[0].value, 10);
    const team2Score = parseInt(scoreInputs[1].value, 10);

    // Validate scores
    if (isNaN(team1Score) || isNaN(team2Score)) {
        alert('Please enter valid scores for both teams.');
        return;
    }

    // Determine the winner and loser
    let winner = null;
    let loser = null;
    if (team1Score > team2Score) {
        winner = team1;
        loser = team2;
    } else if (team2Score > team1Score) {
        winner = team2;
        loser = team1;
    }

    // Highlight the winner
    const teamCells = document.querySelectorAll(`td[data-match="${match}"]`);
    teamCells.forEach(cell => {
        if (cell.textContent.trim() === winner) {
            cell.classList.add('winner');
        } else {
            cell.classList.remove('winner');
        }
    });

    // Save the result to Firestore
    try {
        const roundOf16TeamsDoc = await db.collection('roundOf16Teams').doc('matches').get();
        const matches = roundOf16TeamsDoc.data().matches.map(m => {
            if (m.match === match) {
                return {
                    ...m,
                    winner,
                    loser,
                    team1Score,
                    team2Score
                };
            }
            return m;
        });
        await db.collection('roundOf16Teams').doc('matches').update({ matches });

        if (winner) {
            alert(`Result saved: ${winner} wins`);
        }
    } catch (error) {
        console.error('Error saving match result:', error);
        alert('Failed to save the result. Please try again.');
    }
}

// Generate matches on page load
document.addEventListener('DOMContentLoaded', generateRoundOf16);