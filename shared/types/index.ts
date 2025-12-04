// ============================================
// HRM SaaS - Shared Types
// ============================================

// Multi-Tenancy Types
export interface ITenant {
  _id: string;
  name: string;
  slug: string;
  domain?: string;
  logo?: string;
  settings: TenantSettings;
  subscription: Subscription;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantSettings {
  timezone: string;
  dateFormat: string;
  currency: string;
  language: string;
  workingDays: number[];
  workingHours: { start: string; end: string };
  leavePolicy: LeavePolicy;
  attendanceSettings: AttendanceSettings;
}

export interface LeavePolicy {
  casualLeaves: number;
  sickLeaves: number;
  annualLeaves: number;
  maternityLeaves: number;
  paternityLeaves: number;
  carryForward: boolean;
  maxCarryForward: number;
}

export interface AttendanceSettings {
  allowRemoteCheckIn: boolean;
  requireGeolocation: boolean;
  allowFlexibleHours: boolean;
  graceTimeMins: number;
  halfDayHours: number;
  fullDayHours: number;
}

export interface Subscription {
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  maxEmployees: number;
  maxAdmins: number;
  features: string[];
  startDate: Date;
  endDate: Date;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
}

// User Types
export interface IUser {
  _id: string;
  tenantId: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
  avatar?: string;
  employeeId?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = 'super_admin' | 'tenant_admin' | 'hr' | 'manager' | 'employee';

// Employee Types
export interface IEmployee {
  _id: string;
  tenantId: string;
  employeeCode: string;
  userId?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: Date;
  gender: 'male' | 'female' | 'other';
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  address: Address;
  departmentId: string;
  designation: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'intern';
  joiningDate: Date;
  reportingManagerId?: string;
  salary: SalaryInfo;
  bankDetails: BankDetails;
  documents: Document[];
  emergencyContact: EmergencyContact;
  status: 'active' | 'inactive' | 'terminated' | 'on-leave';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface SalaryInfo {
  basic: number;
  hra: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  currency: string;
}

export interface BankDetails {
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
}

export interface Document {
  _id: string;
  name: string;
  type: string;
  url: string;
  uploadedAt: Date;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

// Department Types
export interface IDepartment {
  _id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  managerId?: string;
  parentDepartmentId?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

// Attendance Types
export interface IAttendance {
  _id: string;
  tenantId: string;
  employeeId: string;
  date: Date;
  checkIn: Date;
  checkOut?: Date;
  status: 'present' | 'absent' | 'half-day' | 'late' | 'on-leave' | 'holiday';
  workHours?: number;
  overtimeHours?: number;
  notes?: string;
  location?: GeoLocation;
  source: 'web' | 'mobile' | 'biometric' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

// Leave Types
export interface ILeave {
  _id: string;
  tenantId: string;
  employeeId: string;
  leaveType: LeaveType;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  documents?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type LeaveType = 'casual' | 'sick' | 'annual' | 'maternity' | 'paternity' | 'unpaid' | 'compensatory';

export interface ILeaveBalance {
  _id: string;
  tenantId: string;
  employeeId: string;
  year: number;
  balances: {
    [key in LeaveType]?: {
      total: number;
      used: number;
      pending: number;
      remaining: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// Payroll Types
export interface IPayroll {
  _id: string;
  tenantId: string;
  employeeId: string;
  month: number;
  year: number;
  basicSalary: number;
  earnings: PayrollComponent[];
  deductions: PayrollComponent[];
  grossSalary: number;
  netSalary: number;
  status: 'draft' | 'processed' | 'approved' | 'paid';
  paymentDate?: Date;
  paymentMethod?: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PayrollComponent {
  name: string;
  amount: number;
  type: 'fixed' | 'percentage';
  percentage?: number;
}

// Event Types (for Message Broker)
export interface BaseEvent {
  eventId: string;
  eventType: string;
  tenantId: string;
  timestamp: Date;
  payload: unknown;
}

export interface EmployeeCreatedEvent extends BaseEvent {
  eventType: 'EMPLOYEE_CREATED';
  payload: {
    employeeId: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface LeaveApprovedEvent extends BaseEvent {
  eventType: 'LEAVE_APPROVED';
  payload: {
    leaveId: string;
    employeeId: string;
    startDate: Date;
    endDate: Date;
    leaveType: LeaveType;
  };
}

export interface AttendanceMarkedEvent extends BaseEvent {
  eventType: 'ATTENDANCE_MARKED';
  payload: {
    attendanceId: string;
    employeeId: string;
    date: Date;
    status: string;
  };
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  tenantId?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  tenantId?: string;
}

// JWT Payload
export interface JwtPayload {
  userId: string;
  tenantId: string;
  email: string;
  role: UserRole;
  permissions: string[];
}
