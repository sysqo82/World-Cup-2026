import { db } from '../config/firebase-config.js';
import { sendMatchEmails } from '../utils/email-notifications.js';
import { sendGroupConclusionEmails } from '../utils/email-notifications.js';
import { matchSchedule } from '../utils/match-schedule-constants.js';

function findStoredMatch(matchdays = {}, teamLeftId, teamRightId) {
    const directMatchKey = `${teamLeftId}_${teamRightId}`;
    const reverseMatchKey = `${teamRightId}_${teamLeftId}`;

    for (const [matchday, matches] of Object.entries(matchdays)) {
        if (matches?.[directMatchKey]) {
            return { matchday, matchKey: directMatchKey, match: matches[directMatchKey] };
        }

        if (matches?.[reverseMatchKey]) {
            return { matchday, matchKey: reverseMatchKey, match: matches[reverseMatchKey] };
        }
    }

    return null;
}

function getMatchdayForDate(groupId, matchDate) {
    const groupSchedule = matchSchedule[groupId];
    if (!groupSchedule || !matchDate) {
        return null;
    }

    return Object.entries(groupSchedule).find(([, scheduledDate]) => scheduledDate === matchDate)?.[0] || null;
}

export async function handleGroupStageScoreSubmission(matchDetails, stage) {
    const {
        groupId,
        teamLeftId,
        teamRightId,
        leftScore,
        rightScore,
        matchday: providedMatchday,
        matchDate,
    } = matchDetails;

    if (isNaN(leftScore) || isNaN(rightScore)) {
        alert('Both scores must be entered before submitting.');
        return false;
    }

    try {
        const groupDoc = await db.collection('groups').doc(groupId).get();
        const groupData = groupDoc.data();
        const storedMatch = findStoredMatch(groupData.matchdays, teamLeftId, teamRightId);
        const matchday = providedMatchday || storedMatch?.matchday || getMatchdayForDate(groupId, matchDate);
        const matchKey = storedMatch?.matchKey || `${teamLeftId}_${teamRightId}`;
        const existingMatch = storedMatch?.match;
        const groupName = groupData['name'];

        if (!matchday) {
            throw new Error(`Could not determine matchday for ${groupId} ${teamLeftId}_${teamRightId}`);
        }

        const updates = {
            [`matchdays.${matchday}.${matchKey}`]: {
                leftScore, 
                rightScore,
                ...(matchDate && { date: matchDate })
            }
        };

        if (!existingMatch) {
            updates[`teams.${teamLeftId}.P`] = firebase.firestore.FieldValue.increment(1);
            updates[`teams.${teamRightId}.P`] = firebase.firestore.FieldValue.increment(1);
        }

        if (leftScore > rightScore) {
            const winner = groupData.teams[teamLeftId]['name'];
            const loser = groupData.teams[teamRightId]['name'];
            const winnersScore = leftScore;
            const losersScore = rightScore;

            await sendMatchEmails(winner, loser, groupName, stage, winnersScore, losersScore);
            updates[`teams.${teamLeftId}.W`] = firebase.firestore.FieldValue.increment(1);
            updates[`teams.${teamRightId}.L`] = firebase.firestore.FieldValue.increment(1);
        } else if (leftScore < rightScore) {
            const winner = groupData.teams[teamRightId]['name'];
            const loser = groupData.teams[teamLeftId]['name'];
            
            const winnersScore = rightScore;
            const losersScore = leftScore;

            await sendMatchEmails(winner, loser, groupName, stage, winnersScore, losersScore);
            updates[`teams.${teamRightId}.W`] = firebase.firestore.FieldValue.increment(1);
            updates[`teams.${teamLeftId}.L`] = firebase.firestore.FieldValue.increment(1);
        } else {
            const winner = groupData.teams[teamRightId]['name'];
            const loser = groupData.teams[teamLeftId]['name'];
            
            const winnersScore = rightScore;
            const losersScore = leftScore;

            await sendMatchEmails(winner, loser, groupName, stage, winnersScore, losersScore);

            updates[`teams.${teamLeftId}.D`] = firebase.firestore.FieldValue.increment(1);
            updates[`teams.${teamRightId}.D`] = firebase.firestore.FieldValue.increment(1);
        }

        updates[`teams.${teamLeftId}.goalsScored`] = firebase.firestore.FieldValue.increment(leftScore);
        updates[`teams.${teamRightId}.goalsReceived`] = firebase.firestore.FieldValue.increment(leftScore);
        updates[`teams.${teamRightId}.goalsScored`] = firebase.firestore.FieldValue.increment(rightScore);
        updates[`teams.${teamLeftId}.goalsReceived`] = firebase.firestore.FieldValue.increment(rightScore);

        await db.collection('groups').doc(groupId).update(updates);

        // Check if group stage is complete for this group
        await checkAndSendGroupConclusionEmails(groupId, groupName);
        return true;

    } catch (error) {
        console.error('Error submitting scores:', error);
        alert('An error occurred while submitting the scores.');
        return false;
    }
}

// Helper function to check if group stage is complete and send conclusion emails
async function checkAndSendGroupConclusionEmails(groupId, groupName) {
    try {
        const groupDoc = await db.collection('groups').doc(groupId).get();
        const groupData = groupDoc.data();
        
        // Check if all teams have played 3 matches
        let allTeamsComplete = true;
        for (const teamAbbr in groupData.teams) {
            const team = groupData.teams[teamAbbr];
            const matchesPlayed = (team.W || 0) + (team.D || 0) + (team.L || 0);
            if (matchesPlayed !== 3) {
                allTeamsComplete = false;
                break;
            }
        }

        // If all teams have completed 3 matches, send group conclusion emails
        if (allTeamsComplete) {
            // Check if emails have already been sent
            if (!groupData.conclusionEmailsSent) {
                await sendGroupConclusionEmails(groupData, groupName);
                // Mark that conclusion emails have been sent
                await db.collection('groups').doc(groupId).update({ conclusionEmailsSent: true });
            }
        }
    } catch (error) {
        console.error('Error checking group completion:', error);
    }
}
