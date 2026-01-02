import axios, { AxiosError } from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// Production API URL - Azure VM
const API_URL = import.meta.env.VITE_API_URL || 'http://135.171.160.105/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token and tenant context
api.interceptors.request.use(
  (config) => {
    // Check for super admin token first, then regular token
    const superAdminToken = localStorage.getItem('superAdminAccessToken');
    const token = localStorage.getItem('accessToken');

    if (superAdminToken) {
      config.headers.Authorization = `Bearer ${superAdminToken}`;
    } else if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add tenant context from localStorage (for API calls after login)
    const tenantId = localStorage.getItem('tenantId');
    if (tenantId) {
      config.headers['X-Tenant-ID'] = tenantId;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Check if this is a super admin session
      const isSuperAdmin = !!localStorage.getItem('superAdminAccessToken');

      try {
        if (isSuperAdmin) {
          // Handle super admin token refresh
          const refreshToken = localStorage.getItem('superAdminRefreshToken');
          if (refreshToken) {
            const response = await axios.post(`${API_URL}/auth/super-admin/refresh`, {
              refreshToken,
            });

            const { accessToken } = response.data;
            localStorage.setItem('superAdminAccessToken', accessToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        } else {
          // Handle regular user token refresh
          const refreshToken = localStorage.getItem('refreshToken');
          if (refreshToken) {
            const response = await axios.post(`${API_URL}/auth/refresh`, {
              refreshToken,
            });

            const { accessToken } = response.data;
            localStorage.setItem('accessToken', accessToken);

            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return api(originalRequest);
          }
        }
      } catch {
        if (isSuperAdmin) {
          localStorage.removeItem('superAdminAccessToken');
          localStorage.removeItem('superAdminRefreshToken');
          localStorage.removeItem('superAdminRole');
          localStorage.removeItem('superAdminUser');
          window.location.href = '/super-admin/login';
        } else {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('tenantId');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
