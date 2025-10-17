// Path configuration for the application
const LOCAL_HOSTNAMES = [
  '127.0.0.1',
  'localhost',
];

// Check if we're running locally (including ports like localhost:5500)
const isLocal = LOCAL_HOSTNAMES.some(hostname => 
  window.location.hostname === hostname || 
  window.location.host.startsWith(hostname + ':')
);

// If Live Server is serving from project root, basePath should be '/docs/'
// For production, it should be '/World-Cup-2026/'
export const basePath = isLocal ? '/docs/' : '/World-Cup-2026/';
export { isLocal };