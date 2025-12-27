// User & Auth Types
export interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'tenant_admin' | 'hr' | 'manager' | 'employee';
  tenantId: string;
  employeeId?: string;
  profileImage?: string;
  isActive: boolean;
  twoFactorEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  settings?: TenantSettings;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  createdAt: string;
}

export interface TenantSettings {
  timezone: string;
  dateFormat: string;
  currency: string;
  workingHours?: {
    start: string;
    end: string;
  };
  geofencing?: {
    enabled: boolean;
    locations: GeoLocation[];
    radius: number; // in meters
  };
}

export interface GeoLocation {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// Employee Types
export interface EmployeeSalary {
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  currency: string;
}

export interface Employee {
  _id: string;
  tenantId: string;
  userId?: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  profileImage?: string;
  faceEncodingUrl?: string; // For face verification
  faceEnrolled?: boolean;
  faceEnrollmentDate?: string;
  departmentId: string;
  department?: Department;
  designation: string;
  joiningDate: string;
  reportingManagerId?: string;
  reportingManager?: Employee;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'intern';
  status: 'active' | 'inactive' | 'terminated' | 'on-leave';
  shiftId?: string;
  salary?: EmployeeSalary;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  headId?: string;
}

// Attendance Types
export interface Attendance {
  _id: string;
  tenantId: string;
  employeeId: string;
  date: string;
  checkIn?: string;
  checkOut?: string;
  checkInLocation?: GeoLocation;
  checkOutLocation?: GeoLocation;
  faceImageUrl?: string;
  faceVerificationScore?: number;
  faceVerified?: boolean;
  status: 'present' | 'absent' | 'half-day' | 'late' | 'on-leave' | 'holiday';
  workHours?: number;
  overtimeHours?: number;
  breakDuration?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  holidays: number;
  weekends: number;
  totalWorkHours: number;
  totalOvertimeHours: number;
}

// Leave Types
export interface LeaveType {
  _id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  defaultDays: number;
  carryForward: boolean;
  maxCarryForward?: number;
  isPaid: boolean;
  requiresApproval: boolean;
  isActive: boolean;
}

export interface LeaveBalance {
  _id: string;
  tenantId: string;
  employeeId: string;
  year: number;
  balances: {
    leaveTypeId: string;
    leaveType?: LeaveType;
    total: number;
    used: number;
    pending: number;
    available: number;
    carriedForward: number;
  }[];
}

export interface LeaveRequest {
  _id: string;
  tenantId: string;
  employeeId: string;
  employee?: Employee;
  leaveTypeId: string | { _id: string; name: string; code: string };
  leaveType?: LeaveType;
  startDate: string;
  endDate: string;
  days?: number; // API returns 'days' field
  totalDays?: number; // Alternative field name
  isHalfDay?: boolean;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approverId?: string;
  approver?: User;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

// Holiday Types
export interface Holiday {
  _id: string;
  tenantId: string;
  name: string;
  date: string;
  type: 'public' | 'restricted' | 'optional';
  description?: string;
  isNational: boolean;
}

// Timesheet Types
export interface Timesheet {
  _id: string;
  tenantId: string;
  employeeId: string;
  weekStartDate: string;
  weekEndDate: string;
  periodType: 'weekly' | 'bi-weekly' | 'monthly';
  entries: TimesheetEntry[];
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  billableHours: number;
  nonBillableHours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked';
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimesheetEntry {
  _id: string;
  date: string;
  projectId: string;
  project?: Project;
  taskId?: string;
  taskName?: string;
  hours: number;
  description?: string;
  isBillable: boolean;
  billableHours?: number;
  overtime: boolean;
  overtimeType?: 'regular' | 'weekend' | 'holiday';
}

export interface Project {
  _id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  status: 'active' | 'completed' | 'on_hold' | 'cancelled';
  startDate?: string;
  endDate?: string;
}

// Payroll Types
export interface Payslip {
  _id: string;
  tenantId: string;
  employeeId: string;
  employee?: Employee;
  month: number;
  year: number;
  basicSalary: number;
  earnings: PayComponent[];
  deductions: PayComponent[];
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  status: 'draft' | 'approved' | 'paid' | 'cancelled';
  paidAt?: string;
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PayComponent {
  name: string;
  code: string;
  amount: number;
  type: 'fixed' | 'percentage';
  isRecurring: boolean;
}

// Notification Types
export interface Notification {
  _id: string;
  tenantId: string;
  userId: string;
  category: 'leave' | 'attendance' | 'payroll' | 'timesheet' | 'general' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Navigation Types
export type RootStackParamList = {
  Onboarding: undefined;
  TenantDetection: undefined;
  Login: undefined;
  MainTabs: undefined;
  FaceCheckIn: undefined;
  FaceCheckOut: undefined;
  FaceEnrollment: undefined;
  ApplyLeave: undefined;
  LeaveDetail: {leaveId: string};
  PayslipDetail: {payslipId: string};
  TimesheetDetail: {timesheetId: string};
  Profile: undefined;
  Settings: undefined;
  Notifications: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  Attendance: undefined;
  Leave: undefined;
  Payroll: undefined;
  More: undefined;
};
