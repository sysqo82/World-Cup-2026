import { getCookie, deleteCookie, setCookie } from "../utils/user-utils.js";
import { db, getUserStatusURL } from "../config/firebase-config.js"
import { basePath, isLocal } from "../config/path-config.js";

// Read the session token stored in sessionStorage by user-utils.js
function getSessionToken() {
    return sessionStorage.getItem('sessionToken');
}

async function fetchUserStatus() {
    const token = getSessionToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    try {
        const res = await fetch(getUserStatusURL, {
            method: 'POST',
            headers,
            body: JSON.stringify({})
        });
        return await res.json();
    } catch {
        return { authenticated: false };
    }
}

const pageMap = {
    '': 'index.html',
    'home': 'index.html',
    'index.html': 'home',
    'my-account': 'pages/my-account.html',
    'group-stage': 'pages/group-stage.html',
    'round-of-32': 'pages/round-of-32.html',
    'round-of-16': 'pages/round-of-16.html',
    'quarter-final': 'pages/quarter-final.html',
    'semi-final': 'pages/semi-final.html',
    'final': 'pages/final.html',
    'third-place-playoff': 'pages/third-place-playoff.html',
    'pages/my-account.html': 'my-account',
    'pages/group-stage.html': 'group-stage',
    'pages/round-of-32.html': 'round-of-32',
    'pages/round-of-16.html': 'round-of-16',
    'pages/quarter-final.html': 'quarter-final',
    'pages/semi-final.html': 'semi-final',
    'pages/final.html': 'final',
    'pages/third-place-playoff.html': 'third-place-playoff',
};

function navigateToPage() {
    const selectedPage = document.getElementById('navigation-select').value;
    const targetUrl = pageMap[selectedPage] || 'index.html';
    
    // For local development, construct absolute URLs
    // For production, use relative paths with basePath
    let fullUrl;
    if (isLocal) {
        const baseUrl = window.location.origin; // http://127.0.0.1:5500
        fullUrl = `${baseUrl}/docs/${targetUrl}`;
    } else {
        fullUrl = `${basePath}${targetUrl}`;
    }

    window.location.href = fullUrl;
}

function setSelectedPage() {
    const navigationSelect = document.getElementById('navigation-select');
    if (!navigationSelect) return;

    const currentPath = window.location.pathname.replace(/\\/g, '/');
    
    // For Live Server, extract the current page from the full path
    let currentPage;
    if (isLocal) {
        // Remove /docs/ prefix to get the relative path
        currentPage = currentPath.replace('/docs/', '') || 'index.html';
    } else {
        // For production
        currentPage = currentPath.replace(basePath, '').replace(/^\/+/, '') || 'index.html';
    }

    const reversePageMap = Object.entries(pageMap).reduce((acc, [key, value]) => {
        acc[value] = key;
        return acc;
    }, {});

    navigationSelect.value = reversePageMap[currentPage] || 'home';
}

window.navigateToPage = navigateToPage;

document.addEventListener('DOMContentLoaded', setSelectedPage);

const userDetailsObj = null; // legacy — replaced by server-side session

// checks if the user has an active session, if not redirects to homepage
export async function isRegistered() {
    const userStatus = await fetchUserStatus();
    if (!userStatus.authenticated) {
        alert("You are not registered. Please register to access this site.");
        window.location.href = `${basePath}index.html`;
        return false;
    }
    return true;
}

export async function isAllowed() {
    const userStatus = await fetchUserStatus();
    if (!userStatus.authenticated) {
        alert("You are not registered. Please register to access this site.");
        window.location.href = `${basePath}index.html`;
        return false;
    }
    if (userStatus.hasPaid !== true) {
        alert("Your payment is still pending. Please check your payment status.");
        window.location.href = `${basePath}index.html`;
        return false;
    }
    return true;
}
