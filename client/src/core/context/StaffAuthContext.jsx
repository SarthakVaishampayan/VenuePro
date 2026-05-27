import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import staffApi from '../services/staffApi';

const StaffAuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '';

export function StaffAuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('staffUser');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('staffAccessToken');
    if (token && !user) {
      staffApi.get('/auth/me')
        .then(({ data }) => {
          if (data.data) {
            setUser(data.data);
            localStorage.setItem('staffUser', JSON.stringify(data.data));
          }
        })
        .catch(() => {
          localStorage.removeItem('staffAccessToken');
          localStorage.removeItem('staffRefreshToken');
          localStorage.removeItem('staffUser');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (phone, password) => {
    const { data } = await axios.post(`${API_BASE}/api/tenant/auth/staff-login`, { phone, password });
    const { accessToken, refreshToken, user: userData } = data.data;
    localStorage.setItem('staffAccessToken', accessToken);
    localStorage.setItem('staffRefreshToken', refreshToken);
    setUser(userData);
    localStorage.setItem('staffUser', JSON.stringify(userData));
    return data;
  }, []);

  const logout = useCallback(async () => {
    try { await staffApi.post('/auth/logout'); } catch {}
    localStorage.removeItem('staffAccessToken');
    localStorage.removeItem('staffRefreshToken');
    localStorage.removeItem('staffUser');
    setUser(null);
  }, []);

  const isAuthenticated = !!user;

  return (
    <StaffAuthContext.Provider value={{ user, login, logout, loading, isAuthenticated }}>
      {children}
    </StaffAuthContext.Provider>
  );
}

export const useStaffAuth = () => {
  const ctx = useContext(StaffAuthContext);
  if (!ctx) throw new Error('useStaffAuth must be used within StaffAuthProvider');
  return ctx;
};

export default StaffAuthContext;
