import apiClient from './apiClient';
import type {User, Tenant, ApiResponse, AuthTokens} from '../types';

export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface TenantLookupResponse {
  tenant: Tenant;
}

export const authApi = {
  /**
   * Login with email and password
   */
  async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await apiClient.post<ApiResponse<LoginResponse>>('/auth/login', data);
    return response.data;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>('/auth/logout');
    return response.data;
  },

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<ApiResponse<AuthTokens>> {
    const response = await apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return response.data;
  },

  /**
   * Change password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    const response = await apiClient.post<ApiResponse<null>>('/auth/change-password', {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  /**
   * Lookup tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<ApiResponse<Tenant>> {
    const response = await apiClient.get<ApiResponse<Tenant>>(`/tenants/by-slug/${slug}`);
    return response.data;
  },

  /**
   * Check if tenant slug is available
   */
  async checkSlugAvailability(slug: string): Promise<ApiResponse<{available: boolean}>> {
    const response = await apiClient.get<ApiResponse<{available: boolean}>>(
      `/tenants/check-slug/${slug}`
    );
    return response.data;
  },

  /**
   * Setup 2FA
   */
  async setup2FA(): Promise<ApiResponse<{qrCode: string; secret: string}>> {
    const response = await apiClient.post<ApiResponse<{qrCode: string; secret: string}>>(
      '/auth/2fa/setup'
    );
    return response.data;
  },

  /**
   * Verify 2FA code
   */
  async verify2FA(code: string): Promise<ApiResponse<{verified: boolean}>> {
    const response = await apiClient.post<ApiResponse<{verified: boolean}>>('/auth/2fa/verify', {
      code,
    });
    return response.data;
  },

  /**
   * Get 2FA status
   */
  async get2FAStatus(): Promise<ApiResponse<{enabled: boolean}>> {
    const response = await apiClient.get<ApiResponse<{enabled: boolean}>>('/auth/2fa/status');
    return response.data;
  },
};
