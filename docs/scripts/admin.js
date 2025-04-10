// Import Firebase configuration and services
import { db, auth } from '../scripts/firebase-config.js';

// Check authentication state on page load
auth.onAuthStateChanged(user => {
    const logoutButton = document.getElementById('logout-button');
    const authContainer = document.getElementById('auth-container');
    const adminContent = document.getElementById('admin-content');

    if (user) {
        // User is logged in
        authContainer.style.display = 'none';
        adminContent.style.display = 'block';
        logoutButton.style.display = 'block';

        // Fetch groups
        fetchGroups();
    } else {
        // User is not logged in
        authContainer.style.display = 'block';
        adminContent.style.display = 'none';
        logoutButton.style.display = 'none';
    }
});

// Handle login
document.getElementById('login-button').addEventListener('click', () => {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    auth.signInWithEmailAndPassword(email, password)
        .then(userCredential => {
            console.log(`Logged in as: ${userCredential.user.email}`);
            window.location.href = './admin.html';
        })
        .catch(error => {
            console.error('Error during login:', error);
            document.getElementById('auth-error').style.display = 'block';
        });
});

// Handle logout
document.getElementById('logout-button').addEventListener('click', () => {
    auth.signOut()
        .then(() => {
            location.reload(); // Reload the page to show the login form
        })
        .catch(err => {
            console.error('Error during logout:', err);
            alert('Failed to log out. Please try again.');
        });
});

// Add event listener for the "Generate Round of 16" button
document.getElementById('generate-round-of-16').addEventListener('click', async () => {
    try {
        // Fetch the current state of the groups
        const groupsSnapshot = await db.collection('groups').get();
        const groups = groupsSnapshot.docs.reduce((acc, doc) => {
            acc[doc.id] = doc.data();
            return acc;
        }, {});

        // Define the match rules for the Round of 16
        const matchRules = [
            { match: '1A vs. 2B', group1: 'group1', group2: 'group2' },
            { match: '1C vs. 2D', group1: 'group3', group2: 'group4' },
            { match: '1E vs. 2F', group1: 'group5', group2: 'group6' },
            { match: '1G vs. 2H', group1: 'group7', group2: 'group8' },
            { match: '1B vs. 2A', group1: 'group2', group2: 'group1' },
            { match: '1D vs. 2C', group1: 'group4', group2: 'group3' },
            { match: '1F vs. 2E', group1: 'group6', group2: 'group5' },
            { match: '1H vs. 2G', group1: 'group8', group2: 'group7' }
        ];

        // Prepare the Round of 16 structure
        const roundOf16Teams = matchRules.map(rule => {
            const group1 = groups[rule.group1];
            const group2 = groups[rule.group2];

            // Ensure both groups exist
            if (!group1 || !group2) {
                console.warn(`Missing data for groups: ${rule.group1} or ${rule.group2}`);
                return null; // Skip this match if data is missing
            }

            // Get the winner and runner-up from each group
            const team1 = getTeamByRank(group1, 1); // Winner of group1
            const team2 = getTeamByRank(group2, 2); // Runner-up of group2

            return {
                match: rule.match,
                team1: team1.name || 'Unknown',
                team2: team2.name || 'Unknown',
                type: 'regular',
                regularTimeTeam1Score: null,
                regularTimeTeam2Score: null,
                extraTimeTeam1Score: null,
                extraTimeTeam2Score: null,
                penaltyShootoutsTeam1Score: null,
                penaltyShootoutsTeam2Score: null,
                winner: null,
                loser: null,
                displayExtraTime: false,
                displayPenaltyShootouts: false,
            };
        }).filter(match => match !== null); // Remove any null matches

        // Save the Round of 16 structure to Firestore
        await db.collection('roundOf16Teams').doc('matches').set({ matches: roundOf16Teams });
        alert('Round of 16 structure generated successfully!');
    } catch (error) {
        console.error('Error generating Round of 16 structure:', error);
        alert('Failed to generate Round of 16 structure. Please try again.');
    }
});


// Add event listener for the "Generate Quarter Finals" button
document.getElementById('generate-quarter-finals').addEventListener('click', async () => {
    try {
        // Fetch the Round of 16 matches
        const roundOf16Snapshot = await db.collection('roundOf16Teams').doc('matches').get();
        const roundOf16Data = roundOf16Snapshot.data();

        if (!roundOf16Data || !roundOf16Data.matches) {
            console.warn('No Round of 16 matches found in Firestore.');
            alert('No Round of 16 matches available. Please generate them first.');
            return;
        }

        const roundOf16Matches = roundOf16Data.matches;

        // Define the match rules for the Quarter Finals
        const matchRules = [
            { match: 'Winner of roundOf16-1 vs. Winner of roundOf16-2', match1: 0, match2: 1 },
            { match: 'Winner of roundOf16-3 vs. Winner of roundOf16-4', match1: 2, match2: 3 },
            { match: 'Winner of roundOf16-5 vs. Winner of roundOf16-6', match1: 4, match2: 5 },
            { match: 'Winner of roundOf16-7 vs. Winner of roundOf16-8', match1: 6, match2: 7 }
        ];

        // Prepare the Quarter Finals structure
        const quarterFinalsTeams = matchRules.map(rule => {
            const match1Winner = roundOf16Matches[rule.match1]?.winner;
            const match2Winner = roundOf16Matches[rule.match2]?.winner;
        
            // Debugging: Log the winners
            console.log(`Match ${rule.match1} Winner:`, match1Winner);
            console.log(`Match ${rule.match2} Winner:`, match2Winner);
        
            // Ensure both winners exist
            if (!match1Winner || !match2Winner) {
                console.warn(`Missing winners for matches: ${rule.match1} or ${rule.match2}`);
                return null; // Skip this match if data is missing
            }
            
            // Handle cases where the winner is a string
            const team1Name = typeof match1Winner === 'string' ? match1Winner : match1Winner.name || 'Unknown';
            const team2Name = typeof match2Winner === 'string' ? match2Winner : match2Winner.name || 'Unknown';

            return {
                match: rule.match,
                team1: team1Name,
                team2: team2Name,
                type: 'regular',
                regularTimeTeam1Score: null,
                regularTimeTeam2Score: null,
                extraTimeTeam1Score: null,
                extraTimeTeam2Score: null,
                penaltyShootoutsTeam1Score: null,
                penaltyShootoutsTeam2Score: null,
                winner: null,
                loser: null,
                displayExtraTime: false,
                displayPenaltyShootouts: false,
            };
        }).filter(match => match !== null); // Remove any null matches

        // Save the Quarter Finals structure to Firestore
        await db.collection('quarterFinalsTeams').doc('matches').set({ matches: quarterFinalsTeams });
        alert('Quarter Finals structure generated successfully!');
    } catch (error) {
        console.error('Error generating Quarter Finals structure:', error);
        alert('Failed to generate Quarter Finals structure. Please try again.');
    }
});         

// Helper function to get a team by rank
function getTeamByRank(group, rank) {
    const teams = Object.entries(group.teams || {});

    // Check if no matches have been played (P = 0 for all teams)
    const noMatchesPlayed = teams.every(([, team]) => team.P === 0);

    if (noMatchesPlayed) {
        // Sort by initial rank (mapped to #)
        const sortedByInitialRank = teams.sort(([, a], [, b]) => (a['#'] || 0) - (b['#'] || 0));
        return sortedByInitialRank[rank - 1]?.[1] || {}; // Return the team at the given rank
    } else {
        // Sort by current ranking (points, goal difference, goals scored)
        const sortedByCurrentRank = teams
            .map(([id, team]) => ({
                id,
                ...team,
                goalDifference: (team.goalsScored || 0) - (team.goalsReceived || 0)
            }))
            .sort((a, b) => {
                return (
                    b.points - a.points || // Sort by points
                    b.goalDifference - a.goalDifference || // Then by goal difference
                    b.goalsScored - a.goalsScored // Then by goals scored
                );
            });

        return sortedByCurrentRank[rank - 1] || {}; // Return the team at the given rank
    }
}

// Fetch all groups and populate the dropdown
function fetchGroups() {
    db.collection('groups').get()
        .then(groupsSnapshot => {
            if (groupsSnapshot.empty) {
                console.warn('No groups found in Firestore.');
                alert('No groups available. Please add groups to the database.');
                return;
            }

            const groups = groupsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            populateGroupDropdown(groups);
        })
        .catch(err => {
            console.error('Error fetching groups:', err);
            alert('Failed to fetch groups. Please check your Firestore configuration or network connection.');
        });
}

// Populate the dropdown with groups
function populateGroupDropdown(groups) {
    const groupSelect = document.getElementById('navigation-select');
    if (!groupSelect) {
        console.error('Dropdown element with ID "navigation-select" not found.');
        return;
    }

    groups.forEach(group => {
        if (group.name) {
            const option = document.createElement('option');
            option.value = group.id;
            option.textContent = group.name;
            groupSelect.appendChild(option);
        }
    });

    // Add event listener for group selection
    groupSelect.addEventListener('change', (event) => {
        const selectedGroupId = event.target.value;
        if (selectedGroupId) {
            const selectedGroup = groups.find(group => group.id === selectedGroupId);
            displayTeams(selectedGroup);
        } else {
            document.getElementById('teams-container').innerHTML = ''; // Clear teams list
        }
    });
}

// Display teams for the selected group
function displayTeams(group) {
    const teamsContainer = document.getElementById('teams-container');
    if (!teamsContainer) {
        console.error('Teams container element with ID "teams-container" not found.');
        return;
    }

    teamsContainer.innerHTML = ''; // Clear previous teams

    if (group.teams && typeof group.teams === 'object') {
        const sortedTeams = Object.entries(group.teams).sort(([, a], [, b]) => (a['#'] || 0) - (b['#'] || 0));

        sortedTeams.forEach(([teamId, team], index) => {
            const teamDiv = document.createElement('div');
            teamDiv.style.marginBottom = '20px';

            teamDiv.innerHTML = `
                <label>Rank ${index + 1}:</label>
                <input type="text" id="name-${teamId}" value="${team.name || 'Unknown'}" style="margin-right: 10px;">
                <button class="submit-button" onclick="updateTeam('${group.id}', '${teamId}')">Update</button>
            `;

            teamsContainer.appendChild(teamDiv);
        });
    } else {
        console.warn(`No teams found for group: ${group.name}`);
        teamsContainer.innerHTML = '<p>No teams found for this group.</p>';
    }
}

// Attach updateTeam to the global window object
window.updateTeam = updateTeam;

// Function to update the team data in Firestore
function updateTeam(groupId, teamId) {
    const nameInput = document.getElementById(`name-${teamId}`);

    // Ensure the input element exists
    if (!nameInput) {
        console.error(`Input field for teamId ${teamId} not found.`);
        alert('Failed to update team. Please try again.');
        return;
    }

    const updatedData = {
        name: nameInput.value
    };

    // Use Firestore's update method to update only the specified fields
    db.collection('groups').doc(groupId).update({
        [`teams.${teamId}.name`]: updatedData.name
    })
    .catch(err => {
        console.error('Error updating team:', err);
        alert('Failed to update team. Please try again.');
    });
}