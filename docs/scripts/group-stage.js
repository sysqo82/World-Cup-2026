// Import Firebase services
import { db } from '../scripts/config/firebase-config.js';
import { fetchCountryMap, getCountryFullName } from '../scripts/utils/country-utils.js';
import { generateFixtures } from './create-round-matches/group-stage-fixtures.js';
import { setCookie, getCookie } from '../scripts/utils/cookie-utils.js';

db.collection('groups').onSnapshot(async snapshot => {
    const groups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    // Fetch the country map
    const countryMap = await fetchCountryMap();

    createTables(groups);
    populateTables(groups, countryMap);
    generateFixtures(groups, countryMap);
}, err => {
    console.error('Error fetching groups:', err);
});

function createTables(groups) {
    const container = document.getElementById('tables-container');
    container.innerHTML = ''; // Clear any existing tables

    groups.forEach(group => {
        const groupDiv = document.createElement('div');
        groupDiv.classList.add('group-container');
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

function populateTables(groups, countryMap) {
    groups.forEach(group => {
        const tableId = group.name.replace(/[^a-zA-Z0-9_-]/g, '-');
        const table = document.querySelector(`#${tableId}-table`);

        if (table) {
            while (table.rows.length > 1) {
                table.deleteRow(1); // Clear existing rows except the header
            }

            if (group.teams && typeof group.teams === 'object') {
                const matchesPlayed = Object.values(group.teams).some(team => team.P > 0);

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
                    points: (team.W || 0) * 3 + (team.D || 0),
                    goalDifference: (team.goalsScored || 0) - (team.goalsReceived || 0)
                })).sort((a, b) => {
                    if (!matchesPlayed) {
                        return a.initialRank - b.initialRank;
                    }
                    return (
                        b.points - a.points ||
                        b.goalDifference - a.goalDifference ||
                        b.goalsScored - a.goalsScored
                    );
                });

                sortedTeams.forEach((team, index) => {
                    const row = table.insertRow();

                    const cellRank = row.insertCell(0);
                    cellRank.textContent = index + 1;

                    const cellCountry = row.insertCell(1);
                    const teamFullName = getCountryFullName(countryMap, team.name);
                    cellCountry.innerHTML = `<strong title="${teamFullName}">${team.name}</strong>`;

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
            }
        }
    });
}

export function getMatchdayMatches(matchday, teams) {
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

// Add event listener for the team discovery button
const discoverTeamsButton = document.getElementById('discover-teams-button');
const modal = document.getElementById('team-discovery-modal');
const closeModal = document.getElementById('close-modal');
const teamDiscoveryForm = document.getElementById('team-discovery-form');
const teamResult = document.getElementById('team-result');
const assignedTeamDisplay = document.getElementById('assigned-team-display');

// Open the modal when the button is clicked
discoverTeamsButton.addEventListener('click', () => {
    modal.style.display = 'block';
});

// Close the modal when the close button is clicked
closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
    teamResult.classList.add('hidden'); // Hide the result
    teamDiscoveryForm.reset(); // Reset the form
});

// Close the modal when clicking outside the modal content
window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
        teamResult.classList.add('hidden'); // Hide the result
        teamDiscoveryForm.reset(); // Reset the form
    }
});

// Check for an existing cookie on page load
document.addEventListener('DOMContentLoaded', () => {
    const assignedTeam = getCookie('assignedTeam');
    if (assignedTeam) {
        assignedTeamDisplay.innerHTML = `Your winning team is: <strong>${assignedTeam}</strong>`;
        assignedTeamDisplay.classList.remove('hidden');
    }
});

// Handle form submission
teamDiscoveryForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();

    try {
        // Query the database for the user's assigned team
        const snapshot = await db.collection('users').where('email', '==', email).get();
        if (snapshot.empty) {
            assignedTeamDisplay.innerHTML = `<strong>You've not yet registered. Please register first.</strong>`;
            assignedTeamDisplay.classList.remove('hidden');
            modal.style.display = 'none'; // Close the modal
            return;
        }

        const userData = snapshot.docs[0].data();
        const assignedTeam = userData.team;

        if (assignedTeam) {
            // Display the assigned team and save it in a cookie
            assignedTeamDisplay.innerHTML = `Your winning team is: <strong>${assignedTeam}</strong>`;
            setCookie('assignedTeam', assignedTeam, 7); // Save for 7 days
        } else {
            assignedTeamDisplay.innerHTML = `<strong>You've not yet registered. Please register first.</strong>`;
        }
        assignedTeamDisplay.classList.remove('hidden');
        modal.style.display = 'none'; // Close the modal
    } catch (error) {
        console.error('Error fetching team:', error);
        assignedTeamDisplay.textContent = 'An error occurred. Please try again.';
        assignedTeamDisplay.classList.remove('hidden');
        modal.style.display = 'none'; // Close the modal
    }
});