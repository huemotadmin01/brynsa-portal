// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://brynsa-leads-api.onrender.com';

// Extension communication key (for localStorage sync)
export const AUTH_STORAGE_KEY = 'brynsa_auth';
export const USER_STORAGE_KEY = 'brynsa_user';

// Feature flags
export const FEATURES = {
  GOOGLE_AUTH: true,
  EMAIL_OTP: true,
  QUESTIONNAIRE: true,
};