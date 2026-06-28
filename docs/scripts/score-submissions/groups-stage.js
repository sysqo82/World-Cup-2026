import { db } from '../config/firebase-config.js';
import { sendMatchEmails } from '../utils/email-notifications.js';
import { sendGroupConclusionEmails } from '../utils/email-notifications.js';
import { chronologicalMatches, matchSchedule } from '../utils/match-schedule-constants.js';

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

function getMatchdayForFixture(groupData, groupId, teamLeftId, teamRightId, matchDate) {
    const leftTeamCode = groupData?.teams?.[teamLeftId]?.name || groupData?.teams?.[teamLeftId]?.Name;
    const rightTeamCode = groupData?.teams?.[teamRightId]?.name || groupData?.teams?.[teamRightId]?.Name;

    if (!leftTeamCode || !rightTeamCode) {
        return null;
    }

    const groupMatches = chronologicalMatches
        .filter(match => match.group === groupId)
        .sort((a, b) => {
            const kickoffA = new Date(`${a.date}T${a.time}:00`);
            const kickoffB = new Date(`${b.date}T${b.time}:00`);
            return kickoffA - kickoffB;
        });

    const sameTeams = (match) => (
        (match.team1 === leftTeamCode && match.team2 === rightTeamCode) ||
        (match.team1 === rightTeamCode && match.team2 === leftTeamCode)
    );

    let matchIndex = groupMatches.findIndex(match => sameTeams(match) && (!matchDate || match.date === matchDate));

    if (matchIndex === -1) {
        matchIndex = groupMatches.findIndex(sameTeams);
    }

    if (matchIndex === -1) {
        return null;
    }

    return `matchday${Math.floor(matchIndex / 2) + 1}`;
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
        const matchday = (
            providedMatchday ||
            storedMatch?.matchday ||
            getMatchdayForFixture(groupData, groupId, teamLeftId, teamRightId, matchDate) ||
            getMatchdayForDate(groupId, matchDate)
        );
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

        // Check if the full group stage is complete before sending conclusion emails
        await checkAndSendGroupConclusionEmails();
        return true;

    } catch (error) {
        console.error('Error submitting scores:', error);
        alert('An error occurred while submitting the scores.');
        return false;
    }
}

// Helper function to check if group stage is complete and send conclusion emails
function isGroupComplete(groupData) {
    return Object.values(groupData?.teams || {}).every(team => {
        const matchesPlayed = (team.W || 0) + (team.D || 0) + (team.L || 0);
        return matchesPlayed === 3;
    });
}

async function checkAndSendGroupConclusionEmails() {
    try {
        const groupsSnapshot = await db.collection('groups').get();
        const groups = groupsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const allGroupsComplete = groups.every(group => isGroupComplete(group));

        if (!allGroupsComplete) {
            return;
        }

        for (const group of groups) {
            if (!group.conclusionEmailsSent) {
                await sendGroupConclusionEmails(group, group.name);
                await db.collection('groups').doc(group.id).update({ conclusionEmailsSent: true });
            }
        }
    } catch (error) {
        console.error('Error checking group completion:', error);
    }
}
