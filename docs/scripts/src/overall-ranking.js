import { db } from '../config/firebase-config.js';
import { fetchCountryMap, getCountryFullName } from '../utils/country-utils.js';
import { buildOverallRanking } from '../utils/overall-ranking.js';

const STAGE_COLLECTIONS = [
    'roundOf32Teams',
    'roundOf16Teams',
    'quarterFinalsTeams',
    'semiFinalsTeams',
    'thirdPlacePlayoffTeams',
    'finalTeams',
];

const state = {
    countryMap: null,
    groups: [],
    groupsLoaded: false,
    assignedTeams: new Set(),
    assignedTeamsLoaded: false,
    stages: {},
};

function hidePageLoadingSpinner() {
    const spinner = document.getElementById('page-loading-spinner');
    if (spinner) {
        spinner.classList.add('hidden');
    }
}

function renderPrizeWinners(summary, countryMap, assignedTeams) {
    const prizeWinnersEl = document.getElementById('ranking-prize-winners');

    if (!prizeWinnersEl) {
        return;
    }

    const prizeTeams = summary.ranking
        .filter(team => assignedTeams.has(getCountryFullName(countryMap, team.name).fullName))
        .slice(0, 3);

    const labels = ['1st Prize', '2nd Prize', '3rd Prize'];

    prizeWinnersEl.innerHTML = `
        <div class="ranking-prize-list">
            ${labels.map((label, index) => {
                const team = prizeTeams[index];

                if (!team) {
                    return `
                        <div class="ranking-prize-row">
                            <span class="ranking-prize-label">${label}</span>
                            <span class="ranking-prize-team">TBD</span>
                        </div>
                    `;
                }

                const { fullName, flagCode } = getCountryFullName(countryMap, team.name);
                const teamLabel = fullName !== 'Unknown' ? fullName : team.name;

                return `
                    <div class="ranking-prize-row">
                        <span class="ranking-prize-label">${label}</span>
                        <span class="ranking-prize-team">
                            <span class="fi fi-${flagCode}"></span>
                            <span>${teamLabel}</span>
                        </span>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderSummary(summary, countryMap, assignedTeams) {
    const leadTeamEl = document.getElementById('overall-ranking-leader');
    const rulesEl = document.getElementById('ranking-rules');

    if (!leadTeamEl || !rulesEl) {
        return;
    }

    const leader = summary.ranking[0];
    leadTeamEl.textContent = leader
        ? `${leader.name} (${leader.statusLabel})`
        : 'No teams available';

    rulesEl.innerHTML = `
        <strong>Ranking rules:</strong> ${summary.rules.primary}, then ${summary.rules.tiebreakers.join(', ')}.
        Penalty shootout kicks are excluded from goals for and against.
    `;
    renderPrizeWinners(summary, countryMap, assignedTeams);
}

function renderTable(summary, countryMap) {
    const tableBody = document.querySelector('#overall-ranking-table tbody');
    const emptyState = document.getElementById('overall-ranking-empty-state');

    if (!tableBody || !emptyState) {
        return;
    }

    tableBody.innerHTML = '';

    if (summary.ranking.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    summary.ranking.forEach(team => {
        const row = document.createElement('tr');
        const { fullName, flagCode } = getCountryFullName(countryMap, team.name);

        row.innerHTML = `
            <td>${team.rank}</td>
            <td>
                <div class="ranking-team-cell">
                    <span class="fi fi-${flagCode}"></span>
                    <span title="${fullName}">${team.name}</span>
                </div>
            </td>
            <td><span class="ranking-status-chip ranking-status-chip--${team.statusKey}">${team.statusLabel}</span></td>
            <td>${team.groupName.replace('Group ', '')}</td>
            <td>${team.played}</td>
            <td>${team.competitionPoints}</td>
            <td>${team.goalDifference >= 0 ? '+' : ''}${team.goalDifference}</td>
            <td>${team.goalsFor}</td>
            <td>${team.goalsAgainst}</td>
        `;

        tableBody.appendChild(row);
    });
}

function render() {
    if (!state.countryMap || !state.groupsLoaded || !state.assignedTeamsLoaded) {
        return;
    }

    const summary = buildOverallRanking(state.groups, state.stages);
    renderSummary(summary, state.countryMap, state.assignedTeams);
    renderTable(summary, state.countryMap);
    hidePageLoadingSpinner();
}

async function initialize() {
    state.countryMap = await fetchCountryMap();

    db.collection('groups').onSnapshot(snapshot => {
        state.groups = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));
        state.groupsLoaded = true;
        render();
    }, error => {
        console.error('Error fetching groups for overall ranking:', error);
        hidePageLoadingSpinner();
    });

    db.collection('teams').onSnapshot(snapshot => {
        state.assignedTeams = new Set(
            snapshot.docs
                .map(doc => doc.data())
                .filter(team => team.assigned === true && team.fullName)
                .map(team => team.fullName)
        );
        state.assignedTeamsLoaded = true;
        render();
    }, error => {
        console.error('Error fetching assigned teams for overall ranking:', error);
        state.assignedTeams = new Set();
        state.assignedTeamsLoaded = true;
        render();
    });

    STAGE_COLLECTIONS.forEach(collectionName => {
        db.collection(collectionName).doc('matches').onSnapshot(doc => {
            state.stages[collectionName] = doc.exists ? doc.data() : { matches: [] };
            render();
        }, error => {
            console.error(`Error fetching ${collectionName} for overall ranking:`, error);
            state.stages[collectionName] = { matches: [] };
            render();
        });
    });
}

initialize().catch(error => {
    console.error('Error initializing overall ranking page:', error);
    hidePageLoadingSpinner();
});
