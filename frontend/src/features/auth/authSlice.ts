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
  isLoading: false,
  error: null,
};

export const login = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('refreshToken', response.refreshToken);
      localStorage.setItem('tenantId', response.user.tenantId);
      return response;
    } catch (error: unknown) {
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

export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        return rejectWithValue('No token found');
      }
      const user = await authService.getCurrentUser();
      const tenantId = localStorage.getItem('tenantId');
      let tenant = null;
      if (tenantId) {
        try {
          tenant = await authService.getTenantById(tenantId);
        } catch {
          // Tenant fetch failed, continue without tenant
        }
      }
      return { user, tenant };
    } catch (error: unknown) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tenantId');
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
