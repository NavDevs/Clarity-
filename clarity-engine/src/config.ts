// API base URL — in production (static site), this points to the backend web service.
// In local development, Vite's proxy handles it so this stays empty.
export const API_BASE = import.meta.env.VITE_API_URL || '';
