import { db } from "../../config/firebase-config.js";
import { ROUND_OF_16_BRACKET_RULES } from "../../utils/round-of-32-projection.js";

function getWinnerName(match) {
    if (!match?.winner) {
        return null;
    }

    return typeof match.winner === 'string' ? match.winner : match.winner.name || null;
}

export async function generateRoundOf16Matches() {
        try {
            // Fetch the Round of 32 matches
            const roundOf32Snapshot = await db.collection('roundOf32Teams').doc('matches').get();
            
            if (!roundOf32Snapshot.exists) {
                alert('Round of 32 has not been generated yet. Please generate Round of 32 first.');
                return;
            }

            const roundOf32Data = roundOf32Snapshot.data();
            const roundOf32Matches = roundOf32Data.matches || [];

            // Check if all Round of 32 matches have winners
            const allMatchesCompleted = roundOf32Matches.every(match => match.winner);
            
            if (!allMatchesCompleted) {
                alert('Not all Round of 32 matches have been completed. Please complete all matches before generating Round of 16.');
                return;
            }

            if (roundOf32Matches.length !== 16) {
                alert(`Expected 16 Round of 32 matches, but found ${roundOf32Matches.length}. Please check the bracket.`);
                return;
            }

            const matchLookup = new Map(roundOf32Matches.map(match => [match.match, match]));

            const roundOf16Matches = ROUND_OF_16_BRACKET_RULES.map(rule => {
                const sourceMatch1 = matchLookup.get(rule.sourceMatch1);
                const sourceMatch2 = matchLookup.get(rule.sourceMatch2);
                const team1Name = getWinnerName(sourceMatch1);
                const team2Name = getWinnerName(sourceMatch2);

                if (!team1Name || !team2Name) {
                    throw new Error(`Missing winners for ${rule.sourceMatch1} or ${rule.sourceMatch2}`);
                }

                return {
                    match: rule.match,
                    sourceMatch1: rule.sourceMatch1,
                    sourceMatch2: rule.sourceMatch2,
                    team1: team1Name,
                    team2: team2Name,
                    type: 'regular',
                    regularTimeTeam1Score: null,
                    regularTimeTeam2Score: null,
                    extraTimeTeam1Score: null,
                    extraTimeTeam2Score: null,
                    penaltyShootoutsTeam1Score: null,
                    penaltyShootoutsTeam2Score: null,
                    winner: null,
                    loser: null,
                    displayExtraTime: false,
                    displayPenaltyShootouts: false,
                };
            });

            // Save the Round of 16 structure to Firestore
            await db.collection('roundOf16Teams').doc('matches').set({ matches: roundOf16Matches });
            alert('Round of 16 structure generated successfully from Round of 32 winners!');
        } catch (error) {
            console.error('Error generating Round of 16 structure:', error);
            alert('Failed to generate Round of 16 structure. Please try again.');
        }
};
