import { getAssignedTeam, logoutUser, getCookie, setCookie } from '../utils/user-utils.js';
import { isAllowed, isRegistered } from "../navigation/navigation.js";
import { basePath } from "../config/path-config.js";
import { changeEmailURL } from '../config/firebase-config.js';

// Add event listener for navigation dropdown
document.getElementById('navigation-select').addEventListener('change', navigateToPage);

document.addEventListener('DOMContentLoaded', async () => {
    await isRegistered();
    await isAllowed();

    document.getElementById('logout').addEventListener('click', logoutUser);
    document.getElementById('change-email').addEventListener('click', async () => {
        const newEmail = document.getElementById('new-email').value;
        const userEmail = getCookie("userDetails") ? JSON.parse(getCookie("userDetails")).email : null;

        if (!newEmail) {
            alert("Please enter a new email address.");
            return;
        }

        try {
            const response = await fetch(changeEmailURL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: userEmail, newEmail }),
            });

            if (response.ok) {
                alert("Email changed successfully.");
                // Update the cookie with the new email
                const userDetails = JSON.parse(getCookie("userDetails"));
                userDetails.email = newEmail;

                setCookie("userDetails", JSON.stringify(userDetails), 30);
                window.location.href = `${basePath}/pages/my-account.html`;
            } else {
                alert("Error changing email. Please try again.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert("Error changing email. Please try again.");
        }
    });

    await getAssignedTeam();
});
