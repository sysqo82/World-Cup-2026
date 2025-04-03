// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBxdeTLscpv1RK8W7SabyJJckYiBjLQRvM",
    authDomain: "world-cup-2026-b1fda.firebaseapp.com",
    projectId: "world-cup-2026-b1fda",
    storageBucket: "world-cup-2026-b1fda.firebasestorage.app",
    messagingSenderId: "355932893733",
    appId: "1:355932893733:web:cb338ea08dc12705bf05cc",
    measurementId: "G-6QWWJLC2LM"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();


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

    firebase.auth().signInWithEmailAndPassword(email, password)
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
            const team1 = group1?.teams?.team1?.name || 'Unknown'; // Winner of group1
            const team2 = group2?.teams?.team2?.name || 'Unknown'; // Runner-up of group2

            return {
                match: rule.match,
                team1: team1,
                team2: team2
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

// Ensure groupSelect is defined before using it
const groupSelect = document.getElementById('navigation-select');
if (!groupSelect) {
    console.error('Dropdown element with ID "navigation-select" not found.');
}


groupSelect.addEventListener('change', (event) => {
    const selectedGroupId = event.target.value;
    console.log(`Selected group ID: ${selectedGroupId}`);
    if (selectedGroupId) {
        const selectedGroup = groups.find(group => group.id === selectedGroupId);
        displayTeams(selectedGroup);
    } else {
        document.getElementById('teams-container').innerHTML = ''; // Clear teams list
    }
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
            console.error('Error fetching groups:', err); // Log the error
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
            console.log(`Displayed team: ${team.name || 'Unknown'} (ID: ${teamId})`);
        });
    } else {
        console.warn(`No teams found for group: ${group.name}`);
        teamsContainer.innerHTML = '<p>No teams found for this group.</p>';
    }
}

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