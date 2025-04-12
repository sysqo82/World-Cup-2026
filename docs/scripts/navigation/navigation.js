const pageMap = {
    'home': 'index.html',
    'index.html': 'home',
    'group-stage': 'group-stage.html',
    'round-of-16': 'round-of-16.html',
    'quarter-final': 'quarter-final.html',
    'semi-final': 'semi-final.html',
    'final': 'final.html',
    'third-place': 'third-place.html',
    'group-stage.html': 'group-stage',
    '': 'group-stage',
    'round-of-16.html': 'round-of-16',
    'quarter-final.html': 'quarter-final',
    'semi-final.html': 'semi-final',
    'final.html': 'final',
    'third-place.html': 'third-place'
};

function navigateToPage() {
    const selectedPage = document.getElementById('navigation-select').value;
    const targetUrl = pageMap[selectedPage] || 'index.html';
    window.location.href = targetUrl;
}

function setSelectedPage() {
    const navigationSelect = document.getElementById('navigation-select');
    if (!navigationSelect) return;

    const currentPage = window.location.pathname.split('/').pop();
    navigationSelect.value = pageMap[currentPage] || 'group-stage';
}

window.navigateToPage = navigateToPage;

document.addEventListener('DOMContentLoaded', setSelectedPage);