import { initializeHomepage, logoutUser } from '../utils/user-utils.js';

document.addEventListener('DOMContentLoaded', () => {
  initializeHomepage(); // Delegate all homepage logic to user-utils.js
  document.getElementById('logout').addEventListener('click', logoutUser);
});