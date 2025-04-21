import { db } from "../../config/firebase-config.js";
import { getTeamByRank } from "../../admin.js";

export async function genereateRoundOf16Matches() {
        try {
            // Fetch the current state of the groups
            const groupsSnapshot = await db.collection('groups').get();
            const groups = groupsSnapshot.docs.reduce((acc, doc) => {
                acc[doc.id] = doc.data();
                return acc;
            }, {});

            // Define the match rules for the Round of 16
            const matchRules = [
                { match: '1A vs. 2B', group1: 'group1', group2: 'group2' },
                { match: '1C vs. 2D', group1: 'group3', group2: 'group4' },
                { match: '1E vs. 2F', group1: 'group5', group2: 'group6' },
                { match: '1G vs. 2H', group1: 'group7', group2: 'group8' },
                { match: '1B vs. 2A', group1: 'group2', group2: 'group1' },
                { match: '1D vs. 2C', group1: 'group4', group2: 'group3' },
                { match: '1F vs. 2E', group1: 'group6', group2: 'group5' },
                { match: '1H vs. 2G', group1: 'group8', group2: 'group7' }
            ];

            // Prepare the Round of 16 structure
            const roundOf16Teams = matchRules.map(rule => {
                const group1 = groups[rule.group1];
                const group2 = groups[rule.group2];

                // Ensure both groups exist
                if (!group1 || !group2) {
                    console.warn(`Missing data for groups: ${rule.group1} or ${rule.group2}`);
                    return null; // Skip this match if data is missing
                }

                // Get the winner and runner-up from each group
                const team1 = getTeamByRank(group1, 1); // Winner of group1
                const team2 = getTeamByRank(group2, 2); // Runner-up of group2

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

            // Save the Round of 16 structure to Firestore
            await db.collection('roundOf16Teams').doc('matches').set({ matches: roundOf16Teams });
            alert('Round of 16 structure generated successfully!');
        } catch (error) {
            console.error('Error generating Round of 16 structure:', error);
            alert('Failed to generate Round of 16 structure. Please try again.');
        }
};