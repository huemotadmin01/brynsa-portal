import axios from 'axios';
import { TIMESHEET_API_URL } from './config';

const timesheetApi = axios.create({
  baseURL: TIMESHEET_API_URL,
  timeout: 30000, // 30s timeout for cold-start tolerance
});

// Use rivvra_token for unified platform auth
timesheetApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('rivvra_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

timesheetApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Timesheet API auth failed');
    }
    return Promise.reject(error);
  }
);

/**
 * Pre-warm the timesheet backend (Render free tier cold start).
 * Fires a lightweight GET to wake the server before real API calls.
 * Returns a promise that resolves once the server responds.
 */
let warmPromise = null;
export function warmTimesheetBackend() {
  if (!warmPromise) {
    warmPromise = fetch(`${TIMESHEET_API_URL}/health`, {
      method: 'GET',
      mode: 'no-cors', // fire-and-forget, just wake the server
    }).catch(() => {}); // ignore errors — it's just a warm-up ping
  }
  return warmPromise;
}

export default timesheetApi;
