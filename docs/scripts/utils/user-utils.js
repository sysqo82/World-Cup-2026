import { db, registerUser, requestLoginCodeURL, verifyLoginCodeURL } from "../config/firebase-config.js";
import { updatePrizePotCounter } from "./prize-pot-counter.js";
import { basePath } from "../config/path-config.js";

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

export function openEncryptedURL(location) {
    let encodedURL = null;
    const paymentLocation = 'aHR0cHM6Ly9tb256by5tZS9hc3NhZml0emlrc29uLzUuMDA/ZD1Xb3JsZCUyMEN1cCUyMDIwMjYmaD1UREp4ZTg=';
    const contactLocation = 'aHR0cHM6Ly9pbW1lZGlhdGUuc2xhY2suY29tL2FyY2hpdmVzL0MwOFJEMDgyVk5Z';
    switch (location) {
        case 'paymentLocation':
            encodedURL = paymentLocation;
            break;
        case 'contactLocation':
            encodedURL = contactLocation;
            break;
        default:
            // No default action needed
            return;
    }
    const decodedURL = atob(encodedURL);
    window.open(decodedURL, '_blank');
}

// Initialize homepage logic
export function initializeHomepage() {
    const registrationForm = document.getElementById("registration-form");
    const loginForm = document.getElementById("login-form");
    const loginFormContainer = document.getElementById("login-form-container");
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
            if (paymentButton) {
              paymentButton.addEventListener("click", () => {
                openEncryptedURL("paymentLocation");
              });
            }
        } else if (userDetails.hasPaid === true) {
            // User has paid, show navigation dropdown and hide registration, payment and login forms
            navigationDropdown.classList.remove("hidden");
            paymentContainer.classList.add("hidden");
            registrationFormContainer.classList.add("hidden");
            contentPlaceholder.classList.remove("hidden");

            // Show user details in the content placeholder
            contentPlaceholder.innerHTML = `
            <div id="prize-pot-container">
                <h3>The prize pot stands on:</h3>
                <div id="prize-pot-amount">${updatePrizePotCounter()}</div>
            </div>
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

        // Don't allow duplicate email registrations
        try {
            const normalizedEmail = email.toLowerCase().trim();
            const snapshot = await db.collection("users").where("email", "==", normalizedEmail).get();

            if (!snapshot.empty) {
                alert("Email already registered. Please log in.");
                registerSubmitButton.disabled = false;
                registerSubmitButton.innerHTML = 'Register';
                registrationForm.reset();
                document.getElementById("email-login").value = normalizedEmail;
                return;
            }
        } catch (error) {
            console.error("Error checking email:", error);
        }

        if (!firstName || !lastName || !email) {
            alert("Please fill out all fields.");
            registerSubmitButton.disabled = false;
            registerSubmitButton.innerHTML = 'Submit';
            return;
        }

        try {
            registerSubmitButton.disabled = true;
            registerSubmitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Submitting...';

            const response = await fetch(registerUser, {
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

    // Handle login form submission (with email verification)
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email-login").value.trim();
        loginSubmitButton.disabled = true;
        loginSubmitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>Login';

        if (!email) {
            alert("Please enter your email.");
            loginSubmitButton.disabled = false;
            loginSubmitButton.innerHTML = 'Login';
            return;
        }

        try {
            const normalizedEmail = email.toLowerCase().trim();
            const snapshot = await db.collection("users").where("email", "==", normalizedEmail).get();

            if (snapshot.empty) {
                alert("No user found with this email. Please register first.");
                loginSubmitButton.disabled = false;
                loginSubmitButton.innerHTML = 'Login';
                if (getCookie("userDetails")) {
                    deleteCookie("userDetails");
                }
                loginForm.reset();
                return;
            }

            // Request verification code
            const response = await fetch(requestLoginCodeURL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail }),
            });

            if (!response.ok) {
                const errorMessage = await response.text();
                throw new Error(errorMessage);
            }

            // Show verification form
            showVerificationForm(normalizedEmail);

            loginSubmitButton.disabled = false;
            loginSubmitButton.innerHTML = 'Login';
        } catch (error) {
            console.error("Error requesting verification code:", error);
            alert("Failed to send verification code. Please try again.");
            loginSubmitButton.disabled = false;
            loginSubmitButton.innerHTML = 'Login';
        }
    });
}

// Show verification code form
function showVerificationForm(email) {
    const loginFormContainer = document.getElementById("login-form-container");
    
    loginFormContainer.innerHTML = `
        <h2>Email Verification</h2>
        <p>A 6-digit verification code has been sent to:</p>
        <p><strong>${email}</strong></p>
        <p>Please enter the code below (expires in 10 minutes):</p>
        <form id="verification-form">
            <div>
                <label for="verification-code">Verification Code:</label>
                <input type="text" id="verification-code" name="verification-code" maxlength="6" pattern="[0-9]{6}" required>
            </div>
            <button type="submit" class="submit-button" id="verify-button">Verify Code</button>
            <button type="button" class="submit-button" id="resend-code-button" style="margin-left: 10px;">Resend Code</button>
            <button type="button" class="submit-button" id="back-to-login-button" style="margin-left: 10px;">Back to Login</button>
        </form>
    `;

    // Handle verification form submission
    const verificationForm = document.getElementById("verification-form");
    const verifyButton = document.getElementById("verify-button");
    const resendCodeButton = document.getElementById("resend-code-button");
    const backToLoginButton = document.getElementById("back-to-login-button");

    verificationForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        await handleVerificationSubmission(email, verifyButton);
    });

    resendCodeButton.addEventListener("click", async () => {
        await resendVerificationCode(email, resendCodeButton);
    });

    backToLoginButton.addEventListener("click", () => {
        window.location.reload();
    });

    // Auto-focus on verification code input
    document.getElementById("verification-code").focus();
}

// Handle verification code submission
async function handleVerificationSubmission(email, verifyButton) {
    const verificationCode = document.getElementById("verification-code").value.trim();
    
    if (!verificationCode || verificationCode.length !== 6) {
        alert("Please enter a valid 6-digit verification code.");
        return;
    }

    verifyButton.disabled = true;
    verifyButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Verifying...';

    try {
        const response = await fetch(verifyLoginCodeURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                email: email, 
                verificationCode: verificationCode 
            }),
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(errorMessage);
        }

        const { userData } = await response.json();

        // Handle successful verification based on payment status
        if (userData.hasPaid === true) {
            alert(`Welcome back ${userData.firstName}! Your payment has been approved, you can now access the site.`);
            // Set the cookie with user details from the database
            setCookie(
                "userDetails",
                JSON.stringify({
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    hasPaid: userData.hasPaid,
                    assignedTeam: userData.team
                }),
                30
            );
            window.location.reload();
        } else if (userData.hasPaid === "Pending" || userData.hasPaid === false) {
            alert(`Welcome back ${userData.firstName}! If you haven't paid yet, please do, otherwise, your payment is still pending.`);
            
            const registrationFormContainer = document.getElementById("registration-form-container");
            const paymentContainer = document.getElementById("payment-container");
            const loginFormContainer = document.getElementById("login-form-container");
            
            registrationFormContainer.classList.add("hidden");
            paymentContainer.classList.remove("hidden");
            loginFormContainer.innerHTML =
              '<p>Payment approval is still in progress, please try again later.</p>' +
              `<p>Please contact <a href="#" id="contact-link">Assaf</a> for any issues.</p>`;

            // Attach the click event listener to the link after rendering the HTML
            const contactLink = document.getElementById("contact-link");
            if (contactLink) {
              contactLink.addEventListener("click", (event) => {
                event.preventDefault();
                openEncryptedURL("contactLocation");
              });
            }
            setCookie(
                "userDetails",
                JSON.stringify({
                    firstName: userData.firstName,
                    lastName: userData.lastName,
                    email: userData.email,
                    hasPaid: userData.hasPaid,
                    assignedTeam: "Pending"
                }),
                30
            );
        } else {
            alert("Payment not completed. Please complete your payment.");
        }

    } catch (error) {
        console.error("Error verifying code:", error);
        alert(error.message || "Invalid verification code. Please try again.");
        verifyButton.disabled = false;
        verifyButton.innerHTML = 'Verify Code';
    }
}

// Resend verification code
async function resendVerificationCode(email, resendButton) {
    resendButton.disabled = true;
    resendButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Sending...';

    try {
        const response = await fetch(requestLoginCodeURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email }),
        });

        if (!response.ok) {
            const errorMessage = await response.text();
            throw new Error(errorMessage);
        }

        alert("New verification code sent to your email.");
        resendButton.disabled = false;
        resendButton.innerHTML = 'Resend Code';
    } catch (error) {
        console.error("Error resending verification code:", error);
        alert("Failed to resend verification code. Please try again.");
        resendButton.disabled = false;
        resendButton.innerHTML = 'Resend Code';
    }
}

// Search the DB for the assigned team according to the user email found in the cookie
export async function getAssignedTeam() {
    const userDetails = getCookie('userDetails');
    if (userDetails) {
        try {
            const userDetailsObj = JSON.parse(userDetails);
            const email = userDetailsObj.email.toLowerCase().trim();
            const snapshot = await db.collection('users').where('email', '==', email).get();
            if (!snapshot.empty) {
                let assignedTeam = null;
                snapshot.forEach(doc => {
                    assignedTeam = doc.data().team || null;
                });
                const winningTeam = document.getElementById('winning-team');
                winningTeam.innerHTML = `<strong>${assignedTeam || "No team assigned yet"}</strong>`;
                const currentAssignedTeam = userDetailsObj.assignedTeam;
                if (currentAssignedTeam !== assignedTeam) {
                    setCookie(
                        "userDetails",
                        JSON.stringify({
                            ...userDetailsObj,
                            assignedTeam: assignedTeam || "No team assigned yet"
                        }),
                        30
                    );
                }
                return assignedTeam;
            } else {
                console.warn('No user found with this email.');
                return null;
            }
        } catch (error) {
            console.error('Error fetching assigned team:', error);
            return null;
        }
    } else {
        console.warn('User details cookie not found.');
        return null;
    }
}

export async function logoutUser() {
    deleteCookie("userDetails");
    window.location.href = `${basePath}index.html`;
}
