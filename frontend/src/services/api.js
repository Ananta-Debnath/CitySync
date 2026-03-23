import axios from 'axios';

// API base URL: read from environment with sensible fallbacks.
// For Create React App use `REACT_APP_API_URL`; for Vite use `VITE_API_URL`.
var API_URL = process.env.REACT_APP_API_URL || process.env.VITE_API_URL || 'http://localhost:5000';

API_URL = API_URL + (API_URL.endsWith('/api') ? '' : '/api'); // Ensure it ends with /api

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('citysync_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Region APIs
export const getRegions = () => api.get('/public/regions');
export const createRegion = (data) => api.post('/regions', data);
export const updateRegion = (id, data) => api.put(`/regions/${id}`, data);
export const deleteRegion = (id) => api.delete(`/regions/${id}`);

// Consumer APIs
export const getConsumers = () => api.get('/consumers');

// Auth APIs (you'll need to create these endpoints in backend)
export const login = (credentials) => api.post('/auth/login', credentials);
export const register = (userData) => api.post('/auth/register', userData);

export default api;