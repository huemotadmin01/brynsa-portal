import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AUTH_STORAGE_KEY, USER_STORAGE_KEY } from '../utils/config';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = localStorage.getItem('rivvra_token');
        const storedUser = localStorage.getItem('rivvra_user');

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
          
          // Verify token is still valid by fetching profile
          try {
            const response = await api.getProfile();
            if (response.success) {
              setUser(response.user);
              localStorage.setItem('rivvra_user', JSON.stringify(response.user));
              broadcastAuthChange(response.user, storedToken);
            }
          } catch (err) {
            // Token invalid, clear auth
            console.log('Token expired, clearing auth');
            clearAuth();
          }
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Listen for auth changes from other tabs/extension
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'rivvra_token') {
        if (e.newValue) {
          setToken(e.newValue);
          const userData = localStorage.getItem('rivvra_user');
          if (userData) {
            setUser(JSON.parse(userData));
          }
        } else {
          // Token removed, logout
          setToken(null);
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Broadcast auth changes to extension
  const broadcastAuthChange = useCallback((userData, authToken) => {
    // Store in localStorage for extension to read
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({
      token: authToken,
      user: userData,
      timestamp: Date.now()
    }));

    // Dispatch custom event for same-tab listeners
    window.dispatchEvent(new CustomEvent('rivvra_auth_change', {
      detail: { user: userData, token: authToken }
    }));
  }, []);

  // Login with email OTP
  const loginWithOtp = useCallback(async (email, otp) => {
    setError(null);
    try {
      const response = await api.verifyOtp(email, otp);
      
      if (response.success) {
        const { token: authToken, user: userData } = response;
        
        setToken(authToken);
        setUser(userData);
        
        localStorage.setItem('rivvra_token', authToken);
        localStorage.setItem('rivvra_user', JSON.stringify(userData));
        
        broadcastAuthChange(userData, authToken);
        
        return { success: true, user: userData };
      }
      
      throw new Error(response.error || 'Login failed');
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [broadcastAuthChange]);

  // Login with Google
  const loginWithGoogle = useCallback(async (googleData) => {
    setError(null);
    try {
      const response = await api.googleAuth(googleData);
      
      if (response.success) {
        const { token: authToken, user: userData } = response;
        
        setToken(authToken);
        setUser(userData);
        
        localStorage.setItem('rivvra_token', authToken);
        localStorage.setItem('rivvra_user', JSON.stringify(userData));
        
        broadcastAuthChange(userData, authToken);
        
        return { success: true, user: userData };
      }
      
      throw new Error(response.error || 'Google login failed');
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [broadcastAuthChange]);

  // Signup with password (after OTP verification)
  const signupWithPassword = useCallback(async (email, otp, name, password) => {
    setError(null);
    try {
      const response = await api.signupWithPassword(email, otp, name, password);
      
      if (response.success) {
        const { token: authToken, user: userData } = response;
        
        setToken(authToken);
        setUser(userData);
        
        localStorage.setItem('rivvra_token', authToken);
        localStorage.setItem('rivvra_user', JSON.stringify(userData));
        
        broadcastAuthChange(userData, authToken);
        
        return { success: true, user: userData };
      }
      
      throw new Error(response.error || 'Signup failed');
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [broadcastAuthChange]);

  // Login with email and password
  const loginWithPassword = useCallback(async (email, password) => {
    setError(null);
    try {
      const response = await api.loginWithPassword(email, password);
      
      if (response.success) {
        const { token: authToken, user: userData } = response;
        
        setToken(authToken);
        setUser(userData);
        
        localStorage.setItem('rivvra_token', authToken);
        localStorage.setItem('rivvra_user', JSON.stringify(userData));
        
        broadcastAuthChange(userData, authToken);
        
        return { success: true, user: userData };
      }
      
      throw new Error(response.error || 'Login failed');
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [broadcastAuthChange]);

  // Clear auth state
  const clearAuth = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('rivvra_token');
    localStorage.removeItem('rivvra_user');
    localStorage.removeItem(AUTH_STORAGE_KEY);
    
    window.dispatchEvent(new CustomEvent('rivvra_auth_change', {
      detail: { user: null, token: null }
    }));
  }, []);

  // Logout
  const logout = useCallback(() => {
    clearAuth();
  }, [clearAuth]);

  // Update user data
  const updateUser = useCallback((updates) => {
    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    localStorage.setItem('rivvra_user', JSON.stringify(updatedUser));
    broadcastAuthChange(updatedUser, token);
  }, [user, token, broadcastAuthChange]);

  const value = {
    user,
    token,
    loading,
    error,
    isAuthenticated: !!token && !!user,
    loginWithOtp,
    loginWithGoogle,
    signupWithPassword,
    loginWithPassword,
    logout,
    updateUser,
    clearError: () => setError(null),
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
