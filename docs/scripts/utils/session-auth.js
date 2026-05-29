export function getSessionToken() {
    return sessionStorage.getItem('sessionToken');
}

export function setSessionToken(token) {
    if (token) sessionStorage.setItem('sessionToken', token);
}

export function clearSessionToken() {
    sessionStorage.removeItem('sessionToken');
}

export function buildSessionHeaders(headers = {}) {
    const mergedHeaders = { ...headers };
    const token = getSessionToken();
    if (token) {
        mergedHeaders['Authorization'] = `Bearer ${token}`;
    }
    return mergedHeaders;
}

export function withSessionCredentials(init = {}) {
    return {
        ...init,
        credentials: 'include',
        headers: buildSessionHeaders(init.headers || {}),
    };
}
