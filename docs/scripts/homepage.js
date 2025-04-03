// Import Firebase services
import { db, auth } from './firebase-config.js';

// Navigation function
function navigateToPage() {
    const selectedPage = document.getElementById('navigation-select').value;
    if (selectedPage === 'round-of-16') {
        window.location.href = 'round-of-16.html';
    } else if (selectedPage === 'group-stage') {
        window.location.href = 'index.html';
    }
}

// Attach navigateToPage to the global scope
window.navigateToPage = navigateToPage;

// Check if the user is logged in
auth.onAuthStateChanged(user => {
    if (user) {
        console.log(`User is logged in: ${user.email}`);
    } else {
        console.log('No user is logged in.');
    }
});

// Homepage features:
    // Real-time listener for groups and teams
    db.collection('groups').onSnapshot(snapshot => {
        const groups = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        createTables(groups);
        populateTables(groups);
        generateFixtures(groups);
    }, err => {
        console.error('Error fetching groups:', err);
    });

    function createTables(groups) {
        const container = document.getElementById('tables-container');
        container.innerHTML = ''; // Clear any existing tables

        groups.forEach(group => {
            if (!group.name) {
                console.warn(`Group with ID ${group.id} is missing the 'name' field.`);
                return; // Skip this group
            }

            // Create a table for each group
            const groupDiv = document.createElement('div');
            groupDiv.innerHTML = `
                    <h2>${group.name}</h2>
                    <table id="${group.name.replace(/[^a-zA-Z0-9_-]/g, '-')}-table">
                        <tr>
                            <th>#</th>
                            <th>Country</th>
                            <th>P</th>
                            <th>W</th>
                            <th>D</th>
                            <th>L</th>
                            <th>Agg</th>
                            <th>Points</th>
                        </tr>
                    </table>
                `;
            container.appendChild(groupDiv);
        });
    }

    function populateTables(groups) {
        groups.forEach(group => {
            const tableId = group.name.replace(/[^a-zA-Z0-9_-]/g, '-');
            const table = document.querySelector(`#${tableId}-table`);

            if (table) {
                while (table.rows.length > 1) {
                    table.deleteRow(1); // Clear existing rows except the header
                }

                if (group.teams && typeof group.teams === 'object') {
                    // Determine if any matches have been played
                    const matchesPlayed = Object.values(group.teams).some(team => team.P > 0);

                    // Sort teams
                    const sortedTeams = Object.entries(group.teams).map(([id, team]) => ({
                        id,
                        name: team.name || 'Unknown',
                        initialRank: team['#'] || 0,
                        played: team.P || 0,
                        wins: team.W || 0,
                        draws: team.D || 0,
                        losses: team.L || 0,
                        goalsScored: team.goalsScored || 0,
                        goalsReceived: team.goalsReceived || 0,
                        points: (team.W || 0) * 3 + (team.D || 0), // Calculate points
                        goalDifference: (team.goalsScored || 0) - (team.goalsReceived || 0) // Calculate goal difference
                    })).sort((a, b) => {
                        if (!matchesPlayed) {
                            // Sort by initialRank if no matches have been played
                            return a.initialRank - b.initialRank;
                        }
                        // Sort by points, then goal difference, then goals scored
                        return (
                            b.points - a.points ||
                            b.goalDifference - a.goalDifference ||
                            b.goalsScored - a.goalsScored
                        );
                    });

                    // Populate the table with sorted teams
                    sortedTeams.forEach((team, index) => {
                        const row = table.insertRow();

                        const cellRank = row.insertCell(0);
                        cellRank.textContent = index + 1;

                        const cellCountry = row.insertCell(1);
                        cellCountry.innerHTML = `<strong>${team.name}</strong>`;

                        const cellPlayed = row.insertCell(2);
                        cellPlayed.textContent = team.played;

                        const cellW = row.insertCell(3);
                        cellW.textContent = team.wins;

                        const cellD = row.insertCell(4);
                        cellD.textContent = team.draws;

                        const cellL = row.insertCell(5);
                        cellL.textContent = team.losses;

                        const cellAgg = row.insertCell(6);
                        cellAgg.textContent = `${team.goalsScored}-${team.goalsReceived}`;

                        const cellPoints = row.insertCell(7);
                        cellPoints.textContent = team.points;
                    });
                } else {
                    console.warn(`No teams found for group: ${group.name}`);
                }
            } else {
                console.error(`Table for group ${group.name} not found. Ensure the table ID matches the group name.`);
            }
        });
    }

    function generateFixtures(groups) {
        const fixturesContainer = document.getElementById('fixtures-container');
        fixturesContainer.innerHTML = ''; // Clear any existing fixtures

        // Generate fixtures for each matchday
        const matchdays = ['matchday1', 'matchday2', 'matchday3'];

        matchdays.forEach((matchday, index) => {
            // Add Matchday header
            const matchdayHeader = document.createElement('h2');
            matchdayHeader.textContent = `Matchday ${index + 1}`;
            fixturesContainer.appendChild(matchdayHeader);

            // Create a table for the matchday
            const matchdayTable = document.createElement('table');
            matchdayTable.innerHTML = `
                    <tr>
                        <th>Match</th>
                        <th>Group</th>
                        <th></th>
                        <th>Result</th>
                        <th></th>
                        <th></th>
                    </tr>
                `;

            let matchNumber = 1;

            groups.forEach(group => {
                if (group.teams && typeof group.teams === 'object') {
                    const sortedTeams = Object.entries(group.teams).map(([id, team]) => ({
                        id,
                        name: team.name || team.Name || 'Unknown',
                        initialRank: parseInt(id.replace('team', ''), 10) || 0
                    })).sort((a, b) => a.initialRank - b.initialRank);

                    if (sortedTeams.length >= 4) {
                        // Generate matches for the current matchday
                        const matches = getMatchdayMatches(matchday, sortedTeams);

                        matches.forEach(match => {
                            const existingMatch = group.matchdays?.[matchday]?.[`${match.team1.id}_${match.team2.id}`] || {};
                            const row = document.createElement('tr');
                            row.innerHTML = `
                                    <td>${matchNumber++}</td>
                                    <td>${group.name}</td>
                                    <td>${match.team1.name}</td>
                                    <td>
                                        <div class="score-container">
                                            <input type="number" class="score-input" data-group="${group.id}" data-team-left="${match.team1.id}" data-team-right="${match.team2.id}" data-matchday="${matchday}" value="${existingMatch.leftScore ?? ''}">
                                            -
                                            <input type="number" class="score-input" data-group="${group.id}" data-team-left="${match.team2.id}" data-team-right="${match.team1.id}" data-matchday="${matchday}" value="${existingMatch.rightScore ?? ''}">
                                        </div>
                                    </td>
                                    <td>${match.team2.name}</td>
                                    <td><button class="submit-button" data-group="${group.id}" data-team-left="${match.team1.id}" data-team-right="${match.team2.id}" data-matchday="${matchday}">Submit</button></td>
                                `;
                            matchdayTable.appendChild(row);
                        });
                    }
                }
            });

            fixturesContainer.appendChild(matchdayTable);

            // Add event listeners to all submit buttons for the matchday
            const submitButtons = document.querySelectorAll(`.submit-button[data-matchday="${matchday}"]`);
            submitButtons.forEach(button => {
                button.addEventListener('click', handleGroupStageScoreSubmission);
            });
        });
    }

    // Helper function to get matches for a specific matchday
    function getMatchdayMatches(matchday, teams) {
        switch (matchday) {
            case 'matchday1':
                return [
                    { team1: teams[0], team2: teams[1] },
                    { team1: teams[2], team2: teams[3] }
                ];
            case 'matchday2':
                return [
                    { team1: teams[0], team2: teams[2] },
                    { team1: teams[1], team2: teams[3] }
                ];
            case 'matchday3':
                return [
                    { team1: teams[0], team2: teams[3] },
                    { team1: teams[1], team2: teams[2] }
                ];
            default:
                return [];
        }
    }

    async function handleGroupStageScoreSubmission(event) {
        const button = event.target;
        const groupId = button.dataset.group;
        const teamLeftId = button.dataset.teamLeft;
        const teamRightId = button.dataset.teamRight;
        const matchday = button.dataset.matchday; // Get the matchday from the button

        const leftScoreInput = document.querySelector(`input[data-group="${groupId}"][data-team-left="${teamLeftId}"][data-matchday="${matchday}"]`);
        const rightScoreInput = document.querySelector(`input[data-group="${groupId}"][data-team-left="${teamRightId}"][data-matchday="${matchday}"]`);

        // Check if the inputs exist
        if (!leftScoreInput || !rightScoreInput) {
            alert('Error: Match inputs not found. Please ensure the match exists.');
            return;
        }

        const leftScore = parseInt(leftScoreInput.value, 10);
        const rightScore = parseInt(rightScoreInput.value, 10);

        // Validate that both scores are entered
        if (isNaN(leftScore) || isNaN(rightScore)) {
            alert('Both scores must be entered before submitting.');
            return;
        }

        try {
            // Fetch the current matchday data from Firestore
            const groupDoc = await db.collection('groups').doc(groupId).get();
            const groupData = groupDoc.data();
            const existingMatch = groupData.matchdays?.[matchday]?.[`${teamLeftId}_${teamRightId}`];

            const updates = {
                [`matchdays.${matchday}.${teamLeftId}_${teamRightId}`]: { leftScore, rightScore }
            };

            // Only increment "P" if the match is new
            if (!existingMatch) {
                updates[`teams.${teamLeftId}.P`] = firebase.firestore.FieldValue.increment(1);
                updates[`teams.${teamRightId}.P`] = firebase.firestore.FieldValue.increment(1);
            }

            // Update win, draw, and loss stats
            if (leftScore > rightScore) {
                updates[`teams.${teamLeftId}.W`] = firebase.firestore.FieldValue.increment(1);
                updates[`teams.${teamRightId}.L`] = firebase.firestore.FieldValue.increment(1);
            } else if (leftScore < rightScore) {
                updates[`teams.${teamRightId}.W`] = firebase.firestore.FieldValue.increment(1);
                updates[`teams.${teamLeftId}.L`] = firebase.firestore.FieldValue.increment(1);
            } else {
                updates[`teams.${teamLeftId}.D`] = firebase.firestore.FieldValue.increment(1);
                updates[`teams.${teamRightId}.D`] = firebase.firestore.FieldValue.increment(1);
            }

            // Update goals scored and received
            updates[`teams.${teamLeftId}.goalsScored`] = firebase.firestore.FieldValue.increment(leftScore);
            updates[`teams.${teamRightId}.goalsReceived`] = firebase.firestore.FieldValue.increment(leftScore);
            updates[`teams.${teamRightId}.goalsScored`] = firebase.firestore.FieldValue.increment(rightScore);
            updates[`teams.${teamLeftId}.goalsReceived`] = firebase.firestore.FieldValue.increment(rightScore);

            // Push the updates to Firestore
            await db.collection('groups').doc(groupId).update(updates);

            // Update the input fields to reflect the saved scores
            leftScoreInput.value = leftScore;
            rightScoreInput.value = rightScore;

        } catch (error) {
            console.error('Error submitting scores:', error);
            alert('An error occurred while submitting the scores.');
        }
    }