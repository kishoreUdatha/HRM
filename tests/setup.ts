import axios from 'axios';

// Global test configuration
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Create axios instance for API calls
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Test data storage
export const testData = {
  tenantId: '',
  userId: '',
  accessToken: '',
  refreshToken: '',
  employeeId: '',
  departmentId: '',
};

// Helper function to set auth header
export const setAuthToken = (token: string) => {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// Helper function to set tenant header
export const setTenantId = (tenantId: string) => {
  api.defaults.headers.common['X-Tenant-ID'] = tenantId;
};

// Global setup
beforeAll(() => {
  console.log('🚀 Starting HRM Integration Tests');
  console.log(`📡 API Base URL: ${API_BASE_URL}`);
});

// Global teardown
afterAll(() => {
  console.log('✅ HRM Integration Tests Completed');
});

// Extend Jest matchers
expect.extend({
  toBeValidId(received) {
    const pass = typeof received === 'string' && received.length >= 20;
    return {
      pass,
      message: () => `expected ${received} to be a valid MongoDB ID`,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidId(): R;
    }
  }
}
