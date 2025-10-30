import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';
// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    // Prefer JWT token if available
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    } else {
      // Fallback to x-employee-id for backward compatibility
      const employeeId = localStorage.getItem('employeeId');
      if (employeeId) {
        config.headers['x-employee-id'] = employeeId;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear all auth data on 401
      localStorage.removeItem('token');
      localStorage.removeItem('employeeId');
      localStorage.removeItem('employee');
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

