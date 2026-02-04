import apiClient from './apiClient';
import type {Attendance, AttendanceSummary, ApiResponse, GeoLocation} from '../types';

export interface CheckInRequest {
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface FaceCheckInRequest {
  faceImage: string; // Base64 encoded image
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
}

export interface FaceCheckInResponse {
  attendance: Attendance;
  faceVerified: boolean;
  faceVerificationScore: number;
  message: string;
}

export interface VerifyFaceRequest {
  faceImage: string;
  location?: {
    latitude: number;
    longitude: number;
  };
  employeeId?: string; // Optional hint for faster matching
}

export interface VerifyFaceResponse {
  success: boolean;
  status: 'MATCHED' | 'NO_MATCH' | 'NO_FACE' | 'MULTIPLE_FACES' | 'LOW_QUALITY' | 'NO_ENROLLMENTS' | 'ERROR';
  employeeId?: string;
  employeeName?: string;
  confidence?: number;
  message: string;
}

export interface ConfirmCheckInRequest {
  employeeId: string;
  confidence?: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  notes?: string;
}

export interface ConfirmCheckInResponse {
  attendance: Attendance;
  employeeName: string;
  message: string;
  workHours?: string;
}

export interface EnrollFaceRequest {
  employeeId: string;
  images: string[]; // Array of base64 encoded images
}

export interface EnrollFaceResponse {
  employeeId: string;
  employeeName: string;
  enrolledImages: number;
  totalImages: number;
}

export interface OfflineCheckInRequest {
  employeeId: string;
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  originalTimestamp: string; // ISO string when punch was captured offline
  confidence?: number;
  isOffline: boolean;
  notes?: string;
}

export interface OfflineCheckInResponse {
  success: boolean;
  message: string;
  attendance?: Attendance;
  employeeName?: string;
  wasOffline: boolean;
  originalTimestamp: string;
  syncedTimestamp: string;
}

export interface AttendanceListParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  status?: string;
}

export interface GeofencingConfig {
  enabled: boolean;
  locations: Array<{
    _id?: string;
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
    radius: number;
  }>;
  defaultRadius: number;
  strictMode: boolean;
}

export interface NotificationSettings {
  lateNotificationThreshold: number;
  enableLateNotifications: boolean;
  checkoutReminderThreshold: number;
  enableCheckoutReminder: boolean;
}

export interface ShiftConfig {
  startTime: string; // Format: "HH:mm"
  endTime: string;   // Format: "HH:mm"
  graceMinutes: number;
}

export const attendanceApi = {
  /**
   * Check in with location
   */
  async checkIn(data: CheckInRequest): Promise<ApiResponse<Attendance>> {
    const response = await apiClient.post<ApiResponse<Attendance>>('/attendance/check-in', data);
    return response.data;
  },

  /**
   * Check out with location
   */
  async checkOut(data: CheckInRequest): Promise<ApiResponse<Attendance>> {
    const response = await apiClient.post<ApiResponse<Attendance>>('/attendance/check-out', data);
    return response.data;
  },

  /**
   * Check in with face verification
   */
  async faceCheckIn(data: FaceCheckInRequest): Promise<ApiResponse<FaceCheckInResponse>> {
    const response = await apiClient.post<ApiResponse<FaceCheckInResponse>>(
      '/attendance/check-in/face',
      data
    );
    return response.data;
  },

  /**
   * Check out with face verification
   */
  async faceCheckOut(data: FaceCheckInRequest): Promise<ApiResponse<FaceCheckInResponse>> {
    const response = await apiClient.post<ApiResponse<FaceCheckInResponse>>(
      '/attendance/check-out/face',
      data
    );
    return response.data;
  },

  /**
   * Get today's attendance status for an employee
   */
  async getTodayStatus(employeeId: string): Promise<ApiResponse<Attendance | null>> {
    const response = await apiClient.get<ApiResponse<Attendance | null>>(
      `/attendance/today/${employeeId}`
    );
    return response.data;
  },

  /**
   * Get attendance records with pagination
   */
  async getAttendance(params: AttendanceListParams): Promise<ApiResponse<Attendance[]>> {
    const response = await apiClient.get<ApiResponse<Attendance[]>>('/attendance', {params});
    return response.data;
  },

  /**
   * Get attendance summary for a month
   */
  async getAttendanceSummary(
    month: number,
    year: number,
    employeeId?: string
  ): Promise<ApiResponse<AttendanceSummary>> {
    const response = await apiClient.get<ApiResponse<AttendanceSummary>>('/attendance/summary', {
      params: {month, year, employeeId},
    });
    return response.data;
  },

  /**
   * Get office locations for geo-fencing
   */
  async getOfficeLocations(): Promise<ApiResponse<GeoLocation[]>> {
    // This would typically come from tenant settings
    const response = await apiClient.get<ApiResponse<{settings: {geofencing: {locations: GeoLocation[]}}}>>(
      '/tenants/current'
    );
    return {
      success: response.data.success,
      data: response.data.data?.settings?.geofencing?.locations || [],
    };
  },

  /**
   * Get geo-fencing configuration
   */
  async getGeofencingConfig(): Promise<ApiResponse<GeofencingConfig>> {
    const response = await apiClient.get<ApiResponse<GeofencingConfig>>(
      '/tenants/current/geofencing'
    );
    return response.data;
  },

  /**
   * Verify face - Identify employee from face image
   */
  async verifyFace(data: VerifyFaceRequest): Promise<VerifyFaceResponse> {
    const response = await apiClient.post<VerifyFaceResponse>(
      '/attendance/verify-face',
      data
    );
    return response.data;
  },

  /**
   * Confirm check-in after face verification
   */
  async confirmCheckIn(data: ConfirmCheckInRequest): Promise<ApiResponse<ConfirmCheckInResponse>> {
    const response = await apiClient.post<ApiResponse<ConfirmCheckInResponse>>(
      '/attendance/confirm-check-in',
      data
    );
    return response.data;
  },

  /**
   * Confirm check-out after face verification
   */
  async confirmCheckOut(data: ConfirmCheckInRequest): Promise<ApiResponse<ConfirmCheckInResponse>> {
    const response = await apiClient.post<ApiResponse<ConfirmCheckInResponse>>(
      '/attendance/confirm-check-out',
      data
    );
    return response.data;
  },

  /**
   * Enroll face for an employee
   * Uses extended timeout as face processing with ML can take up to 2 minutes
   */
  async enrollFace(data: EnrollFaceRequest): Promise<ApiResponse<EnrollFaceResponse>> {
    const response = await apiClient.post<ApiResponse<EnrollFaceResponse>>(
      '/attendance/enroll-face',
      data,
      { timeout: 120000 } // 2 minute timeout for ML face processing
    );
    return response.data;
  },

  /**
   * Confirm offline check-in with original timestamp
   * Used to sync offline punches when back online
   */
  async confirmOfflineCheckIn(data: OfflineCheckInRequest): Promise<ApiResponse<OfflineCheckInResponse>> {
    const response = await apiClient.post<ApiResponse<OfflineCheckInResponse>>(
      '/attendance/confirm-offline-check-in',
      data
    );
    return response.data;
  },

  /**
   * Confirm offline check-out with original timestamp
   * Used to sync offline punches when back online
   */
  async confirmOfflineCheckOut(data: OfflineCheckInRequest): Promise<ApiResponse<OfflineCheckInResponse>> {
    const response = await apiClient.post<ApiResponse<OfflineCheckInResponse>>(
      '/attendance/confirm-offline-check-out',
      data
    );
    return response.data;
  },

  /**
   * Get notification settings for the tenant
   */
  async getNotificationSettings(): Promise<ApiResponse<NotificationSettings>> {
    const response = await apiClient.get<ApiResponse<NotificationSettings>>(
      '/tenants/current/notification-settings'
    );
    return response.data;
  },

  /**
   * Get default shift configuration
   */
  async getShiftConfig(): Promise<ApiResponse<ShiftConfig>> {
    const response = await apiClient.get<ApiResponse<{shift: ShiftConfig}>>(
      '/attendance/shifts/default'
    );
    return {
      success: response.data.success,
      data: response.data.data?.shift || { startTime: '09:00', endTime: '18:00', graceMinutes: 15 },
    };
  },
};
