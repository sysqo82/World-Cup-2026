document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');

    form.addEventListener('submit', (event) => {
        event.preventDefault(); // Prevent form from refreshing the page

        const firstName = document.getElementById('first-name').value.trim();
        const lastName = document.getElementById('last-name').value.trim();
        const email = document.getElementById('email').value.trim();

        if (!firstName || !lastName || !email) {
            alert('Please fill out all fields.');
            return;
        }

        // Save user data to localStorage
        const users = JSON.parse(localStorage.getItem('registeredUsers')) || [];
        users.push({ firstName, lastName, email });
        localStorage.setItem('registeredUsers', JSON.stringify(users));

        // Show a confirmation message
        alert('Registration successful!');

        // Clear the form
        form.reset();
    });
});