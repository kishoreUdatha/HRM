// Service Registry Configuration
export interface ServiceConfig {
  name: string;
  url: string;
  pathPrefix: string;
  targetPath: string;  // The path prefix expected by the target service
  healthCheck: string;
  timeout: number;
  requiresAuth: boolean;
}

export const services: ServiceConfig[] = [
  {
    name: 'auth-service',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/api/auth',
    targetPath: '',  // Auth service routes at root: /login, /register, etc.
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false,
  },
  {
    name: 'tenant-service',
    url: process.env.TENANT_SERVICE_URL || 'http://localhost:3002',
    pathPrefix: '/api/tenants',
    targetPath: '',  // Tenant service routes at root: /, /:id, etc.
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false, // Public endpoints for login/registration
  },
  {
    name: 'employee-service',
    url: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003',
    pathPrefix: '/api/employees',
    targetPath: '/employees',  // Employee service routes at /employees
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false,  // Temporarily disabled for debugging
  },
  {
    name: 'attendance-service',
    url: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3004',
    pathPrefix: '/api/attendance',
    targetPath: '',  // Attendance service routes at root
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'leave-service',
    url: process.env.LEAVE_SERVICE_URL || 'http://localhost:3005',
    pathPrefix: '/api/leaves',
    targetPath: '',  // Leave service routes at root
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'payroll-service',
    url: process.env.PAYROLL_SERVICE_URL || 'http://localhost:3006',
    pathPrefix: '/api/payroll',
    targetPath: '',  // Payroll service routes at root
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'notification-service',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
    pathPrefix: '/api/notifications',
    targetPath: '',  // Notification service routes at root
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'dashboard-service',
    url: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003',
    pathPrefix: '/api/dashboard',
    targetPath: '/dashboard',  // Employee service routes at /dashboard
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false,  // Temporarily disabled for debugging
  },
  {
    name: 'department-service',
    url: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003',
    pathPrefix: '/api/departments',
    targetPath: '/departments',  // Employee service routes at /departments
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false,  // Temporarily disabled for debugging
  },
  {
    name: 'shift-service',
    url: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003',
    pathPrefix: '/api/shifts',
    targetPath: '/shifts',  // Employee service routes at /shifts
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false,
  },
];

export const getServiceByPath = (path: string): ServiceConfig | undefined => {
  return services.find((service) => path.startsWith(service.pathPrefix));
};
