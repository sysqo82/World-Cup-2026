import { chronologicalMatches } from './match-schedule-constants.js';

// Match scheduling utility functions for World Cup 2026
// Contains the fixture generation logic without DOM dependencies

export function getScheduledMatchdayMatches(groupId, teams, matchday) {
    if (!groupId || !Array.isArray(teams) || teams.length < 4 || !matchday) {
        return [];
    }

    const teamLookup = new Map(
        teams
            .map(team => [team.name || team.Name, team])
            .filter(([name]) => Boolean(name))
    );

    const matchdayIndex = {
        matchday1: 0,
        matchday2: 1,
        matchday3: 2
    }[matchday];

    if (matchdayIndex === undefined) {
        return [];
    }

    const scheduledMatches = chronologicalMatches
        .filter(match => match.group === groupId)
        .sort((a, b) => {
            const kickoffA = new Date(`${a.date}T${a.time}:00`);
            const kickoffB = new Date(`${b.date}T${b.time}:00`);
            const timeCompare = kickoffA - kickoffB;

            if (timeCompare !== 0) {
                return timeCompare;
            }

            return a.team1.localeCompare(b.team1) || a.team2.localeCompare(b.team2);
        })
        .slice(matchdayIndex * 2, (matchdayIndex + 1) * 2);

    return scheduledMatches
        .map(match => {
            const team1 = teamLookup.get(match.team1);
            const team2 = teamLookup.get(match.team2);

            if (!team1 || !team2) {
                return null;
            }

            return {
                team1,
                team2,
                team1Name: team1.name || team1.Name,
                team2Name: team2.name || team2.Name,
                team1Id: team1.id,
                team2Id: team2.id,
                date: match.date,
                time: match.time
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            const timeCompare = a.time.localeCompare(b.time);
            if (timeCompare !== 0) {
                return timeCompare;
            }

            return a.team1Name.localeCompare(b.team1Name);
        });
}

/**
 * Generate matchday fixtures for a group of teams
 * @param {Array} teams - Array of team objects with id and name/Name properties, sorted by initial rank
 * @param {string} matchday - The matchday string ('matchday1', 'matchday2', or 'matchday3')
 * @returns {Array} Array of match objects with team1Name, team2Name, team1Id, team2Id
 */
export function getMatchdayMatches(teams, matchday) {
    if (!teams || teams.length < 4) {
        return [];
    }

    const matches = [];

    // Use the exact same logic as group-stage.js
    switch (matchday) {
        case 'matchday1':
            return [
                { 
                    team1Name: teams[0].name || teams[0].Name,
                    team2Name: teams[1].name || teams[1].Name,
                    team1Id: teams[0].id,
                    team2Id: teams[1].id
                },
                { 
                    team1Name: teams[2].name || teams[2].Name,
                    team2Name: teams[3].name || teams[3].Name,
                    team1Id: teams[2].id,
                    team2Id: teams[3].id
                }
            ];
        case 'matchday2':
            return [
                { 
                    team1Name: teams[0].name || teams[0].Name,
                    team2Name: teams[2].name || teams[2].Name,
                    team1Id: teams[0].id,
                    team2Id: teams[2].id
                },
                { 
                    team1Name: teams[1].name || teams[1].Name,
                    team2Name: teams[3].name || teams[3].Name,
                    team1Id: teams[1].id,
                    team2Id: teams[3].id
                }
            ];
        case 'matchday3':
            return [
                { 
                    team1Name: teams[0].name || teams[0].Name,
                    team2Name: teams[3].name || teams[3].Name,
                    team1Id: teams[0].id,
                    team2Id: teams[3].id
                },
                { 
                    team1Name: teams[1].name || teams[1].Name,
                    team2Name: teams[2].name || teams[2].Name,
                    team1Id: teams[1].id,
                    team2Id: teams[2].id
                }
            ];
        default:
            return [];
    }
}
