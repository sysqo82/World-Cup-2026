const GROUP_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

const LETTER_TO_GROUP_ID = GROUP_LETTERS.reduce((acc, letter, index) => {
  acc[letter] = `group${String(index + 1).padStart(2, '0')}`;
  return acc;
}, {});

const GROUP_ID_TO_LETTER = Object.fromEntries(
  Object.entries(LETTER_TO_GROUP_ID).map(([letter, groupId]) => [groupId, letter])
);

export const ROUND_OF_32_RULES = [
  { match: 'Match 73', pairing: '2A vs 2B', team1: { group: 'A', rank: 2 }, team2: { group: 'B', rank: 2 } },
  { match: 'Match 74', pairing: '1E vs 3A/B/C/D/F', team1: { group: 'E', rank: 1 }, thirdPlacePriority: ['A', 'B', 'C', 'D', 'F'] },
  { match: 'Match 75', pairing: '1F vs 2C', team1: { group: 'F', rank: 1 }, team2: { group: 'C', rank: 2 } },
  { match: 'Match 76', pairing: '1C vs 2F', team1: { group: 'C', rank: 1 }, team2: { group: 'F', rank: 2 } },
  { match: 'Match 77', pairing: '1I vs 3C/D/F/G/H', team1: { group: 'I', rank: 1 }, thirdPlacePriority: ['C', 'D', 'F', 'G', 'H'] },
  { match: 'Match 78', pairing: '2E vs 2I', team1: { group: 'E', rank: 2 }, team2: { group: 'I', rank: 2 } },
  { match: 'Match 79', pairing: '1A vs 3C/E/F/H/I', team1: { group: 'A', rank: 1 }, thirdPlacePriority: ['C', 'E', 'F', 'H', 'I'] },
  { match: 'Match 80', pairing: '1L vs 3E/H/I/J/K', team1: { group: 'L', rank: 1 }, thirdPlacePriority: ['E', 'H', 'I', 'J', 'K'] },
  { match: 'Match 81', pairing: '1D vs 3B/E/F/I/J', team1: { group: 'D', rank: 1 }, thirdPlacePriority: ['B', 'E', 'F', 'I', 'J'] },
  { match: 'Match 82', pairing: '1G vs 3A/E/H/I/J', team1: { group: 'G', rank: 1 }, thirdPlacePriority: ['A', 'E', 'H', 'I', 'J'] },
  { match: 'Match 83', pairing: '2K vs 2L', team1: { group: 'K', rank: 2 }, team2: { group: 'L', rank: 2 } },
  { match: 'Match 84', pairing: '1H vs 2J', team1: { group: 'H', rank: 1 }, team2: { group: 'J', rank: 2 } },
  { match: 'Match 85', pairing: '1B vs 3E/F/G/I/J', team1: { group: 'B', rank: 1 }, thirdPlacePriority: ['E', 'F', 'G', 'I', 'J'] },
  { match: 'Match 86', pairing: '1J vs 2H', team1: { group: 'J', rank: 1 }, team2: { group: 'H', rank: 2 } },
  { match: 'Match 87', pairing: '1K vs 3D/E/I/J/L', team1: { group: 'K', rank: 1 }, thirdPlacePriority: ['D', 'E', 'I', 'J', 'L'] },
  { match: 'Match 88', pairing: '2D vs 2G', team1: { group: 'D', rank: 2 }, team2: { group: 'G', rank: 2 } }
];

export function getGroupIdFromLetter(letter) {
  return LETTER_TO_GROUP_ID[letter] || null;
}

export function getGroupLetterFromId(groupId) {
  return GROUP_ID_TO_LETTER[groupId] || null;
}

export function parseGroupLetter(groupName = '') {
  const match = groupName.match(/Group\s+([A-L])/i);
  return match ? match[1].toUpperCase() : null;
}

export function rankTeamsInGroup(group) {
  const teams = Object.entries(group?.teams || {});
  const noMatchesPlayed = teams.every(([, team]) => team.P === 0);

  if (noMatchesPlayed) {
    return teams
      .map(([id, team]) => ({ id, ...team }))
      .sort((a, b) => (a['#'] || 0) - (b['#'] || 0));
  }

  return teams
    .map(([id, team]) => ({
      id,
      ...team,
      calculatedPoints: (team.W || 0) * 3 + (team.D || 0),
      goalDifference: (team.goalsScored || 0) - (team.goalsReceived || 0)
    }))
    .sort((a, b) => (
      (b.calculatedPoints || 0) - (a.calculatedPoints || 0) ||
      (b.goalDifference || 0) - (a.goalDifference || 0) ||
      (b.goalsScored || 0) - (a.goalsScored || 0)
    ));
}

export function getTeamByRankFromGroup(group, rank) {
  return rankTeamsInGroup(group)[rank - 1] || null;
}

export function getQualifiedThirdPlaceTeams(groups) {
  const thirdPlaceTeams = GROUP_LETTERS.map(letter => {
    const groupId = getGroupIdFromLetter(letter);
    const group = groups[groupId];
    const thirdPlaceTeam = getTeamByRankFromGroup(group, 3);

    if (!group || !thirdPlaceTeam?.name) {
      return null;
    }

    return {
      groupId,
      groupLetter: letter,
      groupName: group.name,
      ...thirdPlaceTeam
    };
  }).filter(Boolean);

  return thirdPlaceTeams
    .sort((a, b) => (
      (b.calculatedPoints || 0) - (a.calculatedPoints || 0) ||
      (b.goalDifference || 0) - (a.goalDifference || 0) ||
      (b.goalsScored || 0) - (a.goalsScored || 0)
    ))
    .slice(0, 8);
}

function assignThirdPlaceTeams(qualifiedThirdPlaceTeams) {
  const qualifiedByGroup = new Map(
    qualifiedThirdPlaceTeams.map(team => [team.groupLetter, team])
  );

  const thirdPlaceRules = ROUND_OF_32_RULES.filter(rule => rule.thirdPlacePriority);
  const assignments = {};

  function backtrack(ruleIndex, usedGroups) {
    if (ruleIndex === thirdPlaceRules.length) {
      return true;
    }

    const rule = thirdPlaceRules[ruleIndex];
    const candidateGroups = rule.thirdPlacePriority.filter(groupLetter => (
      qualifiedByGroup.has(groupLetter) && !usedGroups.has(groupLetter)
    ));

    for (const candidateGroup of candidateGroups) {
      usedGroups.add(candidateGroup);
      assignments[rule.match] = qualifiedByGroup.get(candidateGroup);

      if (backtrack(ruleIndex + 1, usedGroups)) {
        return true;
      }

      usedGroups.delete(candidateGroup);
      delete assignments[rule.match];
    }

    return false;
  }

  if (!backtrack(0, new Set())) {
    const qualifiedGroups = qualifiedThirdPlaceTeams.map(team => team.groupLetter).join(', ');
    throw new Error(`Unable to assign third-place teams for qualified groups: ${qualifiedGroups}`);
  }

  return assignments;
}

function getTeamFromSource(groups, source) {
  const groupId = getGroupIdFromLetter(source.group);
  const group = groups[groupId];

  if (!group) {
    return null;
  }

  return getTeamByRankFromGroup(group, source.rank);
}

export function buildRoundOf32Projection(groups) {
  const qualifiedThirdPlaceTeams = getQualifiedThirdPlaceTeams(groups);
  const thirdPlaceAssignments = assignThirdPlaceTeams(qualifiedThirdPlaceTeams);

  const matches = ROUND_OF_32_RULES.map(rule => {
    const team1 = getTeamFromSource(groups, rule.team1);
    const assignedThirdPlaceTeam = rule.thirdPlacePriority ? thirdPlaceAssignments[rule.match] : null;
    const team2 = assignedThirdPlaceTeam || getTeamFromSource(groups, rule.team2);

    if (!team1?.name || !team2?.name) {
      throw new Error(`Unable to resolve ${rule.match} (${rule.pairing})`);
    }

    return {
      match: rule.match,
      pairing: rule.pairing,
      team1: team1.name,
      team2: team2.name,
      team1Source: `${rule.team1.rank}${rule.team1.group}`,
      team2Source: rule.thirdPlacePriority
        ? `3${assignedThirdPlaceTeam.groupLetter}`
        : `${rule.team2.rank}${rule.team2.group}`,
      thirdPlaceGroupLetter: assignedThirdPlaceTeam?.groupLetter || null
    };
  });

  const opponentsByTeam = matches.reduce((acc, match) => {
    acc[match.team1] = { opponent: match.team2, match: match.match, pairing: match.pairing };
    acc[match.team2] = { opponent: match.team1, match: match.match, pairing: match.pairing };
    return acc;
  }, {});

  return {
    matches,
    qualifiedThirdPlaceTeams,
    opponentsByTeam
  };
}
