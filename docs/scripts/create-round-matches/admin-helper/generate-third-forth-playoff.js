import { db } from "../../config/firebase-config.js";
import { THIRD_PLACE_BRACKET_RULES } from "../../utils/round-of-32-projection.js";

function getLoserName(match) {
    if (!match?.loser) {
        return null;
    }

    return typeof match.loser === 'string' ? match.loser : match.loser.name || null;
}

export async function generateThirdPlacePlayoffMatch() {
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

        const thirdPlacePlayoffTeams = THIRD_PLACE_BRACKET_RULES.map(rule => {
            const sourceMatch1 = matchLookup.get(rule.sourceMatch1);
            const sourceMatch2 = matchLookup.get(rule.sourceMatch2);
            const team1Name = getLoserName(sourceMatch1);
            const team2Name = getLoserName(sourceMatch2);

            if (!team1Name || !team2Name) {
                throw new Error(`Missing losers for ${rule.sourceMatch1} or ${rule.sourceMatch2}`);
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

        // Save the Third Place Playoffs structure to Firestore
        await db.collection('thirdPlacePlayoffTeams').doc('matches').set({ matches: thirdPlacePlayoffTeams });
        alert('Third Place Playoffs structure generated successfully!');
    } catch (error) {
        console.error('Error generating Third Place Playoffs structure:', error);
        alert('Failed to generate Third Place Playoffs structure. Please try again.');
    }
};
