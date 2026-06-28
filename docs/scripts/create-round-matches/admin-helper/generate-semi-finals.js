import { db } from "../../config/firebase-config.js";
import { SEMI_FINAL_BRACKET_RULES } from "../../utils/round-of-32-projection.js";

function getWinnerName(match) {
    if (!match?.winner) {
        return null;
    }

    return typeof match.winner === 'string' ? match.winner : match.winner.name || null;
}

export async function generateSemiFinalsMatches() {
    try {
        // Fetch the Quarter Finals matches
        const quarterFinalsSnapshot = await db.collection('quarterFinalsTeams').doc('matches').get();
        const quarterFinalsData = quarterFinalsSnapshot.data();

        if (!quarterFinalsData || !quarterFinalsData.matches) {
            console.warn('No Quarter Finals matches found in Firestore.');
            alert('No Quarter Finals matches available. Please generate them first.');
            return;
        }

        const quarterFinalsMatches = quarterFinalsData.matches;

        const matchLookup = new Map(quarterFinalsMatches.map(match => [match.match, match]));

        // Prepare the Semi Finals structure
        const semiFinalsTeams = SEMI_FINAL_BRACKET_RULES.map(rule => {
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

        // Save the Semi Finals structure to Firestore
        await db.collection('semiFinalsTeams').doc('matches').set({ matches: semiFinalsTeams });
        alert('Semi Finals structure generated successfully!');
    } catch (error) {
        console.error('Error generating Semi Finals structure:', error);
        alert('Failed to generate Semi Finals structure. Please try again.');
    }
};
