import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const tokens = localStorage.getItem('tokens');
    if (tokens) {
      try {
        const { access } = JSON.parse(tokens);
        config.headers['Authorization'] = `Bearer ${access}`;
      } catch (error) {
        console.error('Error parsing tokens:', error);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const tokens = localStorage.getItem('tokens');
        if (tokens) {
          const { refresh } = JSON.parse(tokens);
          const response = await axios.post(`${API_URL}/token/refresh/`, {
            refresh
          });
          
          if (response.data.access) {
            const newTokens = { ...JSON.parse(tokens), access: response.data.access };
            localStorage.setItem('tokens', JSON.stringify(newTokens));
            originalRequest.headers['Authorization'] = `Bearer ${response.data.access}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        localStorage.removeItem('user');
        localStorage.removeItem('tokens');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;