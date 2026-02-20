import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import timesheetApi, { warmTimesheetBackend } from '../utils/timesheetApi';

const TimesheetContext = createContext(null);

export function TimesheetProvider({ children }) {
  const [timesheetUser, setTimesheetUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);
  const location = useLocation();
  const isInTimesheet = location.pathname.startsWith('/timesheet');

  const fetchProfile = useCallback(async () => {
    if (fetchedRef.current) return; // prevent duplicate fetches
    fetchedRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await timesheetApi.get('/auth/me/timesheet-profile');
      setTimesheetUser(res.data);
    } catch (err) {
      console.error('Failed to fetch timesheet profile:', err);
      setError(err.response?.data?.message || 'Failed to load timesheet profile');
      fetchedRef.current = false; // allow retry on error
    } finally {
      setLoading(false);
    }
  }, []);

  // Pre-warm backend + fetch profile when entering timesheet app
  useEffect(() => {
    if (isInTimesheet && !timesheetUser && !loading) {
      warmTimesheetBackend(); // wake Render free-tier server
      fetchProfile();
    }
  }, [isInTimesheet, timesheetUser, loading, fetchProfile]);

  // Memoize context value to prevent unnecessary consumer re-renders
  const value = useMemo(() => ({
    timesheetUser, loading, error, refetch: fetchProfile
  }), [timesheetUser, loading, error, fetchProfile]);

  return (
    <TimesheetContext.Provider value={value}>
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
