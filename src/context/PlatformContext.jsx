import { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { getAppByPath, getAllApps, getActiveApps } from '../config/apps';

const PlatformContext = createContext(null);

export function PlatformProvider({ children }) {
  const location = useLocation();

  const value = useMemo(() => {
    const currentApp = getAppByPath(location.pathname);
    return {
      currentApp,
      allApps: getAllApps(),
      activeApps: getActiveApps(),
      isInApp: !!currentApp,
    };
  }, [location.pathname]);

  return (
    <PlatformContext.Provider value={value}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform() {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return context;
}
