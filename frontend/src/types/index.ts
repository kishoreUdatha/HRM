// Multi-Tenant Types
export interface Tenant {
  _id: string;
  name: string;
  slug: string;
  logo?: string;
  settings: TenantSettings;
  subscription: Subscription;
  status: 'active' | 'inactive' | 'suspended' | 'trial';
}

export interface TenantSettings {
  timezone: string;
  dateFormat: string;
  currency: string;
  language: string;
  workingDays: number[];
  workingHours: { start: string; end: string };
}

export interface Subscription {
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  maxEmployees: number;
  features: string[];
  endDate: string;
}

// User & Auth Types
export interface User {
  _id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  permissions: string[];
  avatar?: string;
}

export type UserRole = 'super_admin' | 'tenant_admin' | 'hr' | 'manager' | 'employee' | 'admin' | 'hr_manager';

export interface LoginCredentials {
  email: string;
  password: string;
  tenantId?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId: string;
  role?: UserRole;
}

export interface TenantRegisterData {
  organizationName: string;
  slug?: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Employee Types
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Employee {
  _id: string;
  tenantId: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  maritalStatus: string;
  address: Address;
  departmentId: string | Department;
  designation: string;
  employmentType: 'full-time' | 'part-time' | 'contract' | 'intern';
  joiningDate: string;
  reportingManagerId?: string | Employee;
  shiftId?: string | Shift;
  salary: SalaryInfo;
  status: 'active' | 'inactive' | 'terminated' | 'on-leave';
  avatar?: string;
  emergencyContact?: EmergencyContact;
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

export interface Department {
  _id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  managerId?: string;
  status: 'active' | 'inactive';
  employeeCount?: number;
}

// Shift Types
export interface Shift {
  _id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  startTime: string;  // Format: "HH:mm" (24-hour)
  endTime: string;    // Format: "HH:mm" (24-hour)
  breakDuration: number;  // Minutes
  workingHours: number;   // Calculated total working hours
  isNightShift: boolean;
  allowedLateMinutes: number;
  allowedEarlyLeaveMinutes: number;
  overtimeThreshold: number;  // Minutes after which overtime starts
  weeklyOffDays: number[];    // 0 = Sunday, 1 = Monday, etc.
  color: string;              // For UI display
  isActive: boolean;
  isDefault: boolean;
  employeeCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Dashboard Stats
export interface DashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  newHires: number;
  pendingLeaves: number;
  presentToday: number;
  absentToday: number;
  upcomingBirthdays: Employee[];
  departmentDistribution: { department: string; count: number }[];
  attendanceTrend: { date: string; present: number; absent: number }[];
  recentHires: Employee[];
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
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
}
