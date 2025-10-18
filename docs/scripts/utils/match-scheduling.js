// Match scheduling utility functions for World Cup 2026
// Contains the fixture generation logic without DOM dependencies

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