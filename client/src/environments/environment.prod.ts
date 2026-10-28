export const environment = {
  production: true,
  // Live Render backend URL: https://watchera.onrender.com/api
  // Can be overridden at runtime via window.__WATCHERA_API_URL__
  apiUrl:
    (typeof window !== 'undefined' && (window as any).__WATCHERA_API_URL__) ||
    'https://watchera.onrender.com/api'
};
