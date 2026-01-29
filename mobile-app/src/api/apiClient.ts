import axios, {AxiosInstance, AxiosError, InternalAxiosRequestConfig} from 'axios';
import {useAuthStore} from '../store/authStore';
import {authStorage} from '../services/authStorage';
import type {ApiResponse, AuthTokens} from '../types';

// API Base URL - Production deployment (Azure Container Apps - Central India)
// Change this URL when switching between environments:
// - Android Emulator: http://10.0.2.2:3000/api (emulator uses 10.0.2.2 for host machine)
// - Physical Device: http://10.241.49.192:3000/api (use your computer's IP)
// - Local Development: http://localhost:3000/api
// - Production (Azure): https://hrm-production-gateway.thankfulriver-4edafef0.centralindia.azurecontainerapps.io/api
const API_BASE_URL = 'https://hrm-production-gateway.thankfulriver-4edafef0.centralindia.azurecontainerapps.io/api';

if (__DEV__) {
  console.log('[API] Using base URL:', API_BASE_URL);
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000, // Increased timeout for face check-in
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to get tokens from multiple sources
const getAuthTokens = async (): Promise<AuthTokens | null> => {
  // First try Zustand store (fastest, in-memory)
  const storeState = useAuthStore.getState();
  if (storeState.tokens?.accessToken) {
    console.log('[API] Got token from Zustand store');
    return storeState.tokens;
  }

  // Fallback to secure storage (Keychain)
  console.log('[API] Zustand store has no token, checking Keychain...');
  const storedTokens = await authStorage.getTokens();
  if (storedTokens?.accessToken) {
    console.log('[API] Got token from Keychain, syncing to store');
    // Sync tokens back to Zustand store
    useAuthStore.getState().setTokens(storedTokens);
    return storedTokens;
  }

  console.log('[API] No tokens found in any storage');
  return null;
};

// Request interceptor to add auth token and tenant ID
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const {tenant, isAuthenticated} = useAuthStore.getState();
    const tokens = await getAuthTokens();

    console.log('[API] ========== REQUEST ==========');
    console.log('[API] URL:', config.url);
    console.log('[API] Method:', config.method?.toUpperCase());
    console.log('[API] Is Authenticated:', isAuthenticated);
    console.log('[API] Has Token:', !!tokens?.accessToken);
    console.log('[API] Token Preview:', tokens?.accessToken?.substring(0, 20) + '...');
    console.log('[API] Has Tenant:', !!tenant?._id);
    console.log('[API] Tenant ID:', tenant?._id);

    // Add Authorization header
    if (tokens?.accessToken) {
      config.headers.Authorization = `Bearer ${tokens.accessToken}`;
      console.log('[API] Authorization header SET');
    } else {
      console.log('[API] WARNING: No token available for request!');
    }

    // Add tenant ID header
    if (tenant?._id) {
      config.headers['X-Tenant-ID'] = tenant._id;
    }

    console.log('[API] ================================');
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {_retry?: boolean};

    // Handle 401 Unauthorized - attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const {tokens} = useAuthStore.getState();

        if (tokens?.refreshToken) {
          // Attempt to refresh the token
          const response = await axios.post<ApiResponse<{accessToken: string; refreshToken: string}>>(
            `${API_BASE_URL}/auth/refresh`,
            {refreshToken: tokens.refreshToken}
          );

          if (response.data.success && response.data.data) {
            const newTokens = response.data.data;

            // Update tokens in store and secure storage
            useAuthStore.getState().setTokens(newTokens);
            await authStorage.setTokens(newTokens);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`;
            return apiClient(originalRequest);
          }
        }

        // If refresh fails, logout
        useAuthStore.getState().logout();
        await authStorage.clearTokens();
      } catch (refreshError) {
        // Refresh failed, logout user
        useAuthStore.getState().logout();
        await authStorage.clearTokens();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Helper function to handle API errors
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{message?: string; error?: string}>;

    if (axiosError.response?.data?.message) {
      return axiosError.response.data.message;
    }

    if (axiosError.response?.data?.error) {
      return axiosError.response.data.error;
    }

    switch (axiosError.response?.status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Session expired. Please login again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'Resource not found.';
      case 500:
        return 'Server error. Please try again later.';
      default:
        return axiosError.message || 'An unexpected error occurred.';
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred.';
}

export default apiClient;
