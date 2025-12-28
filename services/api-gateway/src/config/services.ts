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
  // ===========================================
  // CORE SERVICES
  // ===========================================
  // Auth admin routes - must come before general auth routes (more specific first)
  {
    name: 'auth-admin-service',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/api/auth/admin',
    targetPath: '/admin',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,  // Admin routes require authentication
  },
  // Super admin protected routes (me, list, add, etc.) - requires auth
  {
    name: 'auth-super-admin-protected',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/api/auth/super-admin/me',
    targetPath: '/super-admin/me',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'auth-super-admin-list',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/api/auth/super-admin/list',
    targetPath: '/super-admin/list',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'auth-super-admin-add',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/api/auth/super-admin/add',
    targetPath: '/super-admin/add',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'auth-super-admin-stats',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/api/auth/super-admin/platform-stats',
    targetPath: '/super-admin/platform-stats',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  // Super admin public routes (login, setup, refresh - no auth required)
  {
    name: 'auth-super-admin-login',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/api/auth/super-admin/login',
    targetPath: '/super-admin/login',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false,
  },
  {
    name: 'auth-super-admin-setup',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/api/auth/super-admin/setup',
    targetPath: '/super-admin/setup',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false,
  },
  {
    name: 'auth-super-admin-refresh',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/api/auth/super-admin/refresh',
    targetPath: '/super-admin/refresh',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false,
  },
  {
    name: 'auth-service',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    pathPrefix: '/api/auth',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false,  // Public - login/register endpoints
  },
  // Tenant admin routes (super admin only) - must come before public tenant routes
  {
    name: 'tenant-admin-service',
    url: process.env.TENANT_SERVICE_URL || 'http://localhost:3002',
    pathPrefix: '/api/tenants/admin',
    targetPath: '/admin',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,  // Requires authentication for admin routes
  },
  {
    name: 'tenant-service',
    url: process.env.TENANT_SERVICE_URL || 'http://localhost:3002',
    pathPrefix: '/api/tenants',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false,  // Public - tenant lookup for login
  },

  // ===========================================
  // EMPLOYEE MANAGEMENT
  // ===========================================
  {
    name: 'employee-service',
    url: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003',
    pathPrefix: '/api/employees',
    targetPath: '/employees',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'dashboard-service',
    url: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003',
    pathPrefix: '/api/dashboard',
    targetPath: '/dashboard',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'department-service',
    url: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003',
    pathPrefix: '/api/departments',
    targetPath: '/departments',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'shift-service',
    url: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003',
    pathPrefix: '/api/shifts',
    targetPath: '/shifts',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },

  // ===========================================
  // HR OPERATIONS
  // ===========================================
  {
    name: 'attendance-service',
    url: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3004',
    pathPrefix: '/api/attendance',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'leave-service',
    url: process.env.LEAVE_SERVICE_URL || 'http://localhost:3005',
    pathPrefix: '/api/leaves',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'payroll-service',
    url: process.env.PAYROLL_SERVICE_URL || 'http://localhost:3006',
    pathPrefix: '/api/payroll',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'notification-service',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
    pathPrefix: '/api/notifications',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },

  // ===========================================
  // REPORTS & ANALYTICS
  // ===========================================
  {
    name: 'reports-service',
    url: process.env.REPORTS_SERVICE_URL || 'http://localhost:3008',
    pathPrefix: '/api/reports',
    targetPath: '',
    healthCheck: '/health',
    timeout: 60000,  // Reports may take longer
    requiresAuth: true,
  },
  {
    name: 'analytics-service',
    url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3011',
    pathPrefix: '/api/analytics',
    targetPath: '',
    healthCheck: '/health',
    timeout: 60000,
    requiresAuth: true,
  },

  // ===========================================
  // COMMUNICATION
  // ===========================================
  {
    name: 'websocket-service',
    url: process.env.WEBSOCKET_SERVICE_URL || 'http://localhost:3009',
    pathPrefix: '/api/websocket',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'chat-service',
    url: process.env.CHAT_SERVICE_URL || 'http://localhost:3010',
    pathPrefix: '/api/chat',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },

  // ===========================================
  // DOCUMENTS & INTEGRATIONS
  // ===========================================
  {
    name: 'document-service',
    url: process.env.DOCUMENT_SERVICE_URL || 'http://localhost:3012',
    pathPrefix: '/api/documents',
    targetPath: '',
    healthCheck: '/health',
    timeout: 60000,  // Document uploads may take longer
    requiresAuth: true,
  },
  {
    name: 'integration-service',
    url: process.env.INTEGRATION_SERVICE_URL || 'http://localhost:3013',
    pathPrefix: '/api/integrations',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },

  // ===========================================
  // ENGAGEMENT & FEEDBACK
  // ===========================================
  {
    name: 'engagement-service',
    url: process.env.ENGAGEMENT_SERVICE_URL || 'http://localhost:3014',
    pathPrefix: '/api/engagement',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },

  // ===========================================
  // AI SERVICES
  // ===========================================
  {
    name: 'ai-chatbot-service',
    url: process.env.AI_CHATBOT_SERVICE_URL || 'http://localhost:3015',
    pathPrefix: '/api/chatbot',
    targetPath: '',
    healthCheck: '/health',
    timeout: 60000,  // AI responses may take longer
    requiresAuth: true,
  },
  {
    name: 'ai-ml-service',
    url: process.env.AI_ML_SERVICE_URL || 'http://localhost:3016',
    pathPrefix: '/api/ai',
    targetPath: '',
    healthCheck: '/health',
    timeout: 60000,
    requiresAuth: true,
  },

  // ===========================================
  // ADDITIONAL HR SERVICES
  // ===========================================
  {
    name: 'workforce-service',
    url: process.env.WORKFORCE_SERVICE_URL || 'http://localhost:3017',
    pathPrefix: '/api/workforce',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'recruitment-service',
    url: process.env.RECRUITMENT_SERVICE_URL || 'http://localhost:3018',
    pathPrefix: '/api/recruitment',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'localization-service',
    url: process.env.LOCALIZATION_SERVICE_URL || 'http://localhost:3019',
    pathPrefix: '/api/localization',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false,  // Localization data can be public
  },
  {
    name: 'benefits-service',
    url: process.env.BENEFITS_SERVICE_URL || 'http://localhost:3020',
    pathPrefix: '/api/benefits',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'onboarding-service',
    url: process.env.ONBOARDING_SERVICE_URL || 'http://localhost:3021',
    pathPrefix: '/api/onboarding',
    targetPath: '/api',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'compliance-service',
    url: process.env.COMPLIANCE_SERVICE_URL || 'http://localhost:3022',
    pathPrefix: '/api/compliance',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'expense-service',
    url: process.env.EXPENSE_SERVICE_URL || 'http://localhost:3023',
    pathPrefix: '/api/expenses',
    targetPath: '/api',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'timesheet-service',
    url: process.env.TIMESHEET_SERVICE_URL || 'http://localhost:3024',
    pathPrefix: '/api/timesheets',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'asset-service',
    url: process.env.ASSET_SERVICE_URL || 'http://localhost:3025',
    pathPrefix: '/api/assets',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },
  {
    name: 'grievance-service',
    url: process.env.GRIEVANCE_SERVICE_URL || 'http://localhost:3026',
    pathPrefix: '/api/grievances',
    targetPath: '',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,
  },

  // ===========================================
  // BILLING & SUBSCRIPTION
  // ===========================================
  // Billing admin routes (super admin only) - must come before public billing routes
  {
    name: 'billing-admin-service',
    url: process.env.BILLING_SERVICE_URL || 'http://localhost:3027',
    pathPrefix: '/api/billing/admin',
    targetPath: '/api/billing/admin',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,  // Requires authentication for admin routes
  },
  // Billing tenant routes (authenticated users)
  {
    name: 'billing-tenant-service',
    url: process.env.BILLING_SERVICE_URL || 'http://localhost:3027',
    pathPrefix: '/api/billing/subscriptions',
    targetPath: '/api/billing/subscriptions',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,  // Requires authentication for subscription management
  },
  {
    name: 'billing-invoices-service',
    url: process.env.BILLING_SERVICE_URL || 'http://localhost:3027',
    pathPrefix: '/api/billing/invoices',
    targetPath: '/api/billing/invoices',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: true,  // Requires authentication for invoice access
  },
  {
    name: 'billing-service',
    url: process.env.BILLING_SERVICE_URL || 'http://localhost:3027',
    pathPrefix: '/api/billing',
    targetPath: '/api/billing',
    healthCheck: '/health',
    timeout: 30000,
    requiresAuth: false,  // Public routes (plans, webhooks)
  },
];

export const getServiceByPath = (path: string): ServiceConfig | undefined => {
  return services.find((service) => path.startsWith(service.pathPrefix));
};
