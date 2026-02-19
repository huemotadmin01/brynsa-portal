import axios from 'axios';
import { TIMESHEET_API_URL } from './config';

const timesheetApi = axios.create({
  baseURL: TIMESHEET_API_URL,
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

export default timesheetApi;
