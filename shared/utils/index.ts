// ============================================
// HRM SaaS - Shared Utilities
// ============================================

import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

// JWT Utilities
export const generateAccessToken = (payload: JwtPayload, secret: string, expiresIn: string): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

export const generateRefreshToken = (payload: JwtPayload, secret: string, expiresIn: string): string => {
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifyToken = (token: string, secret: string): JwtPayload => {
  return jwt.verify(token, secret) as JwtPayload;
};

// Tenant Slug Generator
export const generateTenantSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// Employee Code Generator
export const generateEmployeeCode = (tenantSlug: string, sequence: number): string => {
  const prefix = tenantSlug.substring(0, 3).toUpperCase();
  return `${prefix}${String(sequence).padStart(5, '0')}`;
};

// Date Utilities
export const getDateRange = (startDate: Date, endDate: Date): Date[] => {
  const dates: Date[] = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
};

export const calculateWorkingDays = (
  startDate: Date,
  endDate: Date,
  workingDays: number[] = [1, 2, 3, 4, 5]
): number => {
  let count = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    if (workingDays.includes(currentDate.getDay())) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
};

// API Error Class
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Response Helpers
export const successResponse = <T>(data: T, message?: string) => ({
  success: true,
  data,
  message,
});

export const errorResponse = (message: string, statusCode = 500) => ({
  success: false,
  message,
  statusCode,
});

// Pagination Helper
export const paginate = (page: number, limit: number) => {
  const skip = (page - 1) * limit;
  return { skip, limit };
};

// Tenant Context Extractor from subdomain
export const extractTenantFromHost = (host: string): string | null => {
  const parts = host.split('.');
  if (parts.length >= 3) {
    return parts[0]; // subdomain as tenant slug
  }
  return null;
};

// Permission Checker
export const hasPermission = (userPermissions: string[], requiredPermission: string): boolean => {
  return userPermissions.includes(requiredPermission) || userPermissions.includes('*');
};

// Role Hierarchy
export const roleHierarchy: Record<string, number> = {
  super_admin: 5,
  tenant_admin: 4,
  hr: 3,
  manager: 2,
  employee: 1,
};

export const canAccessRole = (userRole: string, targetRole: string): boolean => {
  return (roleHierarchy[userRole] || 0) >= (roleHierarchy[targetRole] || 0);
};
