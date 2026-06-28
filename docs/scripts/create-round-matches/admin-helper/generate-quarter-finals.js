import { db } from "../../config/firebase-config.js";
import { QUARTER_FINAL_BRACKET_RULES } from "../../utils/round-of-32-projection.js";

function getWinnerName(match) {
    if (!match?.winner) {
        return null;
    }

    return typeof match.winner === 'string' ? match.winner : match.winner.name || null;
}

export async function generateQuarterFinalsMatches() {
    try {
        // Fetch the Round of 16 matches
        const roundOf16Snapshot = await db.collection('roundOf16Teams').doc('matches').get();
        const roundOf16Data = roundOf16Snapshot.data();

        if (!roundOf16Data || !roundOf16Data.matches) {
            console.warn('No Round of 16 matches found in Firestore.');
            alert('No Round of 16 matches available. Please generate them first.');
            return;
        }

        const roundOf16Matches = roundOf16Data.matches;

        const matchLookup = new Map(roundOf16Matches.map(match => [match.match, match]));

        // Prepare the Quarter Finals structure
        const quarterFinalsTeams = QUARTER_FINAL_BRACKET_RULES.map(rule => {
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

        // Save the Quarter Finals structure to Firestore
        await db.collection('quarterFinalsTeams').doc('matches').set({ matches: quarterFinalsTeams });
        alert('Quarter Finals structure generated successfully!');
    } catch (error) {
        console.error('Error generating Quarter Finals structure:', error);
        alert('Failed to generate Quarter Finals structure. Please try again.');
    }
};
