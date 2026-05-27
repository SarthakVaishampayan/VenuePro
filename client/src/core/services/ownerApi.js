import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '';

const ownerApi = axios.create({
  baseURL: `${API_BASE}/api/tenant`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000
});

// Request interceptor — attach owner access token
ownerApi.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('ownerAccessToken');
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

ownerApi.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return ownerApi(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('ownerRefreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(`${API_BASE}/api/tenant/auth/refresh`, {
          refreshToken
        });

        const { accessToken, refreshToken: newRefresh } = data.data;
        localStorage.setItem('ownerAccessToken', accessToken);
        localStorage.setItem('ownerRefreshToken', newRefresh);

        processQueue(null, accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return ownerApi(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('ownerAccessToken');
        localStorage.removeItem('ownerRefreshToken');
        localStorage.removeItem('ownerUser');
        window.location.href = '/owner/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default ownerApi;
