import { db } from '../firebase-config.js';

export async function handleRegularTimeSubmission(event) {
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