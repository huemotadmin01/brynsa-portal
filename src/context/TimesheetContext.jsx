import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import timesheetApi from '../utils/timesheetApi';

const TimesheetContext = createContext(null);

export function TimesheetProvider({ children }) {
  const [timesheetUser, setTimesheetUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const location = useLocation();
  const isInTimesheet = location.pathname.startsWith('/timesheet');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await timesheetApi.get('/auth/me/timesheet-profile');
      setTimesheetUser(res.data);
    } catch (err) {
      console.error('Failed to fetch timesheet profile:', err);
      setError(err.response?.data?.message || 'Failed to load timesheet profile');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch timesheet profile when entering the timesheet app
  useEffect(() => {
    if (isInTimesheet && !timesheetUser && !loading) {
      fetchProfile();
    }
  }, [isInTimesheet, timesheetUser, loading, fetchProfile]);

  return (
    <TimesheetContext.Provider value={{ timesheetUser, loading, error, refetch: fetchProfile }}>
      {children}
    </TimesheetContext.Provider>
  );
}

export function useTimesheetContext() {
  const context = useContext(TimesheetContext);
  if (!context) {
    throw new Error('useTimesheetContext must be used within TimesheetProvider');
  }
  return context;
}
