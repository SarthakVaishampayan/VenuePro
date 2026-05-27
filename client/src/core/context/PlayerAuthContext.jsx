import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import playerApi from '../services/playerApi';

const PlayerAuthContext = createContext(null);

const API_BASE = import.meta.env.VITE_API_URL || '';

export function PlayerAuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('playerUser');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('playerAccessToken');
    if (token && !user) {
      playerApi.get('/auth/me')
        .then(({ data }) => {
          if (data.data) {
            setUser(data.data);
            localStorage.setItem('playerUser', JSON.stringify(data.data));
          }
        })
        .catch(() => {
          localStorage.removeItem('playerAccessToken');
          localStorage.removeItem('playerRefreshToken');
          localStorage.removeItem('playerUser');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const payload = {};
    if (email && email.includes('@')) {
      payload.email = email;
    } else {
      payload.phone = email; // Also accept phone number in the login field
    }
    payload.password = password;

    const { data } = await axios.post(`${API_BASE}/api/player/auth/login`, payload);
    const { accessToken, refreshToken, user: userData } = data.data;
    localStorage.setItem('playerAccessToken', accessToken);
    localStorage.setItem('playerRefreshToken', refreshToken);
    setUser(userData);
    localStorage.setItem('playerUser', JSON.stringify(userData));
    return data;
  }, []);

  const signup = useCallback(async (formData) => {
    const { data } = await axios.post(`${API_BASE}/api/player/auth/signup`, formData);
    const { accessToken, refreshToken, user: userData } = data.data;
    localStorage.setItem('playerAccessToken', accessToken);
    localStorage.setItem('playerRefreshToken', refreshToken);
    setUser(userData);
    localStorage.setItem('playerUser', JSON.stringify(userData));
    return data;
  }, []);

  const updateUser = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('playerUser', JSON.stringify(userData));
  }, []);

  const logout = useCallback(async () => {
    try { await playerApi.post('/auth/logout'); } catch {}
    localStorage.removeItem('playerAccessToken');
    localStorage.removeItem('playerRefreshToken');
    localStorage.removeItem('playerUser');
    setUser(null);
  }, []);

  const isAuthenticated = !!user;

  return (
    <PlayerAuthContext.Provider value={{ user, login, signup, logout, updateUser, loading, isAuthenticated }}>
      {children}
    </PlayerAuthContext.Provider>
  );
}

export const usePlayerAuth = () => {
  const ctx = useContext(PlayerAuthContext);
  if (!ctx) throw new Error('usePlayerAuth must be used within PlayerAuthProvider');
  return ctx;
};

export default PlayerAuthContext;
