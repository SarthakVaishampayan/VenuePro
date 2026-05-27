import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import ownerApi from '../services/ownerApi';

const OwnerAuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '';

export function OwnerAuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ownerUser');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ownerAccessToken');
    if (token && !user) {
      ownerApi.get('/auth/me')
        .then(({ data }) => {
          if (data.data) {
            setUser(data.data);
            localStorage.setItem('ownerUser', JSON.stringify(data.data));
          }
        })
        .catch(() => {
          localStorage.removeItem('ownerAccessToken');
          localStorage.removeItem('ownerRefreshToken');
          localStorage.removeItem('ownerUser');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await axios.post(`${API_BASE}/api/tenant/auth/login`, { email, password });
    const { accessToken, refreshToken, user: userData } = data.data;
    localStorage.setItem('ownerAccessToken', accessToken);
    localStorage.setItem('ownerRefreshToken', refreshToken);
    setUser(userData);
    localStorage.setItem('ownerUser', JSON.stringify(userData));
    return data;
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('ownerUser', JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    try { await ownerApi.post('/auth/logout'); } catch {}
    localStorage.removeItem('ownerAccessToken');
    localStorage.removeItem('ownerRefreshToken');
    localStorage.removeItem('ownerUser');
    setUser(null);
  }, []);

  const isAuthenticated = !!user;

  return (
    <OwnerAuthContext.Provider value={{ user, login, logout, updateUser, loading, isAuthenticated }}>
      {children}
    </OwnerAuthContext.Provider>
  );
}

export const useOwnerAuth = () => {
  const ctx = useContext(OwnerAuthContext);
  if (!ctx) throw new Error('useOwnerAuth must be used within OwnerAuthProvider');
  return ctx;
};

export default OwnerAuthContext;
