import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { User, LoginCredentials, TenantRegisterData, Tenant } from '../../types';
import { authService } from '../../services/authService';

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true, // Start with loading true to prevent rendering before auth check
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      console.log('[login] Attempting login');
      const response = await authService.login(credentials);
      console.log('[login] Login successful, saving tokens');
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('tenantId', response.user.tenantId);
      console.log('[login] Tokens saved to localStorage');
      console.log('[login] AccessToken:', response.accessToken.substring(0, 20) + '...');
      console.log('[login] TenantId:', response.user.tenantId);
      return response;
    } catch (error: unknown) {
      console.error('[login] Login failed:', error);
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Login failed');
    }
  }
);

export const registerOrganization = createAsyncThunk(
  'auth/registerOrganization',
  async (data: TenantRegisterData, { rejectWithValue }) => {
    try {
      const response = await authService.registerOrganization(data);
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('tenantId', response.tenant._id);
      return response;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Registration failed');
    }
  }
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authService.logout();
});

export const getCurrentUser = createAsyncThunk(
  'auth/getCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await authService.getCurrentUser();
      return user;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Failed to get user');
    }
  }
);

export const getTenantBySlug = createAsyncThunk(
  'auth/getTenantBySlug',
  async (slug: string, { rejectWithValue }) => {
    try {
      const tenant = await authService.getTenantBySlug(slug);
      return tenant;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Organization not found');
    }
  }
);

// Helper function to check if JWT token is expired
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const isExpired = now >= exp;

    console.log('[isTokenExpired] Token expiration check:');
    console.log('[isTokenExpired] Current time:', new Date(now).toISOString());
    console.log('[isTokenExpired] Token expires:', new Date(exp).toISOString());
    console.log('[isTokenExpired] Is expired:', isExpired);
    console.log('[isTokenExpired] Time until expiry (minutes):', ((exp - now) / 1000 / 60).toFixed(2));

    return isExpired;
  } catch (error) {
    console.error('[isTokenExpired] Failed to parse token:', error);
    return true; // If we can't parse the token, consider it expired
  }
};

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      console.log('[checkAuth] Starting authentication check');
      const token = localStorage.getItem('accessToken');
      console.log('[checkAuth] Token found:', token ? 'Yes' : 'No');

      if (!token) {
        console.log('[checkAuth] No token found in localStorage');
        return rejectWithValue('No token found');
      }

      // Check if token is expired before making API call
      if (isTokenExpired(token)) {
        console.log('[checkAuth] Token is expired - will attempt refresh via interceptor');
        // DON'T clear localStorage - let the axios interceptor attempt token refresh first
        return rejectWithValue('Token expired');
      }

      console.log('[checkAuth] Token is valid, fetching user data');
      const user = await authService.getCurrentUser();
      console.log('[checkAuth] User data fetched:', user?.email);

      const tenantId = localStorage.getItem('tenantId');
      let tenant: Tenant | null = null;
      if (tenantId) {
        try {
          tenant = await authService.getTenantById(tenantId);
          console.log('[checkAuth] Tenant data fetched:', tenant?.slug);
        } catch {
          console.warn('[checkAuth] Tenant fetch failed, continuing without tenant');
        }
      }
      console.log('[checkAuth] Authentication successful');
      return { user, tenant };
    } catch (error: unknown) {
      console.error('[checkAuth] Authentication failed:', error);
      // DON'T clear localStorage here - let the axios interceptor handle token refresh
      // Only clear if it's truly expired (caught by interceptor after refresh fails)
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || 'Session expired');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setTenant: (state, action: PayloadAction<Tenant>) => {
      state.tenant = action.payload;
    },
    clearTenant: (state) => {
      state.tenant = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Register Organization
      .addCase(registerOrganization.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerOrganization.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tenant = action.payload.tenant;
      })
      .addCase(registerOrganization.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.tenant = null;
        state.isAuthenticated = false;
      })
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(getCurrentUser.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
      })
      // Get Tenant by Slug
      .addCase(getTenantBySlug.fulfilled, (state, action) => {
        state.tenant = action.payload;
      })
      // Check Auth
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.tenant = action.payload.tenant;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.tenant = null;
      });
  },
});

export const { clearError, setTenant, clearTenant } = authSlice.actions;
export default authSlice.reducer;
