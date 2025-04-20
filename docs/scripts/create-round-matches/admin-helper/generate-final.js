import { db } from "../../config/firebase-config.js";

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

        // Define the match rules for the Final
        const matchRules = [
            { match: 'Winner of semiFinals-1 vs. Winner of semiFinals-2', match1: 0, match2: 1 }
        ];

        // Prepare the Semi Finals structure
        const semiFinalsTeams = matchRules.map(rule => {
            const match1Winner = semiFinalsMatches[rule.match1]?.winner;
            const match2Winner = semiFinalsMatches[rule.match2]?.winner;
        
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

        // Save the Final structure to Firestore
        await db.collection('finalTeams').doc('matches').set({ matches: semiFinalsTeams });
        alert('Final structure generated successfully!');
    } catch (error) {
        console.error('Error generating Final structure:', error);
        alert('Failed to generate Final structure. Please try again.');
    }
};