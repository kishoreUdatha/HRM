import apiClient from './apiClient';
import type {Payslip, ApiResponse} from '../types';

export interface PayslipListParams {
  page?: number;
  limit?: number;
  year?: number;
  status?: 'draft' | 'approved' | 'paid' | 'cancelled';
}

export interface YTDSummary {
  year: number;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  totalTax?: number;
  monthsProcessed?: number;
  monthlyBreakdown: {
    month: number;
    gross: number;
    deductions: number;
    net: number;
  }[];
}

export const payrollApi = {
  /**
   * Get payslip history for current employee
   * Uses the new /payslips endpoint that returns processed/paid payrolls
   */
  async getPayslips(
    tenantId: string,
    employeeId: string,
    params?: PayslipListParams
  ): Promise<ApiResponse<Payslip[]>> {
    const response = await apiClient.get<ApiResponse<Payslip[]>>(
      `/payroll/${tenantId}/employees/${employeeId}/payslips`,
      {params}
    );
    return response.data;
  },

  /**
   * Get specific payslip by ID
   */
  async getPayslipById(
    tenantId: string,
    employeeId: string,
    payslipId: string
  ): Promise<ApiResponse<Payslip>> {
    const response = await apiClient.get<ApiResponse<Payslip>>(
      `/payroll/${tenantId}/employees/${employeeId}/payslips/${payslipId}`
    );
    return response.data;
  },

  /**
   * Get specific payslip by month and year
   */
  async getPayslip(
    tenantId: string,
    employeeId: string,
    year: number,
    month: number
  ): Promise<ApiResponse<Payslip>> {
    const response = await apiClient.get<ApiResponse<Payslip>>(
      `/payroll/${tenantId}/employees/${employeeId}/payslip/${year}/${month}`
    );
    return response.data;
  },

  /**
   * Get payslip PDF download URL by ID
   */
  getPayslipDownloadUrl(tenantId: string, employeeId: string, payslipId: string): string {
    return `/payroll/${tenantId}/employees/${employeeId}/payslips/${payslipId}/download`;
  },

  /**
   * Get payslip PDF download URL by month/year
   */
  getPayslipDownloadUrlByPeriod(tenantId: string, employeeId: string, year: number, month: number): string {
    return `/payroll/${tenantId}/employees/${employeeId}/payslip/${year}/${month}/download`;
  },

  /**
   * Download payslip PDF (legacy - for paystub model)
   */
  async downloadPayslipPDF(paystubId: string): Promise<ApiResponse<{url: string}>> {
    const response = await apiClient.get<ApiResponse<{url: string}>>(
      `/payroll/paystub/${paystubId}/download`
    );
    return response.data;
  },

  /**
   * Get YTD (Year-to-Date) summary
   */
  async getYTDSummary(
    tenantId: string,
    employeeId: string,
    year: number
  ): Promise<ApiResponse<YTDSummary>> {
    const response = await apiClient.get<ApiResponse<YTDSummary>>(
      `/payroll/${tenantId}/employees/${employeeId}/ytd/${year}`
    );
    return response.data;
  },

  /**
   * Get latest payslip
   */
  async getLatestPayslip(tenantId: string, employeeId: string): Promise<ApiResponse<Payslip>> {
    const response = await apiClient.get<ApiResponse<Payslip[]>>(
      `/payroll/${tenantId}/employees/${employeeId}/payslips`,
      {params: {limit: 1}}
    );
    return {
      success: response.data.success,
      data: response.data.data?.[0],
      message: response.data.message,
    };
  },

  /**
   * Compare payslips between periods
   */
  async comparePayslips(
    tenantId: string,
    employeeId: string,
    period1: {year: number; month: number},
    period2: {year: number; month: number}
  ): Promise<ApiResponse<{period1: Payslip; period2: Payslip; difference: number}>> {
    const response = await apiClient.get<
      ApiResponse<{period1: Payslip; period2: Payslip; difference: number}>
    >(`/payroll/${tenantId}/employees/${employeeId}/paystubs/compare`, {
      params: {
        year1: period1.year,
        month1: period1.month,
        year2: period2.year,
        month2: period2.month,
      },
    });
    return response.data;
  },
};
