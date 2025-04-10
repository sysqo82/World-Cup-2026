function navigateToPage() {
    const selectedPage = document.getElementById('navigation-select').value;
    if (selectedPage === 'group-stage') {
        window.location.href = '/';
    } else if (selectedPage === 'round-of-16') {
        window.location.href = 'round-of-16.html';
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

// Set the selected option in the dropdown based on the current page
function setSelectedPage() {
    const currentPage = window.location.pathname.split('/').pop(); // Get the current page filename
    const navigationSelect = document.getElementById('navigation-select');

    if (!navigationSelect) return;

    switch (currentPage) {
        case 'index.html':
        case '':    
            navigationSelect.value = 'group-stage';
            break;
        case 'round-of-16.html':
                navigationSelect.value = 'round-of-16';
            break;
        case 'quarter-final.html':
            navigationSelect.value = 'quarter-final';
            break;
        case 'semi-final.html':
            navigationSelect.value = 'semi-final';
            break;
        case 'final.html':
            navigationSelect.value = 'final';
            break;
        case 'third-place.html':
            navigationSelect.value = 'third-place';
            break;
        default:
            navigationSelect.value = 'group-stage';
            break;
    }
}

// Attach navigateToPage to the global scope
window.navigateToPage = navigateToPage;

// Set the selected page on page load
document.addEventListener('DOMContentLoaded', setSelectedPage);