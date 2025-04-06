import { db } from '../firebase-config.js';

export async function saveMatchResult(match, team1Score, team2Score, winner, loser, type, displayExtraTime = false, displayPenaltyShootouts = false) {
    try {
        const docRef = db.collection('roundOf16Teams').doc('matches');
        const doc = await docRef.get();

        if (!doc.exists) {
            console.error('No document found in the "roundOf16Teams/matches" path.');
            return;
        }

        const data = doc.data();
        const updatedMatches = data.matches.map(m => {
            if (m.match === match) {
                // Handle regular time submission
                if (type === 'regular') {
                    return {
                        ...m,
                        regularTimeTeam1Score: team1Score,
                        regularTimeTeam2Score: team2Score,
                        winner,
                        loser,
                        type,
                        displayExtraTime,
                        extraTimeTeam1Score: null,
                        extraTimeTeam2Score: null,
                        displayPenaltyShootouts: false,
                        penaltyShootoutsTeam1Score: null,
                        penaltyShootoutsTeam2Score: null,
                    };
                }

                // Handle extra time submission
                if (type === 'extra') {
                    return {
                        ...m,
                        extraTimeTeam1Score: team1Score,
                        extraTimeTeam2Score: team2Score,
                        winner,
                        loser,
                        type,
                        displayPenaltyShootouts,
                    };
                }

                // Handle penalty shootouts submission
                if (type === 'penalty') {
                    return {
                        ...m,
                        penaltyShootoutsTeam1Score: team1Score,
                        penaltyShootoutsTeam2Score: team2Score,
                        winner,
                        loser,
                        type,
                    };
                }
            }
            return m; // Return unchanged match if it doesn't match the current one
        });

        await docRef.update({ matches: updatedMatches });
    } catch (error) {
        console.error('Error saving match result:', error);
    }
}