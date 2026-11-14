import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('hospital_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('hospital_token'));
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('hospital_token');
      if (storedToken) {
        try {
          const res = await authAPI.getMe();
          setUser(res.data.user);
          localStorage.setItem('hospital_user', JSON.stringify(res.data.user));
        } catch (err) {
          console.error('Session restoration failed:', err.message);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const res = await authAPI.login({ email, password });
      const { token: newToken, user: userData } = res.data;

      localStorage.setItem('hospital_token', newToken);
      localStorage.setItem('hospital_user', JSON.stringify(userData));

      setToken(newToken);
      setUser(userData);

      showToast('Welcome Back', `Logged in as ${userData.name} (${userData.role})`, 'success');
      return userData;
    } catch (error) {
      showToast('Authentication Failed', error.message, 'error');
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await authAPI.logout();
      }
    } catch (e) {
      // Ignore cleanup error
    } finally {
      localStorage.removeItem('hospital_token');
      localStorage.removeItem('hospital_user');
      setToken(null);
      setUser(null);
      showToast('Logged Out', 'You have been safely signed out.', 'info');
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      await authAPI.changePassword({ currentPassword, newPassword });
      showToast('Password Changed', 'Your security password was updated successfully', 'success');
    } catch (error) {
      showToast('Password Update Error', error.message, 'error');
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        doctorProfile: user?.doctorProfile || null,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        logout,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

