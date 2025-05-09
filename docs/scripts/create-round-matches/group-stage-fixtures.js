import { getMatchdayMatches } from '../src/group-stage.js';
import { handleGroupStageScoreSubmission } from '../score-submissions/groups-stage.js';
import { fetchCountryMap, getCountryFullName } from '../utils/country-utils.js';
import { auth } from '../config/firebase-config.js';

export async function generateFixtures(groups) {
    const stage = 'Group Stage';
    const fixturesContainer = document.getElementById('fixtures-container');
    fixturesContainer.innerHTML = ''; // Clear any existing fixtures

    const matchdays = ['matchday1', 'matchday2', 'matchday3'];

    // Fetch the country map
    const countryMap = await fetchCountryMap();

    // Check if the user is logged in
    let isLoggedIn = false;

    // Listen for authentication state changes
    auth.onAuthStateChanged(user => {
        isLoggedIn = !!user;
        renderFixtures(); // Re-render fixtures when the auth state changes
    });

    function renderFixtures() {
        fixturesContainer.innerHTML = ''; // Clear the container before re-rendering

        matchdays.forEach((matchday, index) => {
            const matchdayHeader = document.createElement('h2');
            matchdayHeader.textContent = `Matchday ${index + 1}`;
            fixturesContainer.appendChild(matchdayHeader);

            const matchdayTable = document.createElement('table');
            matchdayTable.innerHTML = `
                <tr>
                    <th>Match</th>
                    <th>Group</th>
                    <th></th>
                    <th>Result</th>
                    <th></th>
                    ${isLoggedIn ? '<th></th>' : ''}
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
                        const matches = getMatchdayMatches(matchday, sortedTeams);

                        matches.forEach(match => {
                            const existingMatch = group.matchdays?.[matchday]?.[`${match.team1.id}_${match.team2.id}`] || {};
                            const row = document.createElement('tr');
                            const { fullName: team1FullName } = getCountryFullName(countryMap, match.team1.name);
                            const { fullName: team2FullName } = getCountryFullName(countryMap, match.team2.name);
                            const team1FlagCode = countryMap[match.team1.name]?.flagCode || 'unknown';
                            const team2FlagCode = countryMap[match.team2.name]?.flagCode || 'unknown';

                            row.innerHTML = `
                                <td>${matchNumber++}</td>
                                <td>${group.name}</td>
                                <td class="team1" title="${team1FullName}">
                                    <span class="fi fi-${team1FlagCode}"></span> ${match.team1.name}
                                </td>
                                <td>
                                    <div class="score-container">
                                        <input type="number" class="score-input" data-group="${group.id}" data-team-left="${match.team1.id}" data-team-right="${match.team2.id}" data-matchday="${matchday}" value="${existingMatch.leftScore ?? ''}" ${existingMatch.leftScore !== undefined ? 'disabled' : ''}>
                                        -
                                        <input type="number" class="score-input" data-group="${group.id}" data-team-left="${match.team2.id}" data-team-right="${match.team1.id}" data-matchday="${matchday}" value="${existingMatch.rightScore ?? ''}" ${existingMatch.rightScore !== undefined ? 'disabled' : ''}>
                                    </div>
                                </td>
                                <td class="team2" title="${team2FullName}">
                                   ${match.team2.name} <span class="fi fi-${team2FlagCode}"></span>
                                </td>
                                ${isLoggedIn ? `
                                    <td><button class="submit-button" data-group="${group.id}" data-team-left="${match.team1.id}" data-team-right="${match.team2.id}" data-matchday="${matchday}" ${existingMatch.leftScore !== undefined && existingMatch.rightScore !== undefined ? 'disabled' : ''}>Submit</button></td>
                                ` : ''}
                            `;
                            matchdayTable.appendChild(row);

                            // Apply highlighting based on existing match results
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

                            // Add event listener for the submit button if the user is logged in
                            if (isLoggedIn) {
                                const submitButton = row.querySelector('.submit-button');
                                submitButton.addEventListener('click', (event) => {
                                    const leftScoreInput = row.querySelector(`input[data-group="${group.id}"][data-team-left="${match.team1.id}"]`);
                                    const rightScoreInput = row.querySelector(`input[data-group="${group.id}"][data-team-left="${match.team2.id}"]`);

                                    const leftScore = parseInt(leftScoreInput.value, 10);
                                    const rightScore = parseInt(rightScoreInput.value, 10);

                                    if (!isNaN(leftScore) && !isNaN(rightScore)) {
                                        // Highlight winner, loser, or draw
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

                                        // Lock the input fields and disable the submit button
                                        leftScoreInput.disabled = true;
                                        rightScoreInput.disabled = true;
                                        submitButton.disabled = true;

                                        // Submit the scores to the database
                                        handleGroupStageScoreSubmission(event, stage);
                                    }
                                });
                            }
                        });
                    }
                }
            });

            fixturesContainer.appendChild(matchdayTable);
        });
    }

    // Initial render
    renderFixtures();
}