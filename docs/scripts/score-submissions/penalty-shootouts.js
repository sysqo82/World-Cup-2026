import { saveMatchResult } from './match-utils.js';

export async function handlePenaltyShootoutsSubmission(dataBase, event, table) {
    const button = event.target;
    const match = button.dataset.match;
    const team1 = button.dataset.team1;
    const team2 = button.dataset.team2;

    // Get the input fields for the penalty shootout match
    const scoreInputs = table.querySelectorAll(`input[data-match="${match}"][data-type="penalty"]`);
    const submitButtons = table.querySelectorAll(`button[data-match="${match}"]`);

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
    } else {
        // This case should never happen in penalty shootouts
        alert('Penalty shootouts must have a winner. Please check the scores.');
        return;
    }

    try {
        // Update Firestore with the penalty shootout scores
        await saveMatchResult(dataBase, match, team1Score, team2Score, winner, loser, 'penalty');

        // Highlight the winner
        const teamCells = table.querySelectorAll(`td[data-match="${match}"]`);
        teamCells.forEach(cell => {
            if (cell.textContent.trim() === winner) {
                cell.classList.add('winner');
            } else {
                cell.classList.remove('winner');
            }
            if (cell.textContent.trim() === loser) {
                cell.classList.add('loser');
            } else {
                cell.classList.remove('loser');
            }
        });

        // Lock the score inputs and disable all submit buttons
        scoreInputs.forEach(input => input.disabled = true);
        submitButtons.forEach(button => button.disabled = true);
    } catch (error) {
        console.error('Error updating penalty shootout scores:', error);
    }
}