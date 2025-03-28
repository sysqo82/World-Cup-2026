document.getElementById("admin-form").addEventListener("submit", (event) => {
    event.preventDefault();

    const countryName = document.getElementById("country-name").value;
    const group = document.getElementById("group-select").value;

    if (countryName && group) {
        // Retrieve existing data from localStorage
        const groups = JSON.parse(localStorage.getItem("worldCupGroups")) || {};

        // Add the country to the selected group
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(countryName);

        // Save the updated groups back to localStorage
        localStorage.setItem("worldCupGroups", JSON.stringify(groups));

        // Display a success message
        const messageDiv = document.getElementById("message");
        messageDiv.textContent = `${countryName} has been added to ${group}.`;

        // Clear the form fields
        document.getElementById("country-name").value = "";
        document.getElementById("group-select").value = "Group A";
    }
});