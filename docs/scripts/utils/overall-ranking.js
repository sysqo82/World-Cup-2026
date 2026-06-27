import { getQualifiedThirdPlaceTeams, rankTeamsInGroup } from './round-of-32-projection.js';

const STATUS_ORDER = {
    champion: { label: 'Champion', rank: 1000 },
    final: { label: 'Final', rank: 950 },
    runnerUp: { label: 'Runner-up', rank: 900 },
    thirdPlace: { label: 'Third Place', rank: 850 },
    thirdPlacePlayoff: { label: 'Third Place Playoff', rank: 800 },
    fourthPlace: { label: 'Fourth Place', rank: 750 },
    semiFinal: { label: 'Semi Final', rank: 700 },
    semiFinalExit: { label: 'Semi Final Exit', rank: 650 },
    quarterFinal: { label: 'Quarter Final', rank: 600 },
    quarterFinalExit: { label: 'Quarter Final Exit', rank: 550 },
    roundOf16: { label: 'Round of 16', rank: 500 },
    roundOf16Exit: { label: 'Round of 16 Exit', rank: 450 },
    roundOf32: { label: 'Round of 32', rank: 400 },
    roundOf32Exit: { label: 'Round of 32 Exit', rank: 350 },
    groupStage: { label: 'Group Stage', rank: 300 },
    groupStageExit: { label: 'Group Stage Exit', rank: 250 },
};

const KNOCKOUT_COLLECTIONS = [
    'roundOf32Teams',
    'roundOf16Teams',
    'quarterFinalsTeams',
    'semiFinalsTeams',
    'thirdPlacePlayoffTeams',
    'finalTeams',
];

function isNumber(value) {
    return typeof value === 'number' && !Number.isNaN(value);
}

function createEmptySet() {
    return new Set();
}

function getMatches(stageDoc) {
    return Array.isArray(stageDoc?.matches) ? stageDoc.matches : [];
}

function collectParticipants(matches) {
    const teams = new Set();

    matches.forEach(match => {
        if (match?.team1) {
            teams.add(match.team1);
        }
        if (match?.team2) {
            teams.add(match.team2);
        }
    });

    return teams;
}

function collectResolved(matches) {
    const winners = new Set();
    const losers = new Set();

    matches.forEach(match => {
        if (match?.winner) {
            winners.add(match.winner);
        }
        if (match?.loser) {
            losers.add(match.loser);
        }
    });

    return {
        winners,
        losers,
        allResolved: matches.length > 0 && matches.every(match => match?.winner && match?.loser),
    };
}

function getTeamSet(groupRankingsByGroup, startIndex, endIndex) {
    const teams = new Set();

    Object.values(groupRankingsByGroup).forEach(groupRanking => {
        groupRanking.slice(startIndex, endIndex).forEach(team => {
            if (team?.name) {
                teams.add(team.name);
            }
        });
    });

    return teams;
}

function buildGroupsById(groups) {
    return groups.reduce((acc, group) => {
        acc[group.id] = group;
        return acc;
    }, {});
}

function isGroupComplete(group) {
    return Object.values(group?.teams || {}).every(team => ((team.W || 0) + (team.D || 0) + (team.L || 0)) === 3);
}

function getStatus(key) {
    return STATUS_ORDER[key] || STATUS_ORDER.groupStage;
}

function determineQualifiedTeams(groupsById, groupRankingsByGroup) {
    const topTwoTeams = getTeamSet(groupRankingsByGroup, 0, 2);
    const bestThirdPlaceTeams = new Set(
        getQualifiedThirdPlaceTeams(groupsById)
            .map(team => team?.name)
            .filter(Boolean)
    );

    return new Set([...topTwoTeams, ...bestThirdPlaceTeams]);
}

function addKnockoutMatchStats(teamTable, match) {
    const team1 = teamTable.get(match?.team1);
    const team2 = teamTable.get(match?.team2);

    if (!team1 || !team2) {
        return;
    }

    const regular1 = match?.regularTimeTeam1Score;
    const regular2 = match?.regularTimeTeam2Score;
    if (!isNumber(regular1) || !isNumber(regular2)) {
        return;
    }

    const extra1 = isNumber(match?.extraTimeTeam1Score) ? match.extraTimeTeam1Score : 0;
    const extra2 = isNumber(match?.extraTimeTeam2Score) ? match.extraTimeTeam2Score : 0;

    team1.played += 1;
    team2.played += 1;
    team1.goalsFor += regular1 + extra1;
    team1.goalsAgainst += regular2 + extra2;
    team2.goalsFor += regular2 + extra2;
    team2.goalsAgainst += regular1 + extra1;

    if (match?.winner && match?.loser) {
        const winner = teamTable.get(match.winner);
        const loser = teamTable.get(match.loser);

        if (!winner || !loser) {
            return;
        }

        winner.wins += 1;
        loser.losses += 1;

        if (match.type === 'penalty') {
            winner.competitionPoints += 2;
            loser.competitionPoints += 1;
        } else {
            winner.competitionPoints += 3;
        }

        return;
    }

    if ((regular1 + extra1) === (regular2 + extra2)) {
        team1.draws += 1;
        team2.draws += 1;
        team1.competitionPoints += 1;
        team2.competitionPoints += 1;
    }
}

export function buildOverallRanking(groups = [], stageDocs = {}) {
    const groupsById = buildGroupsById(groups);
    const groupRankingsByGroup = groups.reduce((acc, group) => {
        acc[group.id] = rankTeamsInGroup(group);
        return acc;
    }, {});
    const allGroupsComplete = groups.length > 0 && groups.every(isGroupComplete);

    const teamTable = new Map();

    groups.forEach(group => {
        const rankedTeams = groupRankingsByGroup[group.id] || [];
        const positionsByName = rankedTeams.reduce((acc, team, index) => {
            if (team?.name) {
                acc[team.name] = index + 1;
            }
            return acc;
        }, {});

        Object.entries(group.teams || {}).forEach(([teamId, team]) => {
            if (!team?.name) {
                return;
            }

            teamTable.set(team.name, {
                teamId,
                name: team.name,
                groupId: group.id,
                groupName: group.name,
                groupPosition: positionsByName[team.name] || null,
                initialSeed: team['#'] || 0,
                played: team.P || 0,
                wins: team.W || 0,
                draws: team.D || 0,
                losses: team.L || 0,
                goalsFor: team.goalsScored || 0,
                goalsAgainst: team.goalsReceived || 0,
                competitionPoints: (team.W || 0) * 3 + (team.D || 0),
                statusKey: 'groupStage',
                statusLabel: STATUS_ORDER.groupStage.label,
                statusRank: STATUS_ORDER.groupStage.rank,
            });
        });
    });

    KNOCKOUT_COLLECTIONS.forEach(collectionName => {
        getMatches(stageDocs[collectionName]).forEach(match => addKnockoutMatchStats(teamTable, match));
    });

    const roundOf32Matches = getMatches(stageDocs.roundOf32Teams);
    const roundOf16Matches = getMatches(stageDocs.roundOf16Teams);
    const quarterFinalMatches = getMatches(stageDocs.quarterFinalsTeams);
    const semiFinalMatches = getMatches(stageDocs.semiFinalsTeams);
    const thirdPlaceMatches = getMatches(stageDocs.thirdPlacePlayoffTeams);
    const finalMatches = getMatches(stageDocs.finalTeams);

    const roundOf32ActualParticipants = collectParticipants(roundOf32Matches);
    const roundOf16ActualParticipants = collectParticipants(roundOf16Matches);
    const quarterFinalActualParticipants = collectParticipants(quarterFinalMatches);
    const semiFinalActualParticipants = collectParticipants(semiFinalMatches);
    const thirdPlaceActualParticipants = collectParticipants(thirdPlaceMatches);
    const finalActualParticipants = collectParticipants(finalMatches);

    const roundOf32Resolved = collectResolved(roundOf32Matches);
    const roundOf16Resolved = collectResolved(roundOf16Matches);
    const quarterFinalResolved = collectResolved(quarterFinalMatches);
    const semiFinalResolved = collectResolved(semiFinalMatches);
    const thirdPlaceResolved = collectResolved(thirdPlaceMatches);
    const finalResolved = collectResolved(finalMatches);

    const qualifiedTeams = allGroupsComplete
        ? determineQualifiedTeams(groupsById, groupRankingsByGroup)
        : createEmptySet();

    const roundOf32Participants = roundOf32ActualParticipants.size > 0
        ? roundOf32ActualParticipants
        : qualifiedTeams;
    const roundOf16Participants = roundOf16ActualParticipants.size > 0
        ? roundOf16ActualParticipants
        : (roundOf32Resolved.allResolved ? roundOf32Resolved.winners : createEmptySet());
    const quarterFinalParticipants = quarterFinalActualParticipants.size > 0
        ? quarterFinalActualParticipants
        : (roundOf16Resolved.allResolved ? roundOf16Resolved.winners : createEmptySet());
    const semiFinalParticipants = semiFinalActualParticipants.size > 0
        ? semiFinalActualParticipants
        : (quarterFinalResolved.allResolved ? quarterFinalResolved.winners : createEmptySet());
    const thirdPlaceParticipants = thirdPlaceActualParticipants.size > 0
        ? thirdPlaceActualParticipants
        : (semiFinalResolved.allResolved ? semiFinalResolved.losers : createEmptySet());
    const finalParticipants = finalActualParticipants.size > 0
        ? finalActualParticipants
        : (semiFinalResolved.allResolved ? semiFinalResolved.winners : createEmptySet());

    teamTable.forEach(team => {
        let statusKey = 'groupStage';

        if (allGroupsComplete || roundOf32Participants.size > 0) {
            statusKey = roundOf32Participants.has(team.name) ? 'roundOf32' : 'groupStageExit';
        }

        if (roundOf32Resolved.losers.has(team.name) && !roundOf16Participants.has(team.name)) {
            statusKey = 'roundOf32Exit';
        }
        if (roundOf16Participants.has(team.name)) {
            statusKey = 'roundOf16';
        }
        if (roundOf16Resolved.losers.has(team.name) && !quarterFinalParticipants.has(team.name)) {
            statusKey = 'roundOf16Exit';
        }
        if (quarterFinalParticipants.has(team.name)) {
            statusKey = 'quarterFinal';
        }
        if (quarterFinalResolved.losers.has(team.name) && !semiFinalParticipants.has(team.name)) {
            statusKey = 'quarterFinalExit';
        }
        if (semiFinalResolved.losers.has(team.name) && !thirdPlaceParticipants.has(team.name)) {
            statusKey = 'semiFinalExit';
        }
        if (semiFinalParticipants.has(team.name)) {
            statusKey = 'semiFinal';
        }
        if (thirdPlaceParticipants.has(team.name)) {
            statusKey = 'thirdPlacePlayoff';
        }
        if (thirdPlaceResolved.winners.has(team.name)) {
            statusKey = 'thirdPlace';
        }
        if (thirdPlaceResolved.losers.has(team.name)) {
            statusKey = 'fourthPlace';
        }
        if (finalParticipants.has(team.name)) {
            statusKey = 'final';
        }
        if (finalResolved.losers.has(team.name)) {
            statusKey = 'runnerUp';
        }
        if (finalResolved.winners.has(team.name)) {
            statusKey = 'champion';
        }

        const status = getStatus(statusKey);
        team.statusKey = statusKey;
        team.statusLabel = status.label;
        team.statusRank = status.rank;
        team.goalDifference = team.goalsFor - team.goalsAgainst;
    });

    const ranking = [...teamTable.values()].sort((a, b) => (
        b.statusRank - a.statusRank ||
        b.competitionPoints - a.competitionPoints ||
        b.goalDifference - a.goalDifference ||
        b.goalsFor - a.goalsFor ||
        a.name.localeCompare(b.name)
    ));

    ranking.forEach((team, index) => {
        team.rank = index + 1;
    });

    const knockoutSummary = {
        roundOf32: roundOf32Resolved,
        roundOf16: roundOf16Resolved,
        quarterFinals: quarterFinalResolved,
        semiFinals: semiFinalResolved,
        thirdPlace: thirdPlaceResolved,
        final: finalResolved,
    };

    return {
        ranking,
        allGroupsComplete,
        qualifiedTeams,
        knockoutSummary,
        rules: {
            primary: 'furthest progress in the tournament',
            tiebreakers: [
                'competition points',
                'goal difference excluding penalty shootouts',
                'goals scored excluding penalty shootouts',
            ],
            knockoutPoints: 'win in regular or extra time = 3, penalty shootout win = 2, penalty shootout loss = 1',
        },
    };
}
