import { db, functionsURL } from "../config/firebase-config.js";

// Utility function to set a cookie
export function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

// Utility function to get a cookie
export function getCookie(name) {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [key, value] = cookie.trim().split('=');
        if (key === name) return value;
    }
    return null;
}

// Utility function to delete a cookie
export function deleteCookie(name) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}

export function openEncryptedURL() {
    const encodedURL = 'aHR0cHM6Ly9tb256by5tZS9hc3NhZml0emlrc29uLzUuMDA/ZD1Xb3JsZCUyMEN1cCUyMDIwMjYmaD1UREp4ZTg=';
    const decodedURL = atob(encodedURL);
    window.open(decodedURL, '_blank');
}

// Initialize homepage logic
export function initializeHomepage() {
    const registrationForm = document.getElementById("registration-form");
    const loginForm = document.getElementById("login-form");
    const navigationDropdown = document.getElementById("navigation-dropdown");
    const registerSubmitButton = document.getElementById("register-button");
    const loginSubmitButton = document.getElementById("login-button");
    const contentPlaceholder = document.getElementById("content-placeholder");
    const paymentContainer = document.getElementById("payment-container");
    const registrationFormContainer = document.getElementById("registration-form-container");

    // Hide the navigation dropdown initially
    navigationDropdown.classList.add("hidden");

    // Check for existing cookie on page load
    const userDetailsCookie = getCookie("userDetails");
    if (userDetailsCookie) {
        const userDetails = JSON.parse(userDetailsCookie);

        if (userDetails.hasPaid === "Pending" || userDetails.hasPaid === false) {
            // Hide registration form and show payment button
            registrationFormContainer.classList.add("hidden");
            paymentContainer.classList.remove("hidden");
            contentPlaceholder.classList.remove("hidden");
            loginForm.classList.remove("hidden");

            // Add event listener for the payment button
            const paymentButton = document.getElementById("payment");
            paymentButton.addEventListener("click", openEncryptedURL);
        } else if (userDetails.hasPaid === true) {
            // User has paid, show navigation dropdown and hide registration payment and login forms
            navigationDropdown.classList.remove("hidden");
            paymentContainer.classList.add("hidden");
            registrationFormContainer.classList.add("hidden");
            contentPlaceholder.classList.remove("hidden");

            // Show user details in the content placeholder
            contentPlaceholder.innerHTML = `
            <p>Welcome, ${userDetails.firstName} ${userDetails.lastName}!</p>
            <p>You've drawn <strong>${userDetails.assignedTeam}</strong> as your winning team</p>
            <p>Please use the navigation menu to access different sections of the site.</p>
            `;
        }
    }

    // Handle registration form submission (unchanged)
    registrationForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const firstName = document.getElementById("first-name").value.trim();
        const lastName = document.getElementById("last-name").value.trim();
        const email = document.getElementById("email").value.trim();

        registerSubmitButton.disabled = true;
        registerSubmitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';

        if (!firstName || !lastName || !email) {
            alert("Please fill out all fields.");
            registerSubmitButton.disabled = false;
            registerSubmitButton.innerHTML = 'Submit';
            return;
        }

        try {
            registerSubmitButton.disabled = true;
            registerSubmitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';

            const response = await fetch(functionsURL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ firstName, lastName, email }),
            });

            if (!response.ok) {
                const errorMessage = await response.text();
                throw new Error(errorMessage);
            }

            const { message } = await response.json();

            // Set cookie with user details
            setCookie(
                "userDetails",
                JSON.stringify({ 
                    firstName,
                    lastName,
                    email, 
                    hasPaid: "Pending",
                    assignedTeam: "Pending" 
                }),
                7
            );

            alert(`${message}`);
            registrationForm.reset();
            registerSubmitButton.disabled = false;
            registerSubmitButton.innerHTML = 'Register';
            window.location.reload();
        } catch (error) {
            console.error("Error registering user:", error);
            alert("Failed to register. Please try again.");
        }
    });

    // Handle login form submission (updated to use db.collection)
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email-login").value.trim();
        loginSubmitButton.disabled = true;
        loginSubmitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';

        if (!email) {
            alert("Please enter your email.");
            loginSubmitButton.disabled = false;
            loginSubmitButton.innerHTML = 'Login';
            return;
        }

        try {
            // Query the database for the user's details
            const normalizedEmail = email.toLowerCase().trim();
            const snapshot = await db.collection("users").where("email", "==", normalizedEmail).get();

            if (snapshot.empty) {
                alert("No user found with this email. Please register first.");
                loginSubmitButton.disabled = false;
                loginSubmitButton.innerHTML = 'Login';
                loginForm.reset();
                return;
            }

            const userDetails = snapshot.docs[0].data();

            if (userDetails.hasPaid === true) {
                alert("Welcome back! You have access to the site.");
                // Set the cookie with user details from the database
                setCookie(
                    "userDetails",
                    JSON.stringify({ 
                        firstName: userDetails.firstName,
                        lastName: userDetails.lastName, 
                        email: userDetails.email, 
                        hasPaid: userDetails.hasPaid, 
                        assignedTeam: userDetails.team 
                    }),
                    30
                );
                loginForm.reset();
                window.location.reload();
            } else if (userDetails.hasPaid === "Pending" || userDetails.hasPaid === false) {
                loginForm.innerHTML = '<p class="text-danger">Registration is complete, waiting for payment confirmation.</p>';
                setCookie(
                    "userDetails",
                    JSON.stringify({ 
                        firstName: userDetails.firstName, 
                        lastName: userDetails.lastName, 
                        email: userDetails.email, 
                        hasPaid: userDetails.hasPaid,
                        assignedTeam: "Pending"
                    }),
                    30
                );
            } else {
                alert("Payment not completed. Please complete your payment.");
            }

            loginSubmitButton.disabled = false;
            loginSubmitButton.innerHTML = 'Login';
        } catch (error) {
            console.error("Error logging in:", error);
            alert("Failed to log in. Please try again.");
            loginSubmitButton.disabled = false;
            loginSubmitButton.innerHTML = 'Login';
        }
    });
}