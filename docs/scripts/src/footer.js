document.addEventListener('DOMContentLoaded', () => {
    const footer = document.createElement('footer');
    footer.className = 'footer';
    footer.innerHTML = `
        <p>&copy; 2026 World Cup. All rights reserved to Assaf Itzikson.</p>
    `;
    document.documentElement.appendChild(footer); // Append the footer to the end of the body
});