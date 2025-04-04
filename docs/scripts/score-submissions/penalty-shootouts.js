import { saveMatchResult } from './match-utils.js';

export async function handlePenaltyShootoutsSubmission(event, table) {
    const button = event.target;
    const match = button.dataset.match;
    const team1 = button.dataset.team1;
    const team2 = button.dataset.team2;

    // Get the input fields for the penalty shootouts match
    const scoreInputs = table.querySelectorAll(`input[data-match="${match}"][data-type="penalty"]`);
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
        // Penalty shootouts cannot end in a draw
        alert('Penalty shootouts must have a winner. Please enter valid scores.');
        return;
    }

    // Highlight the winner
    const teamCells = table.querySelectorAll(`td[data-match="${match}"]`);
    teamCells.forEach(cell => {
        if (cell.textContent.trim() === winner) {
            cell.classList.add('winner');
        } else {
            cell.classList.remove('winner');
        }
    });

    // Save the result to Firestore
    try {
        await saveMatchResult(match, team1Score, team2Score, winner, loser, 'penalty');
        alert(`Penalty shootouts result saved: ${winner} wins!`);
    } catch (error) {
        console.error('Error saving penalty shootouts result:', error);
        alert('Failed to save the result. Please try again.');
    }
}