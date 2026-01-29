import {create} from 'zustand';
import {persist, createJSONStorage} from 'zustand/middleware';
import {MMKV} from 'react-native-mmkv';
import type {User, Tenant, AuthTokens, Employee} from '../types';

const storage = new MMKV();

const zustandStorage = {
  setItem: (name: string, value: string) => {
    return storage.set(name, value);
  },
  getItem: (name: string) => {
    const value = storage.getString(name);
    return value ?? null;
  },
  removeItem: (name: string) => {
    return storage.delete(name);
  },
};

interface AuthState {
  // Auth state
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  employee: Employee | null;
  tenant: Tenant | null;
  tokens: AuthTokens | null;

  // App preferences
  isDarkMode: boolean;
  isOnboarded: boolean;

  // Actions
  setUser: (user: User) => void;
  setEmployee: (employee: Employee) => void;
  setTenant: (tenant: Tenant) => void;
  setTokens: (tokens: AuthTokens) => void;
  login: (user: User, tokens: AuthTokens, tenant: Tenant, employee?: Employee) => void;
  logout: () => void;
  setLoading: (isLoading: boolean) => void;
  setDarkMode: (isDarkMode: boolean) => void;
  setOnboarded: (isOnboarded: boolean) => void;
  updateProfile: (updates: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      isAuthenticated: false,
      isLoading: true,
      user: null,
      employee: null,
      tenant: null,
      tokens: null,
      isDarkMode: false,
      isOnboarded: false,

      // Actions
      setUser: (user: User) => set({user}),

      setEmployee: (employee: Employee) => set({employee}),

      setTenant: (tenant: Tenant) => set({tenant}),

      setTokens: (tokens: AuthTokens) => set({tokens}),

      login: (user: User, tokens: AuthTokens, tenant: Tenant, employee?: Employee) =>
        set({
          isAuthenticated: true,
          user,
          tokens,
          tenant,
          employee: employee || null,
          isLoading: false,
        }),

      logout: () =>
        set({
          isAuthenticated: false,
          user: null,
          employee: null,
          tokens: null,
          // Keep tenant for quick re-login
          isLoading: false,
        }),

      setLoading: (isLoading: boolean) => set({isLoading}),

      setDarkMode: (isDarkMode: boolean) => set({isDarkMode}),

      setOnboarded: (isOnboarded: boolean) => set({isOnboarded}),

      updateProfile: (updates: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({user: {...currentUser, ...updates}});
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => zustandStorage),
      partialize: (state) => ({
        user: state.user,
        employee: state.employee,
        tenant: state.tenant,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
        isDarkMode: state.isDarkMode,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
);

// Selector hooks for better performance
export const useUser = () => useAuthStore(state => state.user);
export const useEmployee = () => useAuthStore(state => state.employee);
export const useTenant = () => useAuthStore(state => state.tenant);
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
export const useIsDarkMode = () => useAuthStore(state => state.isDarkMode);

// Admin role check helper
export const useIsAdmin = () => useAuthStore(state => {
  const role = state.user?.role;
  return role === 'tenant_admin' || role === 'hr' || role === 'manager' || role === 'super_admin';
});

// Check specific permissions
export const useHasPermission = (permission: string) => useAuthStore(state => {
  const role = state.user?.role;
  if (role === 'super_admin' || role === 'tenant_admin') return true;
  // Add more granular permission checks here if needed
  return false;
});
