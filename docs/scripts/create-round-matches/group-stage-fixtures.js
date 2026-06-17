import { getMatchdayMatches } from '../src/group-stage.js';
import { handleGroupStageScoreSubmission } from '../score-submissions/groups-stage.js';
import { fetchCountryMap, getCountryFullName } from '../utils/country-utils.js';
import { matchInvolvesAssignedTeam } from '../utils/user-utils.js';
import { auth } from '../config/firebase-config.js';
import { chronologicalMatches, getDisplayDate } from '../utils/match-schedule-constants.js';

let authListenerSetup = false;
let isAdmin = false;

export async function generateFixtures(groups, countryMap) {
    const stage = 'Group Stage';
    const fixturesContainer = document.getElementById('fixtures-container');
    fixturesContainer.innerHTML = ''; // Clear any existing fixtures

    // Fetch the country map if not provided
    if (!countryMap) {
        countryMap = await fetchCountryMap();
    }

    // Set up auth listener only once
    if (!authListenerSetup) {
        authListenerSetup = true;
        auth.onAuthStateChanged(async user => {
            if (user) {
                const tokenResult = await user.getIdTokenResult();
                isAdmin = tokenResult.claims.admin === true;
            } else {
                isAdmin = false;
            }
        });
    }

    async function renderFixtures() {
        fixturesContainer.innerHTML = '';

        // Create one table for all chronologically sorted matches
        const matchTable = document.createElement('table');
        matchTable.className = 'group-stage-table';
        matchTable.innerHTML = `
            <tr>
                <th>Match</th>
                <th>Group</th>
                <th></th>
                <th>Result</th>
                <th></th>
                <th>Date</th>
                <th>Time</th>
                ${isAdmin ? '<th></th>' : ''}
            </tr>
        `;

        // Build a mapping from country codes to full names
        const codeToCountry = {};
        for (const [name, data] of Object.entries(countryMap)) {
            if (data.code) {
                codeToCountry[data.code.toUpperCase()] = name;
            }
        }

        let matchNumber = 1;
        
        // Sort by actual kick-off date and time (matches the CSV dates exactly)
        const sortedMatches = [...chronologicalMatches].sort((a, b) => {
            const da = new Date(a.date + 'T' + a.time + ':00');
            const db = new Date(b.date + 'T' + b.time + ':00');
            return da - db;
        });

        for (const matchData of sortedMatches) {
            const { date, time, group: groupId, team1: team1Code, team2: team2Code } = matchData;
            
            // Find the group
            const group = groups.find(g => g.id === groupId);
            if (!group) continue;
            
            // Get the match key from group.matchdays - we need to find where this match is stored
            let existingMatch = {};
            let team1Name = '', team2Name = '', team1Id = '', team2Id = '';
            
            if (group.teams && typeof group.teams === 'object') {
                // Get team IDs and names by matching the codes stored in team.name
                const team1Entry = Object.entries(group.teams).find(([_, t]) => t.name === team1Code);
                const team2Entry = Object.entries(group.teams).find(([_, t]) => t.name === team2Code);
                
                if (team1Entry && team2Entry) {
                    [team1Id, { name: team1Name }] = [team1Entry[0], team1Entry[1]];
                    [team2Id, { name: team2Name }] = [team2Entry[0], team2Entry[1]];
                    
                    // Look for existing match data in any matchday
                    for (const matchday of ['matchday1', 'matchday2', 'matchday3']) {
                        if (group.matchdays?.[matchday]) {
                            // The match key is team1Id_team2Id
                            const matchKey1 = `${team1Id}_${team2Id}`;
                            const matchKey2 = `${team2Id}_${team1Id}`;
                            
                            if (group.matchdays[matchday][matchKey1]) {
                                existingMatch = group.matchdays[matchday][matchKey1];
                                break;
                            } else if (group.matchdays[matchday][matchKey2]) {
                                existingMatch = group.matchdays[matchday][matchKey2];
                                break;
                            }
                        }
                    }
                } else {
                    continue; // Skip if teams not found
                }
            } else {
                continue; // Skip if no teams in group
            }

            const row = document.createElement('tr');

            // Highlight row if assigned team is playing
            if (await matchInvolvesAssignedTeam(team1Name, team2Name)) {
                row.classList.add('assigned-team-highlight');
            }

            const { fullName: team1FullName } = getCountryFullName(countryMap, team1Name);
            const { fullName: team2FullName } = getCountryFullName(countryMap, team2Name);
            const team1FlagCode = countryMap[team1Name]?.flagCode || 'unknown';
            const team2FlagCode = countryMap[team2Name]?.flagCode || 'unknown';

            // Format date display - use actual kick-off date from CSV
            let dateDisplay = 'TBD';
            let dateTitle = '';
            if (date) {
                try {
                    const actualDate = new Date(date + 'T12:00:00');
                    dateDisplay = actualDate.toLocaleDateString('en-UK', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                    });
                    dateTitle = actualDate.toLocaleDateString('en-UK', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                    });
                } catch (e) {
                    dateDisplay = date;
                    dateTitle = date;
                }
            }

            row.innerHTML = `
                <td>${matchNumber++}</td>
                <td>${group.name}</td>
                <td class="team1" title="${team1FullName}">
                    <span class="fi fi-${team1FlagCode}"></span> ${team1Name}
                </td>
                <td>
                    <div class="score-container">
                        <input type="number" class="score-input" data-group="${group.id}" data-team-left="${team1Id}" data-team-right="${team2Id}" data-matchday="matchday1" value="${existingMatch.leftScore ?? ''}" ${existingMatch.leftScore !== undefined || !isAdmin ? 'disabled' : ''}>
                        -
                        <input type="number" class="score-input" data-group="${group.id}" data-team-left="${team2Id}" data-team-right="${team1Id}" data-matchday="matchday1" value="${existingMatch.rightScore ?? ''}" ${existingMatch.rightScore !== undefined || !isAdmin ? 'disabled' : ''}>
                    </div>
                </td>
                <td class="team2" title="${team2FullName}">
                   ${team2Name} <span class="fi fi-${team2FlagCode}"></span>
                </td>
                <td title="${dateTitle}">${dateDisplay}</td>
                <td>${time}</td>
                ${isAdmin ? `
                    <td><button class="submit-button" data-group="${group.id}" data-team-left="${team1Id}" data-team-right="${team2Id}" data-matchday="matchday1" ${existingMatch.leftScore !== undefined && existingMatch.rightScore !== undefined ? 'disabled' : ''}>Submit</button></td>
                ` : ''}
            `;
            matchTable.appendChild(row);

            // Apply highlighting based on results
            const team1Cell = row.querySelector('.team1');
            const team2Cell = row.querySelector('.team2');

            if (existingMatch.leftScore !== undefined && existingMatch.rightScore !== undefined) {
                if (existingMatch.leftScore > existingMatch.rightScore) {
                    team1Cell.classList.add('winner');
                    team2Cell.classList.add('loser');
                } else if (existingMatch.leftScore < existingMatch.rightScore) {
                    team2Cell.classList.add('winner');
                    team1Cell.classList.add('loser');
                } else {
                    team1Cell.classList.add('draw');
                    team2Cell.classList.add('draw');
                }
            }

            // Add submit button listener
            if (isAdmin) {
                const submitButton = row.querySelector('.submit-button');
                submitButton.addEventListener('click', (event) => {
                    const leftScoreInput = row.querySelector(`input[data-team-left="${team1Id}"]`);
                    const rightScoreInput = row.querySelector(`input[data-team-left="${team2Id}"]`);

                    const leftScore = parseInt(leftScoreInput.value, 10);
                    const rightScore = parseInt(rightScoreInput.value, 10);

                    if (!isNaN(leftScore) && !isNaN(rightScore)) {
                        team1Cell.classList.remove('winner', 'loser', 'draw');
                        team2Cell.classList.remove('winner', 'loser', 'draw');

                        if (leftScore > rightScore) {
                            team1Cell.classList.add('winner');
                            team2Cell.classList.add('loser');
                        } else if (leftScore < rightScore) {
                            team2Cell.classList.add('winner');
                            team1Cell.classList.add('loser');
                        } else {
                            team1Cell.classList.add('draw');
                            team2Cell.classList.add('draw');
                        }

                        leftScoreInput.disabled = true;
                        rightScoreInput.disabled = true;
                        submitButton.disabled = true;

                        handleGroupStageScoreSubmission(event, stage);
                    }
                });
            }
        }

        fixturesContainer.appendChild(matchTable);
    }

    // Call renderFixtures
    renderFixtures();
}