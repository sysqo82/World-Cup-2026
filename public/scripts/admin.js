document.getElementById("admin-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const countryName = document.getElementById("country-name").value;
    const group = document.getElementById("group-select").value;

    if (countryName && group) {
        try {
            const response = await fetch('/api/countries', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: countryName, group }),
            });

            if (response.ok) {
                const result = await response.json();
                const messageDiv = document.getElementById("message");
                messageDiv.textContent = `${result.name} has been added to ${result.group}.`;

                // Clear the form fields
                document.getElementById("country-name").value = "";
                document.getElementById("group-select").value = "Group A";
            } else {
                console.error('Failed to add country');
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
});