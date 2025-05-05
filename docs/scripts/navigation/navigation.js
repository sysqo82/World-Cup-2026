import { getCookie, deleteCookie, setCookie } from "../utils/user-utils.js";
import { db } from "../config/firebase-config.js"

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
export const basePath = isLocal ? '/World-Cup-2026/docs/' : '/World-Cup-2026/';

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

const userDetailsObj = JSON.parse(getCookie("userDetails"));

// checks if there is an email in the cookie, if there is, checks if the user is registered in the database
export async function isRegistered() {
    const userEmail = getCookie("userDetails") ? JSON.parse(getCookie("userDetails")).email : null;
    if (!userEmail) {
        alert ("You are not registered. Please register to access this site.");
        window.location.href = `${basePath}index.html`;
        return false;
    }
    
    const snapshot = await db.collection("users").where("email", "==", userEmail).get();
    
    if (snapshot.empty) {
        alert ("You are not registered. Please register to access this site.");
        deleteCookie("userDetails");
        window.location.href = `${basePath}index.html`;
        return false;
    }
    
    return true;
}


export async function isAllowed() {
    const userEmail = getCookie("userDetails") ? JSON.parse(getCookie("userDetails")).email : null;
    const snapshot = await db.collection("users").where("email", "==", userEmail).get();
    
    const userHasPaid = snapshot.docs.some(doc => {
        const data = doc.data();
        return data.email === userEmail && data.hasPaid === true;
    });
    
    if (!userHasPaid) {
        alert ("Your payment is still pending. Please check your payment status.");
        const currentPage = window.location.pathname.replace(/\\/g, '/').replace(basePath, '').replace(/^\/+/, '');
        if (currentPage !== 'index.html') {
            window.location.href = `${basePath}index.html`;
            alert('You are not allowed on this page. Please complete your payment process.');
            setCookie(
                "userDetails",
                JSON.stringify({
                    ...userDetailsObj,
                    assignedTeam: "Pending",
                    hasPaid: "Pending",
                }),
                7,
            );
        }
        return false;
    }
    return true;
}
