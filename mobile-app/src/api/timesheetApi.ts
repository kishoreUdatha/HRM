import apiClient from './apiClient';
import type {Timesheet, TimesheetEntry, Project, ApiResponse} from '../types';

export interface CreateTimesheetEntry {
  date: string;
  projectId: string;
  taskName?: string;
  hours: number;
  description?: string;
  isBillable?: boolean;
  overtime?: boolean;
  overtimeType?: 'regular' | 'weekend' | 'holiday';
}

export interface TimesheetListParams {
  page?: number;
  limit?: number;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'locked';
  startDate?: string;
  endDate?: string;
}

export interface TimeEntry {
  _id: string;
  tenantId: string;
  employeeId: string;
  projectId: string;
  project?: Project;
  taskName?: string;
  startTime: string;
  endTime?: string;
  duration?: number;
  description?: string;
  isBillable: boolean;
  status: 'running' | 'stopped';
  createdAt: string;
}

export const timesheetApi = {
  /**
   * Get or create current week's timesheet
   */
  async getCurrentTimesheet(tenantId: string): Promise<ApiResponse<Timesheet>> {
    const response = await apiClient.get<ApiResponse<Timesheet>>(
      `/timesheets/${tenantId}/timesheets/current`
    );
    return response.data;
  },

  /**
   * Get timesheets with pagination
   */
  async getTimesheets(
    tenantId: string,
    params?: TimesheetListParams
  ): Promise<ApiResponse<Timesheet[]>> {
    const response = await apiClient.get<ApiResponse<Timesheet[]>>(
      `/timesheets/${tenantId}/timesheets`,
      {params}
    );
    return response.data;
  },

  /**
   * Get timesheet by ID
   */
  async getTimesheetById(tenantId: string, id: string): Promise<ApiResponse<Timesheet>> {
    const response = await apiClient.get<ApiResponse<Timesheet>>(
      `/timesheets/${tenantId}/timesheets/${id}`
    );
    return response.data;
  },

  /**
   * Add entry to timesheet
   */
  async addTimesheetEntry(
    tenantId: string,
    timesheetId: string,
    entry: CreateTimesheetEntry
  ): Promise<ApiResponse<Timesheet>> {
    const response = await apiClient.post<ApiResponse<Timesheet>>(
      `/timesheets/${tenantId}/timesheets/${timesheetId}/entries`,
      entry
    );
    return response.data;
  },

  /**
   * Update timesheet entry
   */
  async updateTimesheetEntry(
    tenantId: string,
    timesheetId: string,
    entryId: string,
    updates: Partial<CreateTimesheetEntry>
  ): Promise<ApiResponse<Timesheet>> {
    const response = await apiClient.put<ApiResponse<Timesheet>>(
      `/timesheets/${tenantId}/timesheets/${timesheetId}/entries/${entryId}`,
      updates
    );
    return response.data;
  },

  /**
   * Delete timesheet entry
   */
  async deleteTimesheetEntry(
    tenantId: string,
    timesheetId: string,
    entryId: string
  ): Promise<ApiResponse<Timesheet>> {
    const response = await apiClient.delete<ApiResponse<Timesheet>>(
      `/timesheets/${tenantId}/timesheets/${timesheetId}/entries/${entryId}`
    );
    return response.data;
  },

  /**
   * Submit timesheet for approval
   */
  async submitTimesheet(tenantId: string, timesheetId: string): Promise<ApiResponse<Timesheet>> {
    const response = await apiClient.post<ApiResponse<Timesheet>>(
      `/timesheets/${tenantId}/timesheets/${timesheetId}/submit`
    );
    return response.data;
  },

  /**
   * Start timer
   */
  async startTimer(
    tenantId: string,
    data: {projectId: string; taskName?: string; description?: string; isBillable?: boolean}
  ): Promise<ApiResponse<TimeEntry>> {
    const response = await apiClient.post<ApiResponse<TimeEntry>>(
      `/timesheets/${tenantId}/time-entries/start`,
      data
    );
    return response.data;
  },

  /**
   * Stop timer
   */
  async stopTimer(tenantId: string, entryId: string): Promise<ApiResponse<TimeEntry>> {
    const response = await apiClient.post<ApiResponse<TimeEntry>>(
      `/timesheets/${tenantId}/time-entries/${entryId}/stop`
    );
    return response.data;
  },

  /**
   * Get time entries
   */
  async getTimeEntries(tenantId: string): Promise<ApiResponse<TimeEntry[]>> {
    const response = await apiClient.get<ApiResponse<TimeEntry[]>>(
      `/timesheets/${tenantId}/time-entries`
    );
    return response.data;
  },

  /**
   * Get projects
   */
  async getProjects(tenantId: string): Promise<ApiResponse<Project[]>> {
    const response = await apiClient.get<ApiResponse<Project[]>>(
      `/timesheets/${tenantId}/projects`
    );
    return response.data;
  },

  /**
   * Get timesheet stats
   */
  async getTimesheetStats(
    tenantId: string
  ): Promise<ApiResponse<{totalHours: number; billableHours: number; utilization: number}>> {
    const response = await apiClient.get<
      ApiResponse<{totalHours: number; billableHours: number; utilization: number}>
    >(`/timesheets/${tenantId}/stats`);
    return response.data;
  },
};
