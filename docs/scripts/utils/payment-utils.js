export function openEncryptedURL() {
    const encodedURL = 'aHR0cHM6Ly9tb256by5tZS9hc3NhZml0emlrc29uLzUuMDA/ZD1Xb3JsZCUyMEN1cCUyMDIwMjYmaD1UREp4ZTg=';
    const decodedURL = atob(encodedURL);
    window.open(decodedURL, '_blank');
}