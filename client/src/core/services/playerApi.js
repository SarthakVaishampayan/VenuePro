import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const playerApi = axios.create({
  baseURL: `${API_BASE}/api/player`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});

// Request interceptor — attach player access token
playerApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('playerAccessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

playerApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return playerApi(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('playerRefreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE}/api/player/auth/refresh`, {
          refreshToken
        });

        const { accessToken, refreshToken: newRefresh } = data.data;
        localStorage.setItem('playerAccessToken', accessToken);
        localStorage.setItem('playerRefreshToken', newRefresh);

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return playerApi(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('playerAccessToken');
        localStorage.removeItem('playerRefreshToken');
        localStorage.removeItem('playerUser');
        window.location.href = '/play/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default playerApi;
