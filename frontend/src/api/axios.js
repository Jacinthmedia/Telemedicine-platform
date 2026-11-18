import axios from 'axios';

const API_URL = 'http://192.168.137.1:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// ============================================
// REQUEST INTERCEPTOR — attach access token
// ============================================
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ============================================
// RESPONSE INTERCEPTOR — refresh token on 401
// ============================================
let isRefreshing = false;
let pendingRequests = [];

const processQueue = (error, token = null) => {
  pendingRequests.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  pendingRequests = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't try to refresh if the request was the refresh itself
    if (
      originalRequest?.url?.includes('/auth/token/refresh/') ||
      originalRequest?.url?.includes('/auth/login/') ||
      originalRequest?.url?.includes('/auth/register/')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const refresh = localStorage.getItem('refresh_token');

    // No refresh token → log out
    if (!refresh) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // If a refresh is already in flight, queue this request
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // ✅ Correct URL — matches backend /auth/token/refresh/
      const response = await axios.post(
        `${API_URL}/auth/token/refresh/`,
        { refresh }
      );

      // SimpleJWT returns { access: "..." } at the top level
      const newAccess = response.data.access;

      if (!newAccess) {
        throw new Error('No access token in refresh response');
      }

      localStorage.setItem('access_token', newAccess);

      // Retry original request with new token
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;

      // Flush queued requests
      processQueue(null, newAccess);

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      // Refresh failed → log out
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;