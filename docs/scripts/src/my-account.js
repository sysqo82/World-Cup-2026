import { getAssignedTeam, logoutUser, getCookie, deleteCookie } from '../utils/user-utils.js';
import { isAllowed, isRegistered } from "../navigation/navigation.js";
import { basePath } from "../config/path-config.js";
import { db, sendEmailURL } from '../config/firebase-config.js';
import { fetchCountryMap, getCountryFullName } from '../utils/country-utils.js';
import { getMatchdayMatches } from '../utils/match-scheduling.js';
import { EmailTemplate } from '../utils/email-templates.js';

// Add event listener for navigation dropdown
document.getElementById('navigation-select').addEventListener('change', navigateToPage);

document.addEventListener('DOMContentLoaded', async () => {
    await isRegistered();
    await isAllowed();

    document.getElementById('logout').addEventListener('click', logoutUser);

    await getAssignedTeam();
    await loadTeamFixtures();
    await loadEmailPreferences();
    await loadCurrentEmail();
    
    // Set up email preferences toggle
    document.getElementById('email-notifications-toggle').addEventListener('change', handleEmailPreferencesChange);
    
    // Set up change email form
    document.getElementById('change-email-form').addEventListener('submit', handleChangeEmailSubmit);
});

async function loadTeamFixtures() {
    const userDetails = getCookie('userDetails');
    if (!userDetails) return;

    const userDetailsObj = JSON.parse(userDetails);
    const assignedTeam = userDetailsObj.assignedTeam;
    
    if (!assignedTeam || assignedTeam === 'Pending' || assignedTeam === 'No team assigned yet') {
        document.getElementById('fixtures-loading').textContent = 'No team assigned yet.';
        return;
    }

    try {
        const countryMap = await fetchCountryMap();
        
        // Load fixtures for each stage
        await loadGroupStageFixtures(assignedTeam, countryMap);
        await loadKnockoutFixtures(assignedTeam, countryMap);
        
        document.getElementById('fixtures-loading').style.display = 'none';
    } catch (error) {
        console.error('Error loading team fixtures:', error);
        document.getElementById('fixtures-loading').textContent = 'Error loading fixtures.';
    }
}

async function loadGroupStageFixtures(teamName, countryMap) {
    try {
        // Get the team's short name for database lookup
        const teamShortName = getTeamShortName(teamName, countryMap);
        
        // Find which group the team is in
        const groupsSnapshot = await db.collection('groups').get();
        let teamGroup = null;
        
        groupsSnapshot.forEach(doc => {
            const groupData = doc.data();
            if (groupData.teams) {
                Object.values(groupData.teams).forEach(team => {
                    const teamNameVariant = team.name || team.Name;
                    if (teamNameVariant === teamShortName) {
                        teamGroup = { id: doc.id, ...groupData };
                    }
                });
            }
        });

        if (!teamGroup) {
            console.log('Team not found in any group');
            return;
        }

        const groupStageSection = document.getElementById('group-stage-section');
        const groupStageBody = document.getElementById('group-stage-table').querySelector('tbody');
        
        // Generate all possible matches for the team in their group using the same logic as group-stage page
        const groupTeams = Object.entries(teamGroup.teams).map(([id, team]) => ({
            id,
            name: team.name || team.Name || 'Unknown',
            initialRank: parseInt(id.replace('team', ''), 10) || 0
        })).sort((a, b) => a.initialRank - b.initialRank);
        
        // Find our team in the sorted group
        const myTeamData = groupTeams.find(team => team.name === teamShortName);
        if (!myTeamData || groupTeams.length < 4) return;
        
        let hasMatches = false;
        const matchdays = ['matchday1', 'matchday2', 'matchday3'];
        
        // Process each matchday using the predetermined fixture schedule
        matchdays.forEach((matchday, matchdayIndex) => {
            // Get the predetermined matches for this matchday
            const matchdayFixtures = getMatchdayMatches(matchday, groupTeams);
            
            // Find matches involving our team
            matchdayFixtures.forEach(fixture => {
                if (fixture.team1.name === teamShortName || fixture.team2.name === teamShortName) {
                    hasMatches = true;
                    
                    // Check if this match exists in the database with scores
                    let matchData = null;
                    let matchKey = null;
                    
                    if (teamGroup.matchdays && teamGroup.matchdays[matchday]) {
                        const matches = teamGroup.matchdays[matchday];
                        
                        // Look for this specific match in the database
                        Object.entries(matches).forEach(([key, data]) => {
                            const [leftTeamId, rightTeamId] = key.split('_');
                            if ((leftTeamId === fixture.team1.id && rightTeamId === fixture.team2.id) ||
                                (leftTeamId === fixture.team2.id && rightTeamId === fixture.team1.id)) {
                                matchData = data;
                                matchKey = key;
                            }
                        });
                    }
                    
                    const myTeamIsLeft = fixture.team1.name === teamShortName;
                    
                    const row = createGroupStageFixtureRow(
                        `Matchday ${matchdayIndex + 1}`,
                        fixture.team1.name,
                        fixture.team2.name,
                        matchData,
                        matchKey,
                        fixture.team1.id,
                        fixture.team2.id,
                        teamShortName,
                        countryMap,
                        myTeamIsLeft
                    );
                    groupStageBody.appendChild(row);
                }
            });
        });

        // Process each matchday using the same logic as group-stage page
        for (let matchdayNumber = 1; matchdayNumber <= 3; matchdayNumber++) {
            const matchdayString = `matchday${matchdayNumber}`;
            const matchdayMatches = getMatchdayMatches(groupTeams, matchdayString);
            
            // Check if our team plays in this matchday
            const ourMatch = matchdayMatches.find(match => 
                match.team1Name === teamShortName || match.team2Name === teamShortName
            );
            
            if (ourMatch) {
                hasMatches = true;
                
                // Check if this match exists in database
                let matchData = null;
                let matchKey = null;
                
                if (teamGroup.matchdays && teamGroup.matchdays[matchdayString]) {
                    const matches = teamGroup.matchdays[matchdayString];
                    // Find the match key for our teams
                    Object.entries(matches).forEach(([key, data]) => {
                        const [leftTeamId, rightTeamId] = key.split('_');
                        const leftTeam = teamGroup.teams[leftTeamId];
                        const rightTeam = teamGroup.teams[rightTeamId];
                        
                        if (leftTeam && rightTeam) {
                            const leftTeamName = leftTeam.name || leftTeam.Name;
                            const rightTeamName = rightTeam.name || rightTeam.Name;
                            
                            if ((leftTeamName === ourMatch.team1Name && rightTeamName === ourMatch.team2Name) ||
                                (leftTeamName === ourMatch.team2Name && rightTeamName === ourMatch.team1Name)) {
                                matchData = data;
                                matchKey = key;
                            }
                        }
                    });
                }
                
                const myTeamIsLeft = ourMatch.team1Name === teamShortName;
                
                const row = createGroupStageFixtureRow(
                    `Matchday ${matchdayNumber}`,
                    ourMatch.team1Name,
                    ourMatch.team2Name,
                    matchData,
                    matchKey,
                    ourMatch.team1Id,
                    ourMatch.team2Id,
                    teamShortName,
                    countryMap,
                    myTeamIsLeft
                );
                groupStageBody.appendChild(row);
            }
        }

        if (hasMatches) {
            // Check if all 3 matches have been played and add qualification status
            const allMatchesPlayed = checkAllMatchesPlayed(teamGroup, teamShortName);
            if (allMatchesPlayed) {
                addQualificationStatus(groupStageSection, teamGroup, teamShortName, teamName);
            }
            
            groupStageSection.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Error loading group stage fixtures:', error);
    }
}

function checkAllMatchesPlayed(teamGroup, teamShortName) {
    // Check if the team has played all 3 matches (P = 3)
    if (teamGroup.teams) {
        for (const [teamId, team] of Object.entries(teamGroup.teams)) {
            const teamName = team.name || team.Name;
            if (teamName === teamShortName) {
                return (team.P || 0) >= 3;
            }
        }
    }
    return false;
}

function addKnockoutProgressionStatus(stageSection, matchData, teamShortName, teamFullName, stageName) {
    // Check if the team won this knockout match
    const teamWon = matchData.winner === teamShortName;
    
    // Define next stage for progression message
    const nextStageMap = {
        'Round of 16': 'Quarter Finals',
        'Quarter Finals': 'Semi Finals', 
        'Semi Finals': 'Final',
        'Final': 'World Cup Champions',
        'Third Place Playoff': '3rd Place'
    };
    
    const nextStage = nextStageMap[stageName];
    
    // Create the progression status element
    const progressionDiv = document.createElement('div');
    progressionDiv.className = 'qualification-status';
    
    if (teamWon) {
        progressionDiv.classList.add('qualified');
        
        if (stageName === 'Final') {
            progressionDiv.textContent = `🏆 ${teamFullName} are the World Cup Champions! 🏆`;
        } else if (stageName === 'Third Place Playoff') {
            progressionDiv.textContent = `🥉 ${teamFullName} finished 3rd in the World Cup! 🥉`;
        } else {
            progressionDiv.textContent = `🎉 ${teamFullName} advanced to the ${nextStage}! 🎉`;
        }
    } else {
        progressionDiv.classList.add('eliminated');
        
        if (stageName === 'Final') {
            progressionDiv.textContent = `${teamFullName} finished as runners-up in the World Cup`;
        } else if (stageName === 'Third Place Playoff') {
            progressionDiv.textContent = `${teamFullName} finished 4th in the World Cup`;
        } else {
            progressionDiv.textContent = `${teamFullName} was eliminated in the ${stageName}`;
        }
    }
    
    // Add it to the stage section
    stageSection.appendChild(progressionDiv);
}

function addQualificationStatus(groupStageSection, teamGroup, teamShortName, teamFullName) {
    // Import the getTeamByRank function logic to calculate ranking
    const teams = Object.entries(teamGroup.teams || {});
    
    // Sort teams by current ranking (points, goal difference, goals scored)
    const sortedTeams = teams
        .map(([id, team]) => ({
            id,
            ...team,
            calculatedPoints: (team.W || 0) * 3 + (team.D || 0),
            goalDifference: (team.goalsScored || 0) - (team.goalsReceived || 0)
        }))
        .sort((a, b) => {
            return (
                b.calculatedPoints - a.calculatedPoints ||
                b.goalDifference - a.goalDifference ||
                b.goalsScored - a.goalsScored
            );
        });
    
    // Find the team's rank
    const teamRank = sortedTeams.findIndex(team => {
        const teamName = team.name || team.Name;
        return teamName === teamShortName;
    }) + 1;
    
    // Determine qualification status
    const qualified = teamRank <= 2;
    const qualificationText = qualified ? "made it" : "didn't make it";
    
    // Get rank ordinal (1st, 2nd, 3rd, 4th)
    const getRankOrdinal = (rank) => {
        const suffixes = ["th", "st", "nd", "rd"];
        const v = rank % 100;
        return rank + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
    };
    
    // Create the qualification status element
    const qualificationDiv = document.createElement('div');
    qualificationDiv.className = 'qualification-status';
    
    // Add qualified or eliminated class
    if (qualified) {
        qualificationDiv.classList.add('qualified');
    } else {
        qualificationDiv.classList.add('eliminated');
    }
    
    qualificationDiv.textContent = `${teamFullName} finished ${getRankOrdinal(teamRank)} and ${qualificationText} to the Round of 16`;
    
    // Add it to the group stage section
    groupStageSection.appendChild(qualificationDiv);
}

function createGroupStageFixtureRow(matchInfo, team1, team2, matchData, matchKey, team1Id, team2Id, myTeam, countryMap, myTeamIsLeft = null) {
    const row = document.createElement('tr');
    
    // Get full team names and flag codes
    const { fullName: team1FullName } = getCountryFullName(countryMap, team1);
    const { fullName: team2FullName } = getCountryFullName(countryMap, team2);
    const team1FlagCode = countryMap[team1]?.flagCode || 'unknown';
    const team2FlagCode = countryMap[team2]?.flagCode || 'unknown';
    
    // Determine result display
    let resultDisplay = 'vs';
    let resultClass = 'pending';
    
    if (matchData && matchData.leftScore !== undefined && matchData.rightScore !== undefined && 
        matchData.leftScore !== null && matchData.rightScore !== null) {
        // Match has been played - show actual scores
        let myTeamScore, opponentScore;
        
        if (myTeamIsLeft !== null) {
            // We know which position our team is in
            if (myTeamIsLeft) {
                myTeamScore = matchData.leftScore;
                opponentScore = matchData.rightScore;
            } else {
                myTeamScore = matchData.rightScore;
                opponentScore = matchData.leftScore;
            }
        } else if (matchKey) {
            // Fall back to match key analysis
            const [leftTeamId, rightTeamId] = matchKey.split('_');
            if (leftTeamId === team1Id) {
                myTeamScore = team1 === myTeam ? matchData.leftScore : matchData.rightScore;
                opponentScore = team1 === myTeam ? matchData.rightScore : matchData.leftScore;
            } else {
                myTeamScore = team2 === myTeam ? matchData.leftScore : matchData.rightScore;
                opponentScore = team2 === myTeam ? matchData.rightScore : matchData.leftScore;
            }
        } else {
            // Default fallback
            myTeamScore = team1 === myTeam ? matchData.leftScore : matchData.rightScore;
            opponentScore = team1 === myTeam ? matchData.rightScore : matchData.leftScore;
        }
        
        resultDisplay = `${matchData.leftScore} - ${matchData.rightScore}`;
        
        // Determine win/loss/draw for our team
        if (myTeamScore > opponentScore) {
            resultClass = 'win';
        } else if (myTeamScore < opponentScore) {
            resultClass = 'loss';
        } else {
            resultClass = 'draw';
        }
        
    } else {
        // Match is scheduled but not yet played
        resultDisplay = 'vs';
        resultClass = 'pending';
    }
    
    // Format date if available
    let dateDisplay = 'TBD';
    if (matchData && matchData.date) {
        try {
            const date = new Date(matchData.date);
            dateDisplay = date.toLocaleDateString();
        } catch (e) {
            dateDisplay = matchData.date;
        }
    }
    
    row.innerHTML = `
        <td data-label="Match">${matchInfo}</td>
        <td data-label="Team 1">
            <div class="team-name ${team1 === myTeam ? 'my-team' : ''}">
                <span class="fi fi-${team1FlagCode}"></span>
                ${team1FullName}
            </div>
        </td>
        <td data-label="Result">
            <div class="match-result ${resultClass}">
                ${resultDisplay}
            </div>
        </td>
        <td data-label="Team 2">
            <div class="team-name ${team2 === myTeam ? 'my-team' : ''}">
                <span class="fi fi-${team2FlagCode}"></span>
                ${team2FullName}
            </div>
        </td>
        <td data-label="Date">${dateDisplay}</td>
    `;
    
    return row;
}

// Helper function to check if all 3 group stage matches have been played
async function hasCompletedAllGroupStageMatches(teamName, countryMap) {
    try {
        const teamShortName = getTeamShortName(teamName, countryMap);
        
        // Find which group the team is in
        const groupsSnapshot = await db.collection('groups').get();
        let teamGroup = null;
        
        groupsSnapshot.forEach(doc => {
            const groupData = doc.data();
            if (groupData.teams) {
                Object.values(groupData.teams).forEach(team => {
                    const teamNameVariant = team.name || team.Name;
                    if (teamNameVariant === teamShortName) {
                        teamGroup = { id: doc.id, ...groupData };
                    }
                });
            }
        });

        if (!teamGroup) {
            return false;
        }

        // Get all group teams
        const groupTeams = Object.entries(teamGroup.teams).map(([id, team]) => ({
            id,
            name: team.name || team.Name || 'Unknown',
            initialRank: parseInt(id.replace('team', ''), 10) || 0
        })).sort((a, b) => a.initialRank - b.initialRank);

        const myTeamData = groupTeams.find(team => team.name === teamShortName);
        if (!myTeamData) {
            return false;
        }

        let completedMatches = 0;
        const matchdays = ['matchday1', 'matchday2', 'matchday3'];
        
        // Check each matchday
        for (const matchday of matchdays) {
            const matchdayFixtures = getMatchdayMatches(matchday, groupTeams);
            
            // Find our team's match in this matchday
            const ourFixture = matchdayFixtures.find(fixture => 
                fixture.team1.name === teamShortName || fixture.team2.name === teamShortName
            );
            
            if (ourFixture && teamGroup.matchdays && teamGroup.matchdays[matchday]) {
                const matches = teamGroup.matchdays[matchday];
                
                // Check if this match has been played (has scores)
                const matchFound = Object.entries(matches).some(([key, data]) => {
                    const [leftTeamId, rightTeamId] = key.split('_');
                    if ((leftTeamId === ourFixture.team1.id && rightTeamId === ourFixture.team2.id) ||
                        (leftTeamId === ourFixture.team2.id && rightTeamId === ourFixture.team1.id)) {
                        // Match is complete if it has scores
                        return data && (data.team1Score !== undefined || data.team2Score !== undefined);
                    }
                    return false;
                });
                
                if (matchFound) {
                    completedMatches++;
                }
            }
        }
        
        // Return true only if all 3 matches have been played
        return completedMatches === 3;
    } catch (error) {
        console.error('Error checking group stage completion:', error);
        return false;
    }
}

async function loadKnockoutFixtures(teamName, countryMap) {
    const stages = [
        { collection: 'roundOf16Teams', sectionId: 'round-of-16-section', tableId: 'round-of-16-table', stageName: 'Round of 16', docId: 'matches' },
        { collection: 'quarterFinalsTeams', sectionId: 'quarter-finals-section', tableId: 'quarter-finals-table', stageName: 'Quarter Finals', docId: 'matches' },
        { collection: 'semiFinalsTeams', sectionId: 'semi-finals-section', tableId: 'semi-finals-table', stageName: 'Semi Finals', docId: 'matches' },
        { collection: 'thirdPlacePlayoffTeams', sectionId: 'third-place-section', tableId: 'third-place-table', stageName: 'Third Place Playoff', docId: 'matches' },
        { collection: 'finalTeams', sectionId: 'final-section', tableId: 'final-table', stageName: 'Final', docId: 'matches' }
    ];

    const teamShortName = getTeamShortName(teamName, countryMap);
    
    // Check if all group stage matches have been completed
    const groupStageComplete = await hasCompletedAllGroupStageMatches(teamName, countryMap);

    for (const stage of stages) {
        try {
            // Skip Round of 16 if not all group stage matches have been played
            if (stage.stageName === 'Round of 16' && !groupStageComplete) {
                continue;
            }
            
            // Get the matches document for this stage
            const docRef = await db.collection(stage.collection).doc(stage.docId).get();
            const section = document.getElementById(stage.sectionId);
            const tableBody = document.getElementById(stage.tableId).querySelector('tbody');
            let hasMatches = false;

            if (docRef.exists) {
                const data = docRef.data();
                const matches = data.matches || [];

                matches.forEach((matchData, index) => {
                    // Check if this match involves our team (actual or potential)
                    const team1 = matchData.team1;
                    const team2 = matchData.team2;
                    
                    // Check for actual team participation
                    const isActualParticipant = team1 === teamShortName || team2 === teamShortName || 
                                             team1 === teamName || team2 === teamName;
                    
                    // Check for potential participation (placeholder teams like "Winner Group A", "Runner-up Group B", etc.)
                    const isPotentialParticipant = checkPotentialParticipation(team1, team2, teamShortName, teamName);
                    
                    if (isActualParticipant || isPotentialParticipant) {
                        hasMatches = true;
                        // Use just the stage name without match numbers
                        const matchId = stage.stageName;
                        const row = createKnockoutFixtureRow(
                            matchId,
                            team1,
                            team2,
                            matchData,
                            teamShortName,
                            countryMap,
                            stage.stageName,
                            isActualParticipant
                        );
                        tableBody.appendChild(row);
                        
                        // Check if match is completed and add progression status
                        if (isActualParticipant && matchData.winner) {
                            addKnockoutProgressionStatus(section, matchData, teamShortName, teamName, stage.stageName);
                        }
                    }
                });
            }

            if (hasMatches) {
                section.classList.remove('hidden');
            }
        } catch (error) {
            console.error(`Error loading ${stage.collection} fixtures:`, error);
        }
    }
}

function checkPotentialParticipation(team1, team2, teamShortName, teamFullName) {
    // This function checks if the team could potentially participate based on group progression
    // and Round of 16 advancement
    
    // Common placeholder patterns in knockout tournaments
    const placeholderPatterns = [
        /winner.*group/i,
        /runner.*up.*group/i,
        /group.*winner/i,
        /group.*runner/i,
        /1st.*group/i,
        /2nd.*group/i,
        /winner.*of.*roundof16/i,
        /winner.*roundof16/i,
        /winner.*round.*16/i,
        /roundof16.*winner/i
    ];
    
    const checkTeamPlaceholder = (teamName) => {
        if (!teamName || typeof teamName !== 'string') return false;
        return placeholderPatterns.some(pattern => pattern.test(teamName));
    };
    
    // For Quarter Finals, also check for Round of 16 progression patterns
    const checkQuarterFinalProgression = (teamName) => {
        if (!teamName || typeof teamName !== 'string') return false;
        
        // Check if it mentions "Winner of" followed by Round of 16 match numbers
        const quarterFinalPatterns = [
            /winner.*of.*roundof16-[1-8]/i,
            /winner.*roundof16-[1-8]/i
        ];
        
        return quarterFinalPatterns.some(pattern => pattern.test(teamName));
    };
    
    // If either team is a placeholder, this could be a potential match
    const isPlaceholder = checkTeamPlaceholder(team1) || checkTeamPlaceholder(team2);
    const isQuarterFinalProgression = checkQuarterFinalProgression(team1) || checkQuarterFinalProgression(team2);
    
    return isPlaceholder || isQuarterFinalProgression;
}

function createKnockoutFixtureRow(matchInfo, team1, team2, matchData, myTeam, countryMap, stageName, isActualParticipant) {
    const row = document.createElement('tr');
    
    // Handle team names and flags
    let team1Display = team1;
    let team2Display = team2;
    let team1FlagCode = 'unknown';
    let team2FlagCode = 'unknown';
    
    if (isActualParticipant) {
        const { fullName: team1FullName } = getCountryFullName(countryMap, team1);
        const { fullName: team2FullName } = getCountryFullName(countryMap, team2);
        team1Display = team1FullName;
        team2Display = team2FullName;
        team1FlagCode = countryMap[team1]?.flagCode || 'unknown';
        team2FlagCode = countryMap[team2]?.flagCode || 'unknown';
    } else {
        // For potential matches, show the placeholder text
        team1Display = team1 || 'TBD';
        team2Display = team2 || 'TBD';
    }
    
    // Determine result display - handle knockout format (regularTime scores)
    let resultDisplay = 'TBD';
    let resultClass = 'pending';
    
    // Check for regular time scores first
    if (matchData.regularTimeTeam1Score !== undefined && matchData.regularTimeTeam1Score !== null && 
        matchData.regularTimeTeam2Score !== undefined && matchData.regularTimeTeam2Score !== null) {
        
        let team1TotalScore = matchData.regularTimeTeam1Score;
        let team2TotalScore = matchData.regularTimeTeam2Score;
        
        // Add extra time scores if they exist
        if (matchData.extraTimeTeam1Score !== undefined && matchData.extraTimeTeam1Score !== null) {
            team1TotalScore += matchData.extraTimeTeam1Score;
        }
        if (matchData.extraTimeTeam2Score !== undefined && matchData.extraTimeTeam2Score !== null) {
            team2TotalScore += matchData.extraTimeTeam2Score;
        }
        
        // If there were penalties, show the penalty score as the final result with indicator
        if (matchData.penaltyShootoutsTeam1Score !== undefined && matchData.penaltyShootoutsTeam1Score !== null) {
            resultDisplay = `${matchData.penaltyShootoutsTeam1Score} - ${matchData.penaltyShootoutsTeam2Score} (P)`;
        } else if (matchData.extraTimeTeam1Score !== undefined && matchData.extraTimeTeam1Score !== null) {
            resultDisplay = `${team1TotalScore} - ${team2TotalScore} (ET)`;
        } else {
            resultDisplay = `${team1TotalScore} - ${team2TotalScore}`;
        }
        
        // Determine win/loss for our team if this is actual participation
        if (isActualParticipant) {
            let myTeamWon = false;
            
            // Check if there's a winner field first
            if (matchData.winner) {
                myTeamWon = matchData.winner === myTeam;
            } else {
                // Determine winner based on scores (including penalties if applicable)
                if (matchData.penaltyShootoutsTeam1Score !== undefined && matchData.penaltyShootoutsTeam1Score !== null) {
                    // Penalties determine the winner
                    if (team1 === myTeam) {
                        myTeamWon = matchData.penaltyShootoutsTeam1Score > matchData.penaltyShootoutsTeam2Score;
                    } else if (team2 === myTeam) {
                        myTeamWon = matchData.penaltyShootoutsTeam2Score > matchData.penaltyShootoutsTeam1Score;
                    }
                } else {
                    // Regular/extra time scores determine the winner
                    if (team1 === myTeam) {
                        myTeamWon = team1TotalScore > team2TotalScore;
                    } else if (team2 === myTeam) {
                        myTeamWon = team2TotalScore > team1TotalScore;
                    }
                }
            }
            
            resultClass = myTeamWon ? 'win' : 'loss';
            
            // Check for draw (only in regular time, shouldn't happen in knockout)
            if (team1TotalScore === team2TotalScore && !matchData.penaltyShootoutsTeam1Score) {
                resultClass = 'draw';
            }
        }
    } else if (matchData.leftScore !== undefined && matchData.rightScore !== undefined) {
        // Fallback to old format if present
        resultDisplay = `${matchData.leftScore} - ${matchData.rightScore}`;
        
        if (isActualParticipant) {
            if (team1 === myTeam) {
                if (matchData.leftScore > matchData.rightScore) resultClass = 'win';
                else if (matchData.leftScore < matchData.rightScore) resultClass = 'loss';
                else resultClass = 'draw';
            } else if (team2 === myTeam) {
                if (matchData.rightScore > matchData.leftScore) resultClass = 'win';
                else if (matchData.rightScore < matchData.leftScore) resultClass = 'loss';
                else resultClass = 'draw';
            }
        }
    } else if (matchData.score) {
        resultDisplay = matchData.score;
    } else if (!isActualParticipant) {
        resultDisplay = 'vs';
    }
    
    // Format date if available
    let dateDisplay = 'TBD';
    if (matchData.date) {
        try {
            const date = new Date(matchData.date);
            dateDisplay = date.toLocaleDateString();
        } catch (e) {
            dateDisplay = matchData.date;
        }
    }
    
    // Add special styling for potential matches
    const potentialClass = isActualParticipant ? '' : 'potential-match';
    
    row.className = potentialClass;
    row.innerHTML = `
        <td data-label="Match">${matchInfo}</td>
        <td data-label="Team 1">
            <div class="team-name ${(team1 === myTeam && isActualParticipant) ? 'my-team' : ''}">
                ${isActualParticipant ? `<span class="fi fi-${team1FlagCode}"></span>` : '📅'}
                ${team1Display}
            </div>
        </td>
        <td data-label="Result">
            <div class="match-result ${resultClass}">
                ${resultDisplay}
            </div>
        </td>
        <td data-label="Team 2">
            <div class="team-name ${(team2 === myTeam && isActualParticipant) ? 'my-team' : ''}">
                ${isActualParticipant ? `<span class="fi fi-${team2FlagCode}"></span>` : '📅'}
                ${team2Display}
            </div>
        </td>
        <td data-label="Date">${dateDisplay}</td>
    `;
    
    return row;
}

function createFixtureRow(matchInfo, team1, team2, matchData, myTeam, countryMap) {
    const row = document.createElement('tr');
    
    // Get full team names and flag codes
    const { fullName: team1FullName } = getCountryFullName(countryMap, team1);
    const { fullName: team2FullName } = getCountryFullName(countryMap, team2);
    const team1FlagCode = countryMap[team1]?.flagCode || 'unknown';
    const team2FlagCode = countryMap[team2]?.flagCode || 'unknown';
    
    // Determine result display
    let resultDisplay = 'TBD';
    let resultClass = 'pending';
    
    if (matchData.leftScore !== undefined && matchData.rightScore !== undefined) {
        resultDisplay = `${matchData.leftScore} - ${matchData.rightScore}`;
        
        // Determine if it's a win, loss, or draw for our team
        if (team1 === myTeam) {
            if (matchData.leftScore > matchData.rightScore) resultClass = 'win';
            else if (matchData.leftScore < matchData.rightScore) resultClass = 'loss';
            else resultClass = 'draw';
        } else if (team2 === myTeam) {
            if (matchData.rightScore > matchData.leftScore) resultClass = 'win';
            else if (matchData.rightScore < matchData.leftScore) resultClass = 'loss';
            else resultClass = 'draw';
        }
    } else if (matchData.score) {
        resultDisplay = matchData.score;
        // Could add win/loss logic here if score format is standardized
    }
    
    // Format date if available
    let dateDisplay = 'TBD';
    if (matchData.date) {
        try {
            const date = new Date(matchData.date);
            dateDisplay = date.toLocaleDateString();
        } catch (e) {
            dateDisplay = matchData.date;
        }
    }
    
    row.innerHTML = `
        <td data-label="Match">${matchInfo}</td>
        <td data-label="Team 1">
            <div class="team-name ${team1 === myTeam ? 'my-team' : ''}">
                <span class="fi fi-${team1FlagCode}"></span>
                ${team1FullName}
            </div>
        </td>
        <td data-label="Result">
            <div class="match-result ${resultClass}">
                ${resultDisplay}
            </div>
        </td>
        <td data-label="Team 2">
            <div class="team-name ${team2 === myTeam ? 'my-team' : ''}">
                <span class="fi fi-${team2FlagCode}"></span>
                ${team2FullName}
            </div>
        </td>
        <td data-label="Date">${dateDisplay}</td>
    `;
    
    return row;
}

function getTeamShortName(fullTeamName, countryMap) {
    // Try to find the short name in the country map
    for (const [shortName, data] of Object.entries(countryMap)) {
        if (data.fullName === fullTeamName) {
            return shortName;
        }
    }
    
    // If not found, return the original name
    return fullTeamName;
}

// Email Preferences Functions
async function loadEmailPreferences() {
    const userDetails = getCookie('userDetails');
    if (!userDetails) return;

    try {
        const userDetailsObj = JSON.parse(userDetails);
        const userEmail = userDetailsObj.email;
        
        if (!userEmail) return;

        // Query the users collection to get current email preferences
        const usersSnapshot = await db.collection('users').where('email', '==', userEmail).get();
        
        if (!usersSnapshot.empty) {
            const userData = usersSnapshot.docs[0].data();
            const allowUpdates = userData.allowUpdates !== false; // Default to true if not set
            
            // Update the checkbox state
            document.getElementById('email-notifications-toggle').checked = allowUpdates;
        }
    } catch (error) {
        console.error('Error loading email preferences:', error);
        showStatusMessage('Failed to load email preferences', 'error');
    }
}

async function handleEmailPreferencesChange(event) {
    const userDetails = getCookie('userDetails');
    if (!userDetails) return;

    const isChecked = event.target.checked;
    
    try {
        showStatusMessage('Updating preferences...', 'loading');
        
        const userDetailsObj = JSON.parse(userDetails);
        const userEmail = userDetailsObj.email;
        
        if (!userEmail) {
            throw new Error('User email not found');
        }

        // Find the user document
        const usersSnapshot = await db.collection('users').where('email', '==', userEmail).get();
        
        if (usersSnapshot.empty) {
            throw new Error('User not found in database');
        }

        // Update the allowUpdates field
        const userDoc = usersSnapshot.docs[0];
        await userDoc.ref.update({
            allowUpdates: isChecked
        });

        // Show success message
        const message = isChecked 
            ? 'Email notifications enabled successfully' 
            : 'Email notifications disabled successfully';
        showStatusMessage(message, 'success');
        
        // Hide the message after 5 seconds
        setTimeout(() => {
            hideStatusMessage();
        }, 5000);

    } catch (error) {
        console.error('Error updating email preferences:', error);
        showStatusMessage('Failed to update preferences. Please try again.', 'error');
        
        // Revert the checkbox state
        event.target.checked = !isChecked;
    }
}

function showStatusMessage(message, type) {
    const statusElement = document.getElementById('notification-status');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
}

function hideStatusMessage() {
    const statusElement = document.getElementById('notification-status');
    statusElement.style.display = 'none';
    statusElement.className = 'status-message';
}

// Change Email Functions
async function loadCurrentEmail() {
    const userDetails = getCookie('userDetails');
    if (!userDetails) return;

    try {
        const userDetailsObj = JSON.parse(userDetails);
        const currentEmailInput = document.getElementById('current-email');
        if (currentEmailInput) {
            currentEmailInput.value = userDetailsObj.email || '';
        }
    } catch (error) {
        console.error('Error loading current email:', error);
    }
}

async function handleChangeEmailSubmit(event) {
    event.preventDefault();
    
    const userDetails = getCookie('userDetails');
    if (!userDetails) return;

    const newEmail = document.getElementById('new-email').value.trim().toLowerCase();
    const changeEmailButton = document.getElementById('change-email-button');
    
    if (!newEmail) {
        showChangeEmailStatus('Please enter a new email address', 'error');
        return;
    }

    try {
        const userDetailsObj = JSON.parse(userDetails);
        const currentEmail = userDetailsObj.email;

        if (newEmail === currentEmail) {
            showChangeEmailStatus('New email must be different from current email', 'error');
            return;
        }

        // Check if new email already exists
        const existingUserSnapshot = await db.collection('users').where('email', '==', newEmail).get();
        if (!existingUserSnapshot.empty) {
            showChangeEmailStatus('This email is already registered', 'error');
            return;
        }

        changeEmailButton.disabled = true;
        changeEmailButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending verification...';
        
        // Request verification code via sendEmail endpoint with type "emailChange"
        const response = await fetch(sendEmailURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'emailChange',
                email: currentEmail,
                newEmail: newEmail,
                requestCode: true
            }),
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(errorMessage);
        }

        const result = await response.json();

        // Show verification form
        showEmailVerificationForm(currentEmail, newEmail);

        changeEmailButton.disabled = false;
        changeEmailButton.innerHTML = 'Change Email';

    } catch (error) {
        console.error('Error initiating email change:', error);
        showChangeEmailStatus('Failed to send verification email. Please try again.', 'error');
        changeEmailButton.disabled = false;
        changeEmailButton.innerHTML = 'Change Email';
    }
}

function showEmailVerificationForm(currentEmail, newEmail) {
    const formContainer = document.getElementById('change-email-form-container');
    
    // Use the template from EmailTemplate class
    formContainer.innerHTML = EmailTemplate.generateEmailVerificationForm(newEmail);

    // Handle verification form submission
    const verificationForm = document.getElementById('email-verification-form');
    const verifyButton = document.getElementById('verify-email-button');
    const resendButton = document.getElementById('resend-email-code-button');
    const cancelButton = document.getElementById('cancel-email-change-button');

    verificationForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        await handleEmailVerificationSubmit(currentEmail, newEmail, verifyButton);
    });

    resendButton.addEventListener('click', async () => {
        await resendEmailVerificationCode(newEmail, resendButton);
    });

    cancelButton.addEventListener('click', () => {
        window.location.reload();
    });

    // Auto-focus on verification code input
    document.getElementById('email-verification-code').focus();
}

async function handleEmailVerificationSubmit(currentEmail, newEmail, verifyButton) {
    const verificationCode = document.getElementById('email-verification-code').value.trim();
    const statusElement = document.getElementById('email-verification-status');
    
    if (!verificationCode || verificationCode.length !== 6) {
        statusElement.textContent = 'Please enter a valid 6-digit verification code.';
        statusElement.className = 'status-message error';
        return;
    }

    verifyButton.disabled = true;
    verifyButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verifying...';

    try {
        // Verify code and change email via sendEmail endpoint with type "emailChange"
        const response = await fetch(sendEmailURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'emailChange',
                email: currentEmail,
                newEmail: newEmail,
                verificationCode: verificationCode
            }),
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(errorMessage);
        }

        const result = await response.json();

        // Success - log the user out
        statusElement.textContent = 'Email changed successfully! Logging out...';
        statusElement.className = 'status-message success';

        // Delete the cookie and redirect after 2 seconds
        setTimeout(() => {
            deleteCookie('userDetails');
            window.location.href = `${basePath}index.html`;
        }, 2000);

    } catch (error) {
        console.error('Error verifying email change:', error);
        statusElement.textContent = error.message || 'Invalid verification code. Please try again.';
        statusElement.className = 'status-message error';
        verifyButton.disabled = false;
        verifyButton.innerHTML = 'Verify & Change Email';
    }
}

async function resendEmailVerificationCode(email, resendButton) {
    const userDetails = getCookie('userDetails');
    if (!userDetails) return;

    resendButton.disabled = true;
    resendButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';

    try {
        const userDetailsObj = JSON.parse(userDetails);
        const currentEmail = userDetailsObj.email;

        // Request new verification code via sendEmail endpoint with type "emailChange"
        const response = await fetch(sendEmailURL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'emailChange',
                email: currentEmail,
                newEmail: email,
                requestCode: true
            }),
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(errorMessage);
        }

        const statusElement = document.getElementById('email-verification-status');
        statusElement.textContent = 'New verification code sent to your new email address.';
        statusElement.className = 'status-message success';

        resendButton.disabled = false;
        resendButton.innerHTML = 'Resend Code';
    } catch (error) {
        console.error('Error resending verification code:', error);
        const statusElement = document.getElementById('email-verification-status');
        statusElement.textContent = 'Failed to resend verification code. Please try again.';
        statusElement.className = 'status-message error';
        resendButton.disabled = false;
        resendButton.innerHTML = 'Resend Code';
    }
}

function showChangeEmailStatus(message, type) {
    const statusElement = document.getElementById('change-email-status');
    statusElement.textContent = message;
    statusElement.className = `status-message ${type}`;
    statusElement.style.display = 'block';
}
