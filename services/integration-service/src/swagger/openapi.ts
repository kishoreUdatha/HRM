export const openAPISpec = {
  openapi: '3.0.0',
  info: {
    title: 'HRM SaaS API',
    version: '1.0.0',
    description: 'Human Resource Management SaaS Platform API Documentation',
    contact: { name: 'HRM Support', email: 'support@hrm.com' },
    license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' }
  },
  servers: [
    { url: 'http://localhost:3000/api', description: 'Development server' },
    { url: 'https://api.hrm.com', description: 'Production server' }
  ],
  tags: [
    { name: 'Authentication', description: 'User authentication and authorization' },
    { name: 'Employees', description: 'Employee management' },
    { name: 'Departments', description: 'Department management' },
    { name: 'Attendance', description: 'Attendance tracking' },
    { name: 'Leaves', description: 'Leave management' },
    { name: 'Payroll', description: 'Payroll processing' },
    { name: 'Documents', description: 'Document management' },
    { name: 'Analytics', description: 'Analytics and reporting' },
    { name: 'Webhooks', description: 'Webhook management' },
    { name: 'Integrations', description: 'Third-party integrations' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      apiKeyAuth: { type: 'apiKey', in: 'header', name: 'X-API-Key' }
    },
    schemas: {
      Error: { type: 'object', properties: { success: { type: 'boolean', example: false }, message: { type: 'string' } } },
      Pagination: { type: 'object', properties: { page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, pages: { type: 'integer' } } },
      Employee: {
        type: 'object',
        properties: {
          _id: { type: 'string' }, tenantId: { type: 'string' }, employeeId: { type: 'string' },
          firstName: { type: 'string' }, lastName: { type: 'string' }, email: { type: 'string', format: 'email' },
          phone: { type: 'string' }, department: { type: 'string' }, designation: { type: 'string' },
          dateOfJoining: { type: 'string', format: 'date' }, status: { type: 'string', enum: ['active', 'inactive', 'terminated'] }
        }
      },
      Attendance: {
        type: 'object',
        properties: {
          _id: { type: 'string' }, employeeId: { type: 'string' }, date: { type: 'string', format: 'date' },
          checkIn: { type: 'string', format: 'date-time' }, checkOut: { type: 'string', format: 'date-time' },
          status: { type: 'string', enum: ['present', 'absent', 'late', 'half_day', 'on_leave'] }, workHours: { type: 'number' }
        }
      },
      LeaveRequest: {
        type: 'object',
        properties: {
          _id: { type: 'string' }, employeeId: { type: 'string' }, leaveType: { type: 'string' },
          startDate: { type: 'string', format: 'date' }, endDate: { type: 'string', format: 'date' },
          reason: { type: 'string' }, status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'cancelled'] }
        }
      },
      Payroll: {
        type: 'object',
        properties: {
          _id: { type: 'string' }, employeeId: { type: 'string' }, month: { type: 'integer' }, year: { type: 'integer' },
          baseSalary: { type: 'number' }, grossSalary: { type: 'number' }, totalDeductions: { type: 'number' },
          netSalary: { type: 'number' }, status: { type: 'string', enum: ['draft', 'processed', 'paid'] }
        }
      },
      Webhook: {
        type: 'object',
        properties: {
          _id: { type: 'string' }, name: { type: 'string' }, url: { type: 'string', format: 'uri' },
          events: { type: 'array', items: { type: 'string' } }, isActive: { type: 'boolean' }
        }
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/login': {
      post: {
        tags: ['Authentication'], summary: 'User login', security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['email', 'password'], properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } } } } } },
        responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } }
      }
    },
    '/employees': {
      get: {
        tags: ['Employees'], summary: 'Get all employees',
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 } },
          { name: 'department', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string' } }
        ],
        responses: { '200': { description: 'List of employees' } }
      },
      post: {
        tags: ['Employees'], summary: 'Create new employee',
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/Employee' } } } },
        responses: { '201': { description: 'Employee created' } }
      }
    },
    '/employees/{id}': {
      get: { tags: ['Employees'], summary: 'Get employee by ID', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Employee details' } } },
      put: { tags: ['Employees'], summary: 'Update employee', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Employee updated' } } },
      delete: { tags: ['Employees'], summary: 'Delete employee', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Employee deleted' } } }
    },
    '/attendance/check-in': { post: { tags: ['Attendance'], summary: 'Check in', responses: { '200': { description: 'Check-in successful' } } } },
    '/attendance/check-out': { post: { tags: ['Attendance'], summary: 'Check out', responses: { '200': { description: 'Check-out successful' } } } },
    '/leaves': {
      get: { tags: ['Leaves'], summary: 'Get leave requests', responses: { '200': { description: 'List of leave requests' } } },
      post: { tags: ['Leaves'], summary: 'Create leave request', responses: { '201': { description: 'Leave request created' } } }
    },
    '/leaves/{id}/approve': { post: { tags: ['Leaves'], summary: 'Approve leave request', parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }], responses: { '200': { description: 'Leave approved' } } } },
    '/payroll': {
      get: { tags: ['Payroll'], summary: 'Get payroll records', responses: { '200': { description: 'List of payroll records' } } },
      post: { tags: ['Payroll'], summary: 'Generate payroll', responses: { '201': { description: 'Payroll generated' } } }
    },
    '/webhooks': {
      get: { tags: ['Webhooks'], summary: 'Get webhooks', responses: { '200': { description: 'List of webhooks' } } },
      post: { tags: ['Webhooks'], summary: 'Create webhook', responses: { '201': { description: 'Webhook created' } } }
    },
    '/webhooks/events': { get: { tags: ['Webhooks'], summary: 'Get available webhook events', responses: { '200': { description: 'List of events' } } } }
  }
};
