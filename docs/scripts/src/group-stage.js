// Import Firebase services
import { db } from '../config/firebase-config.js';
import { fetchCountryMap, getCountryFullName } from '../utils/country-utils.js';
import { generateFixtures } from '../create-round-matches/group-stage-fixtures.js';
import { getAssignedTeam, logoutUser } from '../utils/user-utils.js';
import { isAllowed, isRegistered } from "../navigation/navigation.js";

// Check if the user is allowed in the site
await isRegistered();
await isAllowed();

document.getElementById('logout').addEventListener('click', logoutUser);

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

                    const { fullName: teamFullName, flagCode: teamFlagCode } = getCountryFullName(countryMap, team.name);
                    cellCountry.innerHTML = `
                    <span class="country-container" title="${teamFullName}">
                        <span class="fi fi-${teamFlagCode}"></span>
                        <strong>${team.name}</strong>
                    </span>
                `;

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

getAssignedTeam()
