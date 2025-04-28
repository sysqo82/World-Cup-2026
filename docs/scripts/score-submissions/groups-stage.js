import { db } from '../config/firebase-config.js';
import { sendMatchEmails } from '../utils/email-notifications.js';

export async function handleGroupStageScoreSubmission(event, stage) {
    const button = event.target;
    const groupId = button.dataset.group;
    const teamLeftId = button.dataset.teamLeft;
    const teamRightId = button.dataset.teamRight;
    const matchday = button.dataset.matchday;

    const leftScoreInput = document.querySelector(`input[data-group="${groupId}"][data-team-left="${teamLeftId}"][data-matchday="${matchday}"]`);
    const rightScoreInput = document.querySelector(`input[data-group="${groupId}"][data-team-left="${teamRightId}"][data-matchday="${matchday}"]`);

    if (!leftScoreInput || !rightScoreInput) {
        alert('Error: Match inputs not found. Please ensure the match exists.');
        return;
    }

    const leftScore = parseInt(leftScoreInput.value, 10);
    const rightScore = parseInt(rightScoreInput.value, 10);

    if (isNaN(leftScore) || isNaN(rightScore)) {
        alert('Both scores must be entered before submitting.');
        return;
    }

    try {
        const groupDoc = await db.collection('groups').doc(groupId).get();
        const groupData = groupDoc.data();
        const existingMatch = groupData.matchdays?.[matchday]?.[`${teamLeftId}_${teamRightId}`];
        const groupName = groupData['name'];

        const updates = {
            [`matchdays.${matchday}.${teamLeftId}_${teamRightId}`]: { leftScore, rightScore }
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
            console.log('else');
            
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

        leftScoreInput.value = leftScore;
        rightScoreInput.value = rightScore;

    } catch (error) {
        console.error('Error submitting scores:', error);
        alert('An error occurred while submitting the scores.');
    }
}