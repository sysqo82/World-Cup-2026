import { saveMatchResult } from '../utils/match-utils.js';
import { sendMatchEmails } from '../utils/email-notifications.js';
import { db } from '../config/firebase-config.js';
import { getPrizePot } from '../utils/prize-pot-counter.js';

export async function handleRegularTimeSubmission(dataBase, event, table, round) {
    const button = event.target;
    const match = button.dataset.match;
    const team1 = button.dataset.team1;
    const team2 = button.dataset.team2;
    const prizePotSum = await getPrizePot();

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
    let winnerScore = null;
    let loserScore = null;
    if (team1Score > team2Score) {
        winner = team1;
        loser = team2;
        winnerScore = team1Score;
        loserScore = team2Score;
    } else if (team2Score > team1Score) {
        winner = team2;
        loser = team1;
        winnerScore = team2Score;
        loserScore = team1Score;
    }

    try {
        // Update Firestore with the regular time scores and displayExtraTime flag
        const displayExtraTime = team1Score === team2Score;

        await saveMatchResult(
            dataBase,
            match, 
            team1Score, 
            team2Score, 
            winner, 
            loser, 
            'regular', 
            displayExtraTime
        );

        // Highlight the winner if it exists
        if (winner) {
            // Extract the regular time scores from the match data
            const matchData = await db.collection(`${dataBase}`).doc(match).get();
            const matchScores = matchData.data();
            const regularTimeTeam1Score = matchScores ? matchScores.regularTimeScores.team1 : null;
            const regularTimeTeam2Score = matchScores ? matchScores.regularTimeScores.team2 : null;
            await sendMatchEmails(
                winner,
                loser,
                match, 
                round, 
                winnerScore, 
                loserScore, 
                regularTimeTeam1Score, 
                regularTimeTeam2Score,
                null,
                null,
                prizePotSum
            );

            const teamCells = table.querySelectorAll(`td[data-match="${match}"]`);
            teamCells.forEach(cell => {
                if (cell.textContent.trim() === winner) {
                    cell.classList.add('winner');
                    button.disabled = true;
                    scoreInputs[0].disabled = true;
                    scoreInputs[1].disabled = true;
                } else {
                    cell.classList.remove('winner');
                }
                if (cell.textContent.trim() === loser) {
                    cell.classList.add('loser');
                } else {
                    cell.classList.remove('loser');
                }
            });
        }
    } catch (error) {
        console.error('Error updating regular time scores:', error);
    }
}