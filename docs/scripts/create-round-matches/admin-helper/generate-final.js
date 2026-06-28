import { db } from "../../config/firebase-config.js";
import { FINAL_BRACKET_RULES } from "../../utils/round-of-32-projection.js";

function getWinnerName(match) {
    if (!match?.winner) {
        return null;
    }

    return typeof match.winner === 'string' ? match.winner : match.winner.name || null;
}

export async function generateFinalMatch() {
    try {
        // Fetch the Semi Finals matches
        const semiFinalsSnapshot = await db.collection('semiFinalsTeams').doc('matches').get();
        const semiFinalsData = semiFinalsSnapshot.data();

        if (!semiFinalsData || !semiFinalsData.matches) {
            console.warn('No Semi Finals matches found in Firestore.');
            alert('No Semi Finals matches available. Please generate them first.');
            return;
        }

        const semiFinalsMatches = semiFinalsData.matches;

        const matchLookup = new Map(semiFinalsMatches.map(match => [match.match, match]));

        const finalTeams = FINAL_BRACKET_RULES.map(rule => {
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

        // Save the Final structure to Firestore
        await db.collection('finalTeams').doc('matches').set({ matches: finalTeams });
        alert('Final structure generated successfully!');
    } catch (error) {
        console.error('Error generating Final structure:', error);
        alert('Failed to generate Final structure. Please try again.');
    }
};
