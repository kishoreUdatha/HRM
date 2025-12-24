import apiClient from './apiClient';
import type {
  LeaveRequest,
  LeaveBalance,
  LeaveType,
  Holiday,
  ApiResponse,
} from '../types';

export interface CreateLeaveRequest {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason: string;
  attachments?: string[];
}

export interface LeaveListParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  employeeId?: string;
  startDate?: string;
  endDate?: string;
}

export interface HolidayListParams {
  year?: number;
  type?: 'public' | 'restricted' | 'optional';
}

export const leaveApi = {
  /**
   * Create a new leave request
   */
  async createLeaveRequest(data: CreateLeaveRequest): Promise<ApiResponse<LeaveRequest>> {
    const response = await apiClient.post<ApiResponse<LeaveRequest>>('/leaves/requests', data);
    return response.data;
  },

  /**
   * Get leave requests with pagination
   */
  async getLeaveRequests(params: LeaveListParams): Promise<ApiResponse<LeaveRequest[]>> {
    const response = await apiClient.get<ApiResponse<LeaveRequest[]>>('/leaves/requests', {
      params,
    });
    return response.data;
  },

  /**
   * Get leave request by ID
   */
  async getLeaveRequestById(id: string): Promise<ApiResponse<LeaveRequest>> {
    const response = await apiClient.get<ApiResponse<LeaveRequest>>(`/leaves/requests/${id}`);
    return response.data;
  },

  /**
   * Cancel a leave request
   */
  async cancelLeaveRequest(id: string): Promise<ApiResponse<LeaveRequest>> {
    const response = await apiClient.patch<ApiResponse<LeaveRequest>>(
      `/leaves/requests/${id}/cancel`
    );
    return response.data;
  },

  /**
   * Approve a leave request (for managers)
   */
  async approveLeaveRequest(id: string): Promise<ApiResponse<LeaveRequest>> {
    const response = await apiClient.patch<ApiResponse<LeaveRequest>>(
      `/leaves/requests/${id}/approve`
    );
    return response.data;
  },

  /**
   * Reject a leave request (for managers)
   */
  async rejectLeaveRequest(id: string, reason?: string): Promise<ApiResponse<LeaveRequest>> {
    const response = await apiClient.patch<ApiResponse<LeaveRequest>>(
      `/leaves/requests/${id}/reject`,
      {reason}
    );
    return response.data;
  },

  /**
   * Get leave balance for an employee
   */
  async getLeaveBalance(employeeId: string): Promise<ApiResponse<LeaveBalance>> {
    const response = await apiClient.get<ApiResponse<LeaveBalance>>(
      `/leaves/balance/${employeeId}`
    );
    return response.data;
  },

  /**
   * Get all leave types
   */
  async getLeaveTypes(): Promise<ApiResponse<LeaveType[]>> {
    const response = await apiClient.get<ApiResponse<LeaveType[]>>('/leaves/types');
    return response.data;
  },

  /**
   * Get holidays list
   */
  async getHolidays(params?: HolidayListParams): Promise<ApiResponse<Holiday[]>> {
    const response = await apiClient.get<ApiResponse<Holiday[]>>('/leaves/holidays', {params});
    return response.data;
  },

  /**
   * Check if a specific date is a holiday
   */
  async isHoliday(date: string): Promise<ApiResponse<{isHoliday: boolean; holiday?: Holiday}>> {
    const response = await apiClient.get<ApiResponse<{isHoliday: boolean; holiday?: Holiday}>>(
      `/leaves/holidays/check/${date}`
    );
    return response.data;
  },

  /**
   * Get pending approval requests (for managers)
   */
  async getPendingApprovals(): Promise<ApiResponse<LeaveRequest[]>> {
    const response = await apiClient.get<ApiResponse<LeaveRequest[]>>('/leaves/requests', {
      params: {status: 'pending'},
    });
    return response.data;
  },
};
