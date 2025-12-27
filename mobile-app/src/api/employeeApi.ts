import apiClient from './apiClient';
import type {Employee, ApiResponse} from '../types';

export interface EmployeeDetails extends Employee {
  salary?: {
    basic: number;
    hra: number;
    allowances: number;
    deductions: number;
    netSalary: number;
    currency: string;
  };
}

export const employeeApi = {
  /**
   * Get employee details including salary information
   */
  async getEmployeeDetails(employeeId: string): Promise<ApiResponse<EmployeeDetails>> {
    const response = await apiClient.get<ApiResponse<EmployeeDetails>>(
      `/employees/${employeeId}`
    );
    // API returns {success: true, data: employee} directly
    return {
      success: response.data.success,
      data: response.data.data as EmployeeDetails,
      message: response.data.message,
    };
  },

  /**
   * Get current employee profile
   */
  async getMyProfile(): Promise<ApiResponse<EmployeeDetails>> {
    const response = await apiClient.get<ApiResponse<EmployeeDetails>>(
      '/employees/me'
    );
    return {
      success: response.data.success,
      data: response.data.data as EmployeeDetails,
      message: response.data.message,
    };
  },
};
