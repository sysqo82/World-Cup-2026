import { db } from '../firebase-config.js';

export async function saveMatchResult(match, team1Score, team2Score, winner, loser, type) {
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
                        extraTimeTeam1Score: null, // Prepare for extra time
                        extraTimeTeam2Score: null,
                        penaltyShootoutsTeam1Score: null, // Prepare for penalty shootouts
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