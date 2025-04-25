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

const LOCAL_HOSTNAMES = [
  '127.0.0.1',
  'localhost',
  ];

const isLocal = LOCAL_HOSTNAMES.includes(window.location.hostname);
const basePath = isLocal ? '/World-Cup-2026/docs/' : '/World-Cup-2026/';

function navigateToPage() {
    const selectedPage = document.getElementById('navigation-select').value;
    const targetUrl = pageMap[selectedPage] || 'index.html';

    window.location.href = `${basePath}${targetUrl}`;
}

function setSelectedPage() {
    const navigationSelect = document.getElementById('navigation-select');
    if (!navigationSelect) return;

    const currentPath = window.location.pathname.replace(/\\/g, '/');

    const currentPage = currentPath.replace(basePath, '').replace(/^\/+/, '') || 'index.html';

    const reversePageMap = Object.entries(pageMap).reduce((acc, [key, value]) => {
        acc[value] = key;
        return acc;
    }, {});

    navigationSelect.value = reversePageMap[currentPage] || 'home';
}

window.navigateToPage = navigateToPage;

document.addEventListener('DOMContentLoaded', setSelectedPage);