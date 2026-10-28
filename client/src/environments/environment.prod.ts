export const environment = {
  production: true,
  // By default uses relative '/api' to route via Vercel rewrites (avoiding CORS entirely),
  // or window.__WATCHERA_API_URL__, or set directly to your Render backend URL:
  // e.g. 'https://watchera-backend.onrender.com/api'
  apiUrl: (typeof window !== 'undefined' && (window as any).__WATCHERA_API_URL__) || '/api'
};
