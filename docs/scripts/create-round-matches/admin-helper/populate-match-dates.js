import { db } from '../../config/firebase-config.js';
import { matchSchedule } from '../../utils/match-schedule-constants.js';

export async function populateMatchDates() {
    try {
        console.log('Starting to populate match dates...');
        
        const groupsSnapshot = await db.collection('groups').get();
        let updatedCount = 0;
        let totalMatches = 0;
        
        for (const groupDoc of groupsSnapshot.docs) {
            const groupId = groupDoc.id;
            const groupData = groupDoc.data();
            
            console.log(`Processing ${groupId}...`);
            
            if (!matchSchedule[groupId]) {
                console.log(`  No schedule found for ${groupId}, skipping.`);
                continue;
            }
            
            const schedule = matchSchedule[groupId];
            const updateData = {};
            
            // Process each matchday
            for (const matchday of ['matchday1', 'matchday2', 'matchday3']) {
                const matchDate = schedule[matchday];
                
                if (groupData.matchdays && groupData.matchdays[matchday]) {
                    const matches = groupData.matchdays[matchday];
                    
                    // Update each match in this matchday with the date
                    for (const matchKey in matches) {
                        updateData[`matchdays.${matchday}.${matchKey}.date`] = matchDate;
                        totalMatches++;
                    }
                    
                    console.log(`  Found ${Object.keys(matches).length} matches in ${matchday}`);
                }
            }
            
            // Update the group document if there are any updates
            if (Object.keys(updateData).length > 0) {
                await db.collection('groups').doc(groupId).update(updateData);
                updatedCount++;
                console.log(`  ✓ Updated ${groupId} with ${Object.keys(updateData).length} date entries`);
            } else {
                console.log(`  No matches found to update for ${groupId}`);
            }
        }
        
        if (updatedCount > 0) {
            alert(`✓ Successfully populated dates for ${totalMatches} matches across ${updatedCount} groups!`);
        } else {
            alert('No matches found to update. Please ensure matches have been created first.');
        }
        
        console.log(`\n✓ Completed! Updated ${updatedCount} groups with ${totalMatches} match dates.`);
    } catch (error) {
        console.error('Error populating match dates:', error);
        alert('Failed to populate match dates. Check console for details.');
    }
}
