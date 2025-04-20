import { db } from "../../config/firebase-config.js";

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

        // Define the match rules for the Final
        const matchRules = [
            { match: 'Loser of semiFinals-1 vs. Loser of semiFinals-2', match1: 0, match2: 1 }
        ];

        // Prepare the Semi Finals structure
        const thirdPlacePlayoffTeams = matchRules.map(rule => {
            const match1Loser = semiFinalsMatches[rule.match1]?.loser;
            const match2Loser = semiFinalsMatches[rule.match2]?.loser;
        
            // Ensure both losers exist
            if (!match1Loser || !match2Loser) {
                console.warn(`Missing losers for matches: ${rule.match1} or ${rule.match2}`);
                return null; // Skip this match if data is missing
            }
            
            // Handle cases where the loser is a string
            const team1Name = typeof match1Loser === 'string' ? match1Loser : match1Loser.name || 'Unknown';
            const team2Name = typeof match2Loser === 'string' ? match2Loser : match2Loser.name || 'Unknown';

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

        // Save the Third Place Playoffs structure to Firestore
        await db.collection('thirdPlacePlayoffTeams').doc('matches').set({ matches: thirdPlacePlayoffTeams });
        alert('Third Place Playoffs structure generated successfully!');
    } catch (error) {
        console.error('Error generating Third Place Playoffs structure:', error);
        alert('Failed to generate Third Place Playoffs structure. Please try again.');
    }
};