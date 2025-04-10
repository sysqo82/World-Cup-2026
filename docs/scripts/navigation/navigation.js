function navigateToPage() {
    const selectedPage = document.getElementById('navigation-select').value;
    if (selectedPage === 'round-of-16') {
        window.location.href = 'round-of-16.html';
    } else if (selectedPage === 'group-stage') {
        window.location.href = 'index.html';
    } else if (selectedPage === 'quarter-final') {
        window.location.href = 'quarter-final.html';
    } else if (selectedPage === 'semi-final') {
        window.location.href = 'semi-final.html';
    } else if (selectedPage === 'final') {
        window.location.href = 'final.html';
    } else if (selectedPage === 'third-place') {
        window.location.href = 'third-place.html';
    }
}

// Attach navigateToPage to the global scope
window.navigateToPage = navigateToPage;