import { db } from "../../config/firebase-config.js";

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

        // Define the match rules for the Quarter Finals
        const matchRules = [
            { match: 'Winner of roundOf16-1 vs. Winner of roundOf16-2', match1: 0, match2: 1 },
            { match: 'Winner of roundOf16-3 vs. Winner of roundOf16-4', match1: 2, match2: 3 },
            { match: 'Winner of roundOf16-5 vs. Winner of roundOf16-6', match1: 4, match2: 5 },
            { match: 'Winner of roundOf16-7 vs. Winner of roundOf16-8', match1: 6, match2: 7 }
        ];

        // Prepare the Quarter Finals structure
        const quarterFinalsTeams = matchRules.map(rule => {
            const match1Winner = roundOf16Matches[rule.match1]?.winner;
            const match2Winner = roundOf16Matches[rule.match2]?.winner;
        
            // Ensure both winners exist
            if (!match1Winner || !match2Winner) {
                console.warn(`Missing winners for matches: ${rule.match1} or ${rule.match2}`);
                return null; // Skip this match if data is missing
            }
            
            // Handle cases where the winner is a string
            const team1Name = typeof match1Winner === 'string' ? match1Winner : match1Winner.name || 'Unknown';
            const team2Name = typeof match2Winner === 'string' ? match2Winner : match2Winner.name || 'Unknown';

            return {
                match: rule.match,
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
        }).filter(match => match !== null); // Remove any null matches

        // Save the Quarter Finals structure to Firestore
        await db.collection('quarterFinalsTeams').doc('matches').set({ matches: quarterFinalsTeams });
        alert('Quarter Finals structure generated successfully!');
    } catch (error) {
        console.error('Error generating Quarter Finals structure:', error);
        alert('Failed to generate Quarter Finals structure. Please try again.');
    }
};