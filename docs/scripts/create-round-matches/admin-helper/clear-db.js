import { db } from '../../config/firebase-config.js';

export async function clearDB() {
  try {
    const snapshot = await db.collection('groups').get();

    if (snapshot.empty) {
      console.log('No groups found in the "groups" collection.');
      return;
    }

    console.log(`Found ${snapshot.size} groups in "groups" collection.`);

    // Process each group
    for (const groupDoc of snapshot.docs) {
      const groupId = groupDoc.id;
      const groupData = groupDoc.data();

      console.log(`Processing group: ${groupId}`);

      const updates = {};

      // Reset the teams field if it exists
      if (groupData.teams && typeof groupData.teams === 'object') {
        const updatedTeams = {};

        // Reset fields for each team
        for (const [teamId, teamData] of Object.entries(groupData.teams)) {
          updatedTeams[teamId] = {
            name: teamData.name || 'Unknown', // Preserve the team name
            '#': teamData['#'] || 0, // Preserve the initial rank if available
            points: 0,
            W: 0,
            D: 0,
            L: 0,
            goalsScored: 0,
            goalsReceived: 0,
            P: 0,
          };
        }

        updates.teams = updatedTeams;
      } else {
        console.log(`No teams found in group: ${groupId}`);
      }

      // Delete the matchdays field if it exists
      if (groupData.matchdays) {
        updates.matchdays = firebase.firestore.FieldValue.delete();
        console.log(`Deleted matchdays for group: ${groupId}`);
      }

      // Apply the updates to the group document
      await db.collection('groups').doc(groupId).update(updates);
      console.log(`Cleared data for group: ${groupId}`);
    }

    console.log('Database cleared successfully.');
  } catch (error) {
    console.error('Error clearing database:', error);
  }
}