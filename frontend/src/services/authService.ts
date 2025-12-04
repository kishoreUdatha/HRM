import api from './api';
import type { AuthResponse, LoginCredentials, RegisterData, User, TenantRegisterData, Tenant } from '../types';

export const authService = {
  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  // Register user for existing tenant
  register: async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    return response.data;
  },

  // Register new organization (tenant + admin user)
  registerOrganization: async (data: TenantRegisterData): Promise<{ tenant: Tenant; user: User; accessToken: string; refreshToken: string }> => {
    // Step 1: Create tenant
    const tenantResponse = await api.post<{ success: boolean; data: Tenant }>('/tenants', {
      name: data.organizationName,
      slug: data.slug,
    });

    const tenant = tenantResponse.data.data;

    // Step 2: Create admin user for the tenant
    const authResponse = await api.post<AuthResponse>('/auth/register', {
      tenantId: tenant._id,
      email: data.adminEmail,
      password: data.adminPassword,
      firstName: data.adminFirstName,
      lastName: data.adminLastName,
      role: 'tenant_admin',
    });

    return {
      tenant,
      user: authResponse.data.user,
      accessToken: authResponse.data.accessToken,
      refreshToken: authResponse.data.refreshToken,
    };
  },

  // Logout
  logout: async (): Promise<void> => {
    const refreshToken = localStorage.getItem('refreshToken');
    await api.post('/auth/logout', { refreshToken });
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('tenantId');
  },

  // Get current user
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<{ success: boolean; data: User }>('/auth/me');
    return response.data.data;
  },

  // Refresh token
  refreshToken: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await api.post<{ accessToken: string }>('/auth/refresh', {
      refreshToken,
    });
    return response.data;
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },

  // Check if slug is available
  checkSlugAvailability: async (slug: string): Promise<boolean> => {
    const response = await api.get<{ success: boolean; data: { available: boolean } }>(
      `/tenants/check-slug/${slug}`
    );
    return response.data.data.available;
  },

  // Get tenant by slug (for login page)
  getTenantBySlug: async (slug: string): Promise<Tenant> => {
    const response = await api.get<{ success: boolean; data: Tenant }>(`/tenants/by-slug/${slug}`);
    return response.data.data;
  },

  // Get tenant by ID
  getTenantById: async (id: string): Promise<Tenant> => {
    const response = await api.get<{ success: boolean; data: Tenant }>(`/tenants/${id}`);
    return response.data.data;
  },
};
