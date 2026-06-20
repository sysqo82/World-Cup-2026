import { db } from "../../config/firebase-config.js";
import { buildRoundOf32Projection } from "../../utils/round-of-32-projection.js";

export async function generateRoundOf32Matches() {
    try {
        const groupsSnapshot = await db.collection('groups').get();
        const groups = groupsSnapshot.docs.reduce((acc, doc) => {
            acc[doc.id] = doc.data();
            return acc;
        }, {});

        const { matches, qualifiedThirdPlaceTeams } = buildRoundOf32Projection(groups);

        console.log(
            'Qualified third-place teams:',
            qualifiedThirdPlaceTeams.map(team => `${team.name} (${team.groupName})`)
        );

        const roundOf32Teams = matches.map(match => ({
            match: match.match,
            team1: match.team1,
            team2: match.team2,
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
        }));

        await db.collection('roundOf32Teams').doc('matches').set({ matches: roundOf32Teams });
        alert('Round of 32 structure generated successfully!');
    } catch (error) {
        console.error('Error generating Round of 32 structure:', error);
        alert('Failed to generate Round of 32 structure. Please try again.');
    }
}
