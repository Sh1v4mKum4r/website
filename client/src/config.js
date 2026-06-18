// Single source of truth for the backend API/socket URL.
//
// Priority:
//   1. VITE_API_URL if explicitly set (any environment)
//   2. http://localhost:3001 automatically while running `vite` dev
//   3. the production Render API for builds
export const API_URL =
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? 'http://localhost:3001' : 'https://multiplayergames-api.onrender.com');
