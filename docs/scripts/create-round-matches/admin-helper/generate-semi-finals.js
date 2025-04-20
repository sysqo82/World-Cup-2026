import { db } from "../../config/firebase-config.js";

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

        // Define the match rules for the Semi Finals
        const matchRules = [
            { match: 'Winner of quarterFinals-1 vs. Winner of quarterFinals-2', match1: 0, match2: 1 },
            { match: 'Winner of quarterFinals-3 vs. Winner of quarterFinals-4', match1: 2, match2: 3 }
        ];

        // Prepare the Semi Finals structure
        const semiFinalsTeams = matchRules.map(rule => {
            const match1Winner = quarterFinalsMatches[rule.match1]?.winner;
            const match2Winner = quarterFinalsMatches[rule.match2]?.winner;
        
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

        // Save the Semi Finals structure to Firestore
        await db.collection('semiFinalsTeams').doc('matches').set({ matches: semiFinalsTeams });
        alert('Semi Finals structure generated successfully!');
    } catch (error) {
        console.error('Error generating Semi Finals structure:', error);
        alert('Failed to generate Semi Finals structure. Please try again.');
    }
};