import { db } from "../../config/firebase-config.js";

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

            // Extract winners from Round of 32 (should be 16 teams)
            const winners = roundOf32Matches.map(match => match.winner);

            if (winners.length !== 16) {
                alert(`Expected 16 winners from Round of 32, but found ${winners.length}. Please check the Round of 32 matches.`);
                return;
            }

            // Define the match pairings for Round of 16
            // Pairing winners in sequence: 1st winner vs 2nd winner, 3rd vs 4th, etc.
            const roundOf16Matches = [];
            for (let i = 0; i < winners.length; i += 2) {
                roundOf16Matches.push({
                    match: `Match ${(i / 2) + 1}`,
                    team1: winners[i] || 'Unknown',
                    team2: winners[i + 1] || 'Unknown',
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
                });
            }

            // Save the Round of 16 structure to Firestore
            await db.collection('roundOf16Teams').doc('matches').set({ matches: roundOf16Matches });
            alert('Round of 16 structure generated successfully from Round of 32 winners!');
        } catch (error) {
            console.error('Error generating Round of 16 structure:', error);
            alert('Failed to generate Round of 16 structure. Please try again.');
        }
};