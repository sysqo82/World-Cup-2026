import { db } from "../../config/firebase-config.js";
import { getTeamByRank } from "../../admin.js";

export async function generateRoundOf32Matches() {
    try {
        // Fetch the current state of the groups
        const groupsSnapshot = await db.collection('groups').get();
        const groups = groupsSnapshot.docs.reduce((acc, doc) => {
            acc[doc.id] = doc.data();
            return acc;
        }, {});

        // Get all third-place teams with their stats
        const thirdPlaceTeams = [];
        Object.keys(groups).forEach(groupId => {
            const group = groups[groupId];
            const thirdPlace = getTeamByRank(group, 3);
            if (thirdPlace && thirdPlace.name) {
                thirdPlaceTeams.push({
                    groupId,
                    groupName: group.name,
                    ...thirdPlace
                });
            }
        });

        // Sort third-place teams by points, goal difference, and goals scored
        thirdPlaceTeams.sort((a, b) => {
            const pointsDiff = (b.calculatedPoints || 0) - (a.calculatedPoints || 0);
            if (pointsDiff !== 0) return pointsDiff;
            
            const gdDiff = (b.goalDifference || 0) - (a.goalDifference || 0);
            if (gdDiff !== 0) return gdDiff;
            
            return (b.goalsScored || 0) - (a.goalsScored || 0);
        });

        // Take the top 8 third-place teams
        const qualifiedThirdPlace = thirdPlaceTeams.slice(0, 8);

        console.log('Qualified third-place teams:', qualifiedThirdPlace.map(t => `${t.name} (${t.groupName})`));

        // Define the match rules for the Round of 32 (16 matches, 32 teams total)
        // Typical FIFA bracket: 1st place teams (12) vs 2nd place teams (12) + best 8 third-place teams
        const matchRules = [
            // Group winners vs runners-up from different groups
            { match: '1A vs. 2B', group1: 'group01', rank1: 1, group2: 'group02', rank2: 2 },
            { match: '1C vs. 2D', group1: 'group03', rank1: 1, group2: 'group04', rank2: 2 },
            { match: '1E vs. 2F', group1: 'group05', rank1: 1, group2: 'group06', rank2: 2 },
            { match: '1G vs. 2H', group1: 'group07', rank1: 1, group2: 'group08', rank2: 2 },
            { match: '1B vs. 2A', group1: 'group02', rank1: 1, group2: 'group01', rank2: 2 },
            { match: '1D vs. 2C', group1: 'group04', rank1: 1, group2: 'group03', rank2: 2 },
            { match: '1F vs. 2E', group1: 'group06', rank1: 1, group2: 'group05', rank2: 2 },
            { match: '1H vs. 2G', group1: 'group08', rank1: 1, group2: 'group07', rank2: 2 },
            // Group winners from remaining groups vs best third-place teams
            { match: '1I vs. 3rd-1', group1: 'group09', rank1: 1, thirdPlaceIndex: 0 },
            { match: '1J vs. 3rd-2', group1: 'group10', rank1: 1, thirdPlaceIndex: 1 },
            { match: '1K vs. 3rd-3', group1: 'group11', rank1: 1, thirdPlaceIndex: 2 },
            { match: '1L vs. 3rd-4', group1: 'group12', rank1: 1, thirdPlaceIndex: 3 },
            // Runners-up from remaining groups vs remaining best third-place teams
            { match: '2I vs. 3rd-5', group1: 'group09', rank1: 2, thirdPlaceIndex: 4 },
            { match: '2J vs. 3rd-6', group1: 'group10', rank1: 2, thirdPlaceIndex: 5 },
            { match: '2K vs. 3rd-7', group1: 'group11', rank1: 2, thirdPlaceIndex: 6 },
            { match: '2L vs. 3rd-8', group1: 'group12', rank1: 2, thirdPlaceIndex: 7 }
        ];

        // Prepare the Round of 32 structure
        const roundOf32Teams = matchRules.map(rule => {
            let team1, team2;

            // Get team1
            const group1 = groups[rule.group1];
            if (!group1) {
                console.warn(`Missing group: ${rule.group1}`);
                return null;
            }
            team1 = getTeamByRank(group1, rule.rank1);

            // Get team2
            if (rule.thirdPlaceIndex !== undefined) {
                // Team2 is a third-place team
                const thirdPlaceTeam = qualifiedThirdPlace[rule.thirdPlaceIndex];
                if (!thirdPlaceTeam) {
                    console.warn(`Missing third-place team at index ${rule.thirdPlaceIndex}`);
                    return null;
                }
                team2 = { name: thirdPlaceTeam.name };
            } else {
                // Team2 is from another group
                const group2 = groups[rule.group2];
                if (!group2) {
                    console.warn(`Missing group: ${rule.group2}`);
                    return null;
                }
                team2 = getTeamByRank(group2, rule.rank2);
            }

            return {
                match: rule.match,
                team1: team1.name || 'Unknown',
                team2: team2.name || 'Unknown',
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
        }).filter(match => match !== null); // Remove any null matches

        // Save the Round of 32 structure to Firestore
        await db.collection('roundOf32Teams').doc('matches').set({ matches: roundOf32Teams });
        alert('Round of 32 structure generated successfully!');
    } catch (error) {
        console.error('Error generating Round of 32 structure:', error);
        alert('Failed to generate Round of 32 structure. Please try again.');
    }
}
