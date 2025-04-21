const pageMap = {
    '': 'index.html',
    'home': 'index.html',
    'index.html': 'home',
    'group-stage': 'pages/group-stage.html',
    'round-of-16': 'pages/round-of-16.html',
    'quarter-final': 'pages/quarter-final.html',
    'semi-final': 'pages/semi-final.html',
    'final': 'pages/final.html',
    'third-place-playoff': 'pages/third-place-playoff.html',
    'group-stage.html': 'group-stage',
    'round-of-16.html': 'round-of-16',
    'quarter-final.html': 'quarter-final',
    'semi-final.html': 'semi-final',
    'final.html': 'final',
    'third-place-playoff.html': 'third-place-playoff',
};

function navigateToPage() {
    const selectedPage = document.getElementById('navigation-select').value;
    const targetUrl = pageMap[selectedPage] || 'index.html';

    const isLocal = window.location.hostname === '127.0.0.1';
    const basePath = isLocal ? '/World-Cup-2026/docs/' : '/World-Cup-2026/';

    window.location.href = `${basePath}${targetUrl}`;
}

function setSelectedPage() {
    const navigationSelect = document.getElementById('navigation-select');
    if (!navigationSelect) return;

    const currentPath = window.location.pathname.replace(/\\/g, '/');
    const isLocal = window.location.hostname === '127.0.0.1';
    const basePath = isLocal ? '/docs/' : '/World-Cup-2026/';

    // Remove the base path to get the current page
    const currentPage = currentPath.replace(basePath, '') || 'index.html';

    // Reverse map the current page to the dropdown value
    const reversePageMap = Object.entries(pageMap).reduce((acc, [key, value]) => {
        acc[value] = key;
        return acc;
    }, {});

    navigationSelect.value = reversePageMap[currentPage] || 'home';
}

window.navigateToPage = navigateToPage;

document.addEventListener('DOMContentLoaded', setSelectedPage);