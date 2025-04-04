import { saveMatchResult } from './match-utils.js';
import { handlePenaltyShootoutsSubmission } from './penalty-shootouts.js';

export async function handleExtraTimeSubmission(event, table) {
    const button = event.target;
    const match = button.dataset.match;
    const team1 = button.dataset.team1;
    const team2 = button.dataset.team2;

    // Get the input fields for the extra time match
    const scoreInputs = table.querySelectorAll(`input[data-match="${match}"][data-type="extra"]`);
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
    
    if (winner) {
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
        await saveMatchResult(match, team1Score, team2Score, winner, loser, 'extra');
    } else {
        // If it's a draw, update the match type to "extra" and add extra time
        alert('The match ended in a draw. Adding penalty shootouts...');
        await saveMatchResult(match, team1Score, team2Score, winner, loser, 'penalty');
        addPenaltyShootoutsRow(table, match, team1, team2);
    }
}

function addPenaltyShootoutsRow(table, match, team1, team2) {
    const penaltyRow = document.createElement('tr');
    penaltyRow.classList.add('penalty-row');
    penaltyRow.innerHTML = `
        <td colspan="4">
            <p>Penalty Shootouts</p>
            <input type="number" class="score-input" placeholder="Score" data-match="${match}" data-team="team1" data-type="penalty">
            <span class="score-divider">-</span>
            <input type="number" class="score-input" placeholder="Score" data-match="${match}" data-team="team2" data-type="penalty">
            <button class="submit-button" data-match="${match}" data-team1="${team1}" data-team2="${team2}" data-type="penalty">Submit Penalty Shootouts</button>
        </td>
    `;
    table.appendChild(penaltyRow);

    // Add event listener for the penalty shootouts submit button
    const submitButton = penaltyRow.querySelector('.submit-button');
    submitButton.addEventListener('click', async (event) => {
        await handlePenaltyShootoutsSubmission(event, table);
    });
}