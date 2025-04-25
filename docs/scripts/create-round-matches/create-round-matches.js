import { db, auth } from '../config/firebase-config.js';
import { handleRegularTimeSubmission } from '../score-submissions/regular-time.js';
import { handleExtraTimeSubmission } from '../score-submissions/extra-time.js';
import { handlePenaltyShootoutsSubmission } from '../score-submissions/penalty-shootouts.js';
import { fetchCountryMap, getCountryFullName } from '../utils/country-utils.js';

export async function generateRoundMatches(selector, dataBase, round) {
    const container = document.querySelector(`${selector}`);
    if (!container) {
        console.error(`Container for ${round} matches not found.`);
        return;
    }
    container.innerHTML = ''; // Clear previous matches

    // Check if it's the final
    let isFinal = round === 'Final';

    // Fetch the country map
    const countryMap = await fetchCountryMap();

    // Track the user's authentication state
    let isLoggedIn = false;

    // Listen for authentication state changes
    auth.onAuthStateChanged(user => {
        isLoggedIn = !!user;
        renderMatches(); // Re-render matches when the auth state changes
    });

    async function renderMatches() {
        container.innerHTML = ''; // Clear previous matches

        const matches = await fetchRoundMatches(dataBase, round);

        if (matches.length === 0) {
            container.innerHTML = '<p>No matches available.</p>';
            return;
        }

        matches.forEach((match) => {
            const table = document.createElement('table');
            table.classList.add('match-table');
            table.innerHTML = `
            <tr>
                <td class="team-name" data-team="team1" data-type="regular" data-match="${match.match}" title="${getCountryFullName(countryMap, match.team1).fullName}">
                    <span class="country-container">
                        ${isFinal 
                            ? `<strong>${match.team1}</strong><span class="fi fi-${getCountryFullName(countryMap, match.team1).flagCode} large-flag"></span>` 
                            : `<span class="${isFinal ? 'large-flag' : ''} fi fi-${getCountryFullName(countryMap, match.team1).flagCode}"></span><strong>${match.team1}</strong>`
                        }
                    </span>
                </td>
                <td class="score-section">
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}" data-team="team1" data-type="regular" value="${match.regularTimeTeam1Score ?? ''}" ${match.winner ? 'disabled' : ''}>
                    <span class="score-divider">-</span>
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}" data-team="team2" data-type="regular" value="${match.regularTimeTeam2Score ?? ''}" ${match.winner ? 'disabled' : ''}>
                </td>
                <td class="team-name" data-team="team2" data-type="regular" data-match="${match.match}" title="${getCountryFullName(countryMap, match.team2).fullName}">
                    <span class="country-container">
                        ${isFinal 
                            ? `<strong>${match.team2}</strong><span class="fi fi-${getCountryFullName(countryMap, match.team2).flagCode} large-flag"></span>` 
                            : `<span class="${isFinal ? 'large-flag' : ''} fi fi-${getCountryFullName(countryMap, match.team2).flagCode}"></span><strong>${match.team2}</strong>`
                        }
                    </span>
                </td>
                ${isLoggedIn ? `
                    <td>
                        <button class="submit-button" data-match="${match.match}" data-team1="${match.team1}" data-team2="${match.team2}" data-type="regular" ${match.winner ? 'disabled' : ''}>Submit</button>
                    </td>
                ` : ''}
            </tr>
            <tr class="extra-time-row ${match.displayExtraTime ? '' : 'hidden'}" data-match="${match.match}">
                <td class="extra-time-label">Extra Time</td>
                <td class="score-section">
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}" data-team="team1" data-type="extra" value="${match.extraTimeTeam1Score ?? ''}" ${match.winner ? 'disabled' : ''}>
                    <span class="score-divider">-</span>
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}" data-team="team2" data-type="extra" value="${match.extraTimeTeam2Score ?? ''}" ${match.winner ? 'disabled' : ''}>
                </td>
                ${isLoggedIn ? `
                    <td>
                        <button class="submit-button" data-match="${match.match}" data-team1="${match.team1}" data-team2="${match.team2}" data-type="extra" ${match.winner ? 'disabled' : ''}>Submit</button>
                    </td>
                ` : ''}
            </tr>
            <tr class="penalty-row ${match.displayPenaltyShootouts ? '' : 'hidden'}" data-match="${match.match}">
                <td>Penalties</td>
                <td class="score-section">
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}" data-team="team1" data-type="penalty" value="${match.penaltyShootoutsTeam1Score ?? ''}" ${match.winner ? 'disabled' : ''}>
                    <span class="score-divider">-</span>
                    <input type="number" class="score-input" placeholder="Score" data-match="${match.match}" data-team="team2" data-type="penalty" value="${match.penaltyShootoutsTeam2Score ?? ''}" ${match.winner ? 'disabled' : ''}>
                </td>
                ${isLoggedIn ? `
                    <td>
                        <button class="submit-button" data-match="${match.match}" data-team1="${match.team1}" data-team2="${match.team2}" data-type="penalty" ${match.winner ? 'disabled' : ''}>Submit</button>
                    </td>
                ` : ''}
            </tr>
        `;
            container.appendChild(table);

            // Disable all inputs and buttons if the match has ended
            if (match.winner) {
                const inputs = table.querySelectorAll(`input[data-match="${match.match}"]`);
                inputs.forEach(input => input.disabled = true);

                const buttons = table.querySelectorAll(`button[data-match="${match.match}"]`);
                buttons.forEach(button => button.disabled = true);

                // Highlight the winner's name
                const teamCells = table.querySelectorAll(`td[data-match="${match.match}"]`);
                teamCells.forEach(cell => {
                    if (cell.textContent.trim() === match.winner) {
                        cell.classList.add('winner');
                    } else {
                        cell.classList.remove('winner');
                    }
                    if (cell.textContent.trim() === match.loser) {
                        cell.classList.add('loser');
                    } else {
                        cell.classList.remove('loser');
                    }
                });
            }

            // Add event listeners for submit buttons if the user is logged in
            if (isLoggedIn) {
                const regularTimeButton = table.querySelector('.submit-button[data-type="regular"]');
                if (regularTimeButton) {
                    regularTimeButton.addEventListener('click', async (event) => {
                        await handleRegularTimeSubmission(dataBase, event, table);
                        renderMatches(); // Re-render matches after submission
                    });
                }

                const extraTimeButton = table.querySelector('.submit-button[data-type="extra"]');
                if (extraTimeButton) {
                    extraTimeButton.addEventListener('click', async (event) => {
                        await handleExtraTimeSubmission(dataBase, event, table);
                        renderMatches(); // Re-render matches after submission
                    });
                }

                const penaltyButton = table.querySelector('.submit-button[data-type="penalty"]');
                if (penaltyButton) {
                    penaltyButton.addEventListener('click', async (event) => {
                        await handlePenaltyShootoutsSubmission(dataBase, event, table);
                        renderMatches(); // Re-render matches after submission
                    });
                }
            }
        });
    }
}

async function fetchRoundMatches(dataBase, round) {
    try {
        const doc = await db.collection(`${dataBase}`).doc('matches').get();
        if (!doc.exists) {
            console.error(`No ${round} matches found in Firestore.`);
            return [];
        }
        return doc.data().matches || [];
    } catch (error) {
        console.error(`Error fetching ${round} matches:`, error);
        return [];
    }
}
