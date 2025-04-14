import { functionsURL } from './config/firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent form from refreshing the page

        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const email = document.getElementById('email').value.trim();

        if (!firstName || !lastName || !email) {
            alert('Please fill out all fields.');
            return;
        }

        try {
            const response = await fetch(functionsURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firstName, lastName, email }),
            });

            if (response.ok) {
                alert('Registration successful!');
                form.reset();
            } else {
                const error = await response.text();
                alert(`Error: ${error}`);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert('Failed to register. Please try again.');
        }
    });
});
