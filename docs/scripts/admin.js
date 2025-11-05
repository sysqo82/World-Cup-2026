// Import Firebase configuration and services
import { db, auth, setAdminRoleURL } from '../scripts/config/firebase-config.js';
import { clearDB } from './create-round-matches/admin-helper/clear-db.js';
import { generateRoundOf16Matches } from './create-round-matches/admin-helper/generate-round-of-16.js';
import { generateQuarterFinalsMatches } from './create-round-matches/admin-helper/generate-quarter-finals.js';
import { generateSemiFinalsMatches } from './create-round-matches/admin-helper/generate-semi-finals.js';
import { generateFinalMatch } from './create-round-matches/admin-helper/generate-final.js';
import { generateThirdPlacePlayoffMatch } from './create-round-matches/admin-helper/generate-third-forth-playoff.js';

// Check authentication state on page load
auth.onAuthStateChanged(user => {
    const logoutButton = document.getElementById('logout-button');
    const authContainer = document.getElementById('auth-container');
    const adminContentPlaceholder = document.getElementById('admin-content-placeholder');

    if (user) {
        // User is logged in
        authContainer.style.display = 'none';
        logoutButton.style.display = 'block';
    
        renderAdminContent(adminContentPlaceholder);
    
        fetchGroups();
    } else {
        // User is not logged in
        adminContentPlaceholder.innerHTML = '';
        authContainer.style.display = 'block';
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
            assignAdminRole(userCredential.user.uid);
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

// Function to assign admin role
export async function assignAdminRole(uid) {
    try {
      const idToken = await auth.currentUser.getIdToken(); // Get the ID token of the current user  
      const response = await fetch(setAdminRoleURL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`, // Include the user's ID token
        },
        body: JSON.stringify({ uid }),
      });
  
      if (response.ok) {
        console.log('Admin role assigned successfully!');
      } else {
        console.error('Failed to assign admin role.');
      }
    } catch (error) {
      console.error('Error assigning admin role:', error);
    }
  }

// Render admin content dynamically
function renderAdminContent(container) {
    container.innerHTML = `
        <div id="admin-content" class="mt-5">
            <!-- Dropdown for groups and Generate button -->
            <div class="mb-4 text-center">
                <label for="navigation-select">Group admin:</label>
                <select id="navigation-select">
                    <option value="">-- Select a Group --</option>
                </select>
            </div>
            <!-- Teams list -->
            <div id="teams-container" class="mt-4">
                <!-- Teams will be dynamically displayed here -->
            </div>
            <div class="d-flex flex-column align-items-center">
                <button id="clear-db" class="submit-button mb-2">Clear Group Stage</button>
                <button id="generate-round-of-16" class="submit-button mb-2">Generate Round of 16</button>
                <button id="generate-quarter-finals" class="submit-button mb-2">Generate Quarter Finals</button>
                <button id="generate-semi-finals" class="submit-button mb-2">Generate Semi Finals</button>
                <button id="generate-final" class="submit-button mb-2">Generate Final</button>
                <button id="generate-third-place-playoff" class="submit-button">Generate Third Place Playoff</button>
            </div>

            <!-- Registered Users -->
            <div id="registered-users-container" class="mt-5">
                <h2>Registered Users</h2>
                <table id="registered-users-table" class="table table-striped">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>First Name</th>
                            <th>Last Name</th>
                            <th>Email</th>
                            <th></th>
                            <th>Paid</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Registered users will be dynamically added here -->
                    </tbody>
                </table>
            </div>
        </div>
    `;

    // Attach event listeners for admin buttons
    document.getElementById('clear-db').addEventListener('click', async () => {
        clearDB();
    });
    document.getElementById('generate-round-of-16').addEventListener('click', async () => {
        generateRoundOf16Matches();
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
            teamDiv.className = 'team-edit-row';

            teamDiv.innerHTML = `
                <label>Rank ${index + 1}:</label>
                <input type="text" id="name-${teamId}" class="team-name-input" value="${team.name || 'Unknown'}">
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
window.fetchGroups = fetchGroups;
window.populateGroupDropdown = populateGroupDropdown;
window.displayTeams = displayTeams;
window.getTeamByRank = getTeamByRank;

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
                        .sort((a, b) => (a.index || 0) - (b.index || 0)); // Sort by index in ascending order

                    users.forEach(user => {
                        const row = registeredUsersTableBody.insertRow();
                        row.insertCell(0).textContent = user.index || 'N/A'; // Show actual index
                        row.insertCell(1).textContent = user.firstName;
                        row.insertCell(2).textContent = user.lastName;
                        row.insertCell(3).textContent = user.email;
                        row.insertCell(4).innerHTML = `
                            <button class="submit-button" onclick="deleteUser('${user.email}')">Delete</button>
                        `;
                        row.insertCell(5).innerHTML = `
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
                    const deletedUserIndex = user.index || 0;

                    // Delete the user document
                    db.collection('users').doc(userId).delete()
                        .then(() => {
                            console.log(`User with email ${email} deleted successfully.`);

                            // Update indices of all users with higher index numbers
                            db.collection('users')
                                .where('index', '>', deletedUserIndex)
                                .get()
                                .then(usersSnapshot => {
                                    const batch = db.batch();
                                    usersSnapshot.forEach(userDoc => {
                                        const userRef = db.collection('users').doc(userDoc.id);
                                        const currentIndex = userDoc.data().index || 0;
                                        batch.update(userRef, { index: currentIndex - 1 });
                                    });
                                    return batch.commit();
                                })
                                .then(() => {
                                    console.log('User indices updated successfully.');
                                })
                                .catch(err => {
                                    console.error('Error updating user indices:', err);
                                });

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
                                                    alert(`User with email ${email} deleted successfully.`);
                                                    loadRegisteredUsers(); // Refresh the "Registered Users" table
                                                })
                                                .catch(err => {
                                                    console.error(`Error updating team ${user.team}:`, err);
                                                    alert('Failed to update team assignment. Please try again.');
                                                });
                                            });
                                        } else {
                                            console.warn(`No team found with name ${user.team}.`);
                                            alert(`User with email ${email} deleted successfully.`);
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

}

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
                calculatedPoints: (team.W || 0) * 3 + (team.D || 0),
                goalDifference: (team.goalsScored || 0) - (team.goalsReceived || 0)
            }))
            .sort((a, b) => {
                return (
                    b.calculatedPoints - a.calculatedPoints || // Sort by calculated points
                    b.goalDifference - a.goalDifference || // Then by goal difference
                    b.goalsScored - a.goalsScored // Then by goals scored
                );
            });

        return sortedByCurrentRank[rank - 1] || {}; // Return the team at the given rank
    }
}
