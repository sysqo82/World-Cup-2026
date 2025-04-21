// Import Firebase configuration and services
import { db, auth } from '../scripts/config/firebase-config.js';
import { genereateRoundOf16Matches } from './create-round-matches/admin-helper/generate-round-of-16.js';
import { generateQuarterFinalsMatches } from './create-round-matches/admin-helper/generate-quarter-finals.js';
import { generateSemiFinalsMatches } from './create-round-matches/admin-helper/generate-semi-finals.js';
import { generateFinalMatch } from './create-round-matches/admin-helper/generate-final.js';
import { generateThirdPlacePlayoffMatch } from './create-round-matches/admin-helper/generate-third-forth-playoff.js';

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

document.getElementById('generate-round-of-16').addEventListener('click', async () => {
    genereateRoundOf16Matches();
});
document.getElementById('generate-quarter-finals').addEventListener('click', async () => {
    generateQuarterFinalsMatches();
});
document.getElementById('generate-semi-finals').addEventListener('click', async () => {
    generateSemiFinalsMatches();
});
document.getElementById('generate-final').addEventListener('click', async () => {
    generateFinalMatch();
});
document.getElementById('generate-third-place-playoff').addEventListener('click', async () => {
    generateThirdPlacePlayoffMatch();
});

// Helper function to get a team by rank
export function getTeamByRank(group, rank) {
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

document.addEventListener('DOMContentLoaded', () => {
    const registeredUsersTableBody = document.querySelector('#registered-users-table tbody');

    // Fetch registered users from Firestore and populate the "Registered Users" table
    function loadRegisteredUsers() {
        db.collection('users').get()
            .then(snapshot => {
                registeredUsersTableBody.innerHTML = ''; // Clear existing rows
    
                if (snapshot.empty) {
                    const row = registeredUsersTableBody.insertRow();
                    const cell = row.insertCell(0);
                    cell.colSpan = 5;
                    cell.textContent = 'No registered users found.';
                    cell.style.textAlign = 'center';
                } else {
                    // Fetch and sort users by their index field
                    const users = snapshot.docs
                        .map(doc => doc.data())
                        .sort((a, b) => a.index - b.index); // Sort by index in ascending order
    
                    let rowNumber = 1; // Initialize row counter
                    users.forEach(user => {
                        const row = registeredUsersTableBody.insertRow();
                        row.insertCell(0).textContent = rowNumber++;
                        row.insertCell(1).textContent = user.firstName;
                        row.insertCell(2).textContent = user.lastName;
                        row.insertCell(3).textContent = user.email;
                        row.insertCell(4).textContent = user.team || 'N/A'; // Display team or 'N/A' if not available
                        row.insertCell(5).innerHTML = `
                            <button class="submit-button" onclick="deleteUser('${user.email}')">Delete</button>
                        `;
                        row.insertCell(6).innerHTML = `
                            <input type="checkbox" class="form-check-input" id="user-${user.email}" 
                                ${user.hasPaid === true ? 'checked' : ''} 
                                onchange="updateHasPaid('${user.email}', this.checked)">
                        `;
                    });
                }
            })
            .catch(err => {
                console.error('Error fetching registered users:', err);
            });
    }

    // Delete a user from Firestore based on their email and update the team's assigned flag
    window.deleteUser = (email) => {
        db.collection('users')
            .where('email', '==', email) // Query for the document with the matching email
            .get()
            .then(snapshot => {
                if (snapshot.empty) {
                    alert(`No user found with email ${email}.`);
                    console.error(`No user found with email ${email}.`);
                    return;
                }
    
                // Delete the user and update the team's assigned flag
                snapshot.forEach(doc => {
                    const user = doc.data();
                    const userId = doc.id;
    
                    // Delete the user document
                    db.collection('users').doc(userId).delete()
                        .then(() => {
                            console.log(`User with email ${email} deleted successfully.`);
    
                            // Update the team's assigned flag to false
                            if (user.team) {
                                db.collection('teams')
                                    .where('fullName', '==', user.team) // Find the team by name
                                    .get()
                                    .then(teamSnapshot => {
                                        if (!teamSnapshot.empty) {
                                            teamSnapshot.forEach(teamDoc => {
                                                db.collection('teams').doc(teamDoc.id).update({
                                                    assigned: false
                                                })
                                                .then(() => {
                                                    console.log(`Team ${user.team}'s assigned flag set to false.`);
                                                    alert(`User with email ${email} deleted successfully, and team ${user.team} is now unassigned.`);
                                                    loadRegisteredUsers(); // Refresh the "Registered Users" table
                                                })
                                                .catch(err => {
                                                    console.error(`Error updating team ${user.team}:`, err);
                                                    alert('Failed to update team assignment. Please try again.');
                                                });
                                            });
                                        } else {
                                            console.warn(`No team found with name ${user.team}.`);
                                            alert(`User deleted, but no team assignment was found for ${user.team}.`);
                                            loadRegisteredUsers(); // Refresh the "Registered Users" table
                                        }
                                    })
                                    .catch(err => {
                                        console.error('Error querying team by name:', err);
                                        alert('Failed to update team assignment. Please try again.');
                                    });
                            } else {
                                console.warn('User has no assigned team.');
                                alert(`User with email ${email} deleted successfully.`);
                                loadRegisteredUsers(); // Refresh the "Registered Users" table
                            }
                        })
                        .catch(err => {
                            console.error('Error deleting user:', err);
                            alert('Failed to delete user. Please try again.');
                        });
                });
            })
            .catch(err => {
                console.error('Error querying user by email:', err);
                alert('Failed to delete user. Please try again.');
            });
    };

        window.updateHasPaid = (email, hasPaid) => {
            db.collection('users')
                .where('email', '==', email) // Query for the document with the matching email
                .get()
                .then(snapshot => {
                    if (snapshot.empty) {
                        alert(`No user found with email ${email}.`);
                        console.error(`No user found with email ${email}.`);
                        return;
                    }
        
                    snapshot.forEach(doc => {
                        const userId = doc.id;
        
                        // Update the hasPaid flag in the database
                        db.collection('users').doc(userId).update({ hasPaid: hasPaid === true })
                            .then(() => {
                                console.log(`User with email ${email} updated successfully. hasPaid: ${hasPaid}`);
                                alert(`Payment status updated for ${email}.`);
                            })
                            .catch(err => {
                                console.error('Error updating payment status:', err);
                                alert('Failed to update payment status. Please try again.');
                            });
                    });
                })
                .catch(err => {
                    console.error('Error querying user by email:', err);
                    alert('Failed to update payment status. Please try again.');
                });
        };
    
    // Initial load
    loadRegisteredUsers();
});