import { saveMatchResult } from './match-utils.js';
import { handleExtraTimeSubmission } from './extra-time.js';

export async function handleRegularTimeSubmission(event, table) {
    const button = event.target;
    const match = button.dataset.match;
    const team1 = button.dataset.team1;
    const team2 = button.dataset.team2;

    // Get the input fields for the match
    const scoreInputs = table.querySelectorAll(`input[data-match="${match}"]`);
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
        await saveMatchResult(match, team1Score, team2Score, winner, loser, 'regular');
    } else {
        // If it's a draw, add extra time
        alert('The match ended in a draw. Adding extra time...');
        await saveMatchResult(match, team1Score, team2Score, winner, loser, 'regular');
        addExtraTimeRow(table, match, team1, team2);
    }
}

function addExtraTimeRow(table, match, team1, team2) {
    const extraTimeRow = document.createElement('tr');
    extraTimeRow.classList.add('extra-time-row');
    extraTimeRow.innerHTML = `
        <td colspan="4">
            <p>Extra Time</p>
            <input type="number" class="score-input" placeholder="Score" data-match="${match}" data-team="team1">
            <span class="score-divider">-</span>
            <input type="number" class="score-input" placeholder="Score" data-match="${match}" data-team="team2">
            <button class="submit-button" data-match="${match}" data-team1="${team1}" data-team2="${team2}" data-type="extra">Submit Extra Time</button>
        </td>
    `;
    table.appendChild(extraTimeRow);

    // Add event listener for the extra time submit button
    const submitButton = extraTimeRow.querySelector('.submit-button');
    submitButton.addEventListener('click', async (event) => {
        await handleExtraTimeSubmission(event, table);
    });
}