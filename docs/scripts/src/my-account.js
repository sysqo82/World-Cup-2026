import { getAssignedTeam, logoutUser } from '../utils/user-utils.js';
import { isAllowed, isRegistered } from "../navigation/navigation.js";

// Add event listener for navigation dropdown
document.getElementById('navigation-select').addEventListener('change', navigateToPage);

document.addEventListener('DOMContentLoaded', async () => {
    await isRegistered();
    await isAllowed();

    document.getElementById('logout').addEventListener('click', logoutUser);

    await getAssignedTeam();
});
