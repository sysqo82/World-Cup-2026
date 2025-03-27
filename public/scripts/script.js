document.addEventListener("DOMContentLoaded", async () => {
    try {
        // Fetch all countries from the API
        const response = await fetch('/api/countries');
        const countries = await response.json();

        // Group countries by their group name
        const groups = countries.reduce((acc, country) => {
            if (!acc[country.group_name]) acc[country.group_name] = [];
            acc[country.group_name].push(country);
            return acc;
        }, {});

        // Get the container for the tables
        const container = document.getElementById('tables-container');
        container.innerHTML = ''; // Clear any existing content

        // Create tables for each group
        for (const [group, countries] of Object.entries(groups)) {
            const groupDiv = document.createElement('div');
            groupDiv.innerHTML = `
                <h2>${group}</h2>
                <table>
                    <tr><th>Country</th><th>Games</th><th>W</th><th>D</th><th>L</th><th>Points</th><th>Actions</th></tr>
                    ${countries.map(country => `
                        <tr data-id="${country.id}">
                            <td>${country.name}</td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td></td>
                            <td><button class="remove-btn">Remove</button></td>
                        </tr>
                    `).join('')}
                </table>
            `;
            container.appendChild(groupDiv);
        }

        // Add event listeners to all "Remove" buttons
        document.querySelectorAll('.remove-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const row = event.target.closest('tr');
                const countryId = row.getAttribute('data-id');

                try {
                    // Send a DELETE request to the server
                    const deleteResponse = await fetch(`/api/countries/${countryId}`, {
                        method: 'DELETE',
                    });

                    if (deleteResponse.ok) {
                        // Remove the row from the table
                        row.remove();
                    } else {
                        console.error('Failed to delete country');
                    }
                } catch (error) {
                    console.error('Error deleting country:', error);
                }
            });
        });
    } catch (error) {
        console.error('Error fetching countries:', error);
    }
});