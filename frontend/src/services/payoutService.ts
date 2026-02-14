import api from './api';

// Types
export interface PayoutConfig {
  _id: string;
  tenantId: string;
  razorpayAccountId: string;
  hasCredentials: boolean;
  payoutMode: 'automatic' | 'manual' | 'scheduled';
  scheduledDay?: number;
  scheduledTime?: string;
  defaultPayoutMethod: 'NEFT' | 'IMPS' | 'RTGS';
  impsThreshold: number;
  rtgsThreshold: number;
  requireApproval: boolean;
  approverRoles: string[];
  minApprovers: number;
  notifyEmployeeOnPayout: boolean;
  notifyHROnFailure: boolean;
  notifyOnBatchComplete: boolean;
  isActive: boolean;
}

export interface FundAccount {
  _id: string;
  tenantId: string;
  employeeId: string;
  razorpayContactId: string;
  razorpayFundAccountId: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  accountType: 'savings' | 'current';
  verificationStatus: 'pending' | 'verified' | 'failed';
  verifiedAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface PayoutBatch {
  _id: string;
  tenantId: string;
  batchNumber: string;
  payrollBatchId?: string;
  month: number;
  year: number;
  totalAmount: number;
  totalEmployees: number;
  successfulPayouts: number;
  failedPayouts: number;
  pendingPayouts: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'processing' | 'completed' | 'partial' | 'failed' | 'cancelled';
  approvals: Array<{
    userId: string;
    role: string;
    action: 'approved' | 'rejected';
    comment?: string;
    timestamp: string;
  }>;
  errors: Array<{
    employeeId: string;
    employeeName: string;
    error: string;
    timestamp: string;
  }>;
  createdAt: string;
  completedAt?: string;
}

export interface Payout {
  _id: string;
  tenantId: string;
  batchId?: string;
  payrollId: string;
  employeeId: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    email: string;
  };
  bankDetails: {
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolderName: string;
  };
  amount: number;
  currency: string;
  payoutMethod: 'NEFT' | 'IMPS' | 'RTGS';
  purpose: 'salary' | 'reimbursement' | 'bonus' | 'advance';
  narration: string;
  razorpayPayoutId?: string;
  razorpayStatus?: string;
  utr?: string;
  status: 'pending' | 'initiated' | 'processing' | 'completed' | 'failed' | 'reversed' | 'cancelled';
  failureReason?: string;
  retryCount: number;
  createdAt: string;
  processedAt?: string;
}

// API Responses
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: {
    payouts?: T[];
    batches?: T[];
    fundAccounts?: T[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

// Config APIs
export const getPayoutConfig = async (): Promise<PayoutConfig | null> => {
  const response = await api.get<ApiResponse<PayoutConfig>>('/payouts/config');
  return response.data.data;
};

export const updatePayoutConfig = async (config: Partial<PayoutConfig>): Promise<void> => {
  await api.post('/payouts/config', config);
};

export const updatePayoutCredentials = async (credentials: {
  razorpayAccountId: string;
  razorpayKeyId: string;
  razorpayKeySecret: string;
  webhookSecret?: string;
}): Promise<void> => {
  await api.patch('/payouts/config/credentials', credentials);
};

export const updatePayoutWorkflow = async (workflow: {
  payoutMode: 'automatic' | 'manual' | 'scheduled';
  scheduledDay?: number;
  scheduledTime?: string;
  requireApproval?: boolean;
  approverRoles?: string[];
  minApprovers?: number;
}): Promise<void> => {
  await api.patch('/payouts/config/workflow', workflow);
};

export const testPayoutConnection = async (): Promise<{ balance: number; currency: string }> => {
  const response = await api.post<ApiResponse<{ balance: number; currency: string }>>('/payouts/config/test-connection');
  return response.data.data;
};

// Fund Account APIs
export const createFundAccount = async (data: {
  employeeId: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  accountHolderName: string;
  accountType?: 'savings' | 'current';
  email?: string;
  phone?: string;
}): Promise<FundAccount> => {
  const response = await api.post<ApiResponse<FundAccount>>('/payouts/fund-accounts', data);
  return response.data.data;
};

export const getFundAccounts = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}): Promise<{ fundAccounts: FundAccount[]; pagination: any }> => {
  const response = await api.get<PaginatedResponse<FundAccount>>('/payouts/fund-accounts', { params });
  return response.data.data as any;
};

export const getFundAccountByEmployee = async (employeeId: string): Promise<FundAccount> => {
  const response = await api.get<ApiResponse<FundAccount>>(`/payouts/fund-accounts/${employeeId}`);
  return response.data.data;
};

export const verifyFundAccount = async (id: string): Promise<void> => {
  await api.post(`/payouts/fund-accounts/${id}/verify`);
};

export const deactivateFundAccount = async (id: string, reason?: string): Promise<void> => {
  await api.delete(`/payouts/fund-accounts/${id}`, { data: { reason } });
};

export const syncFundAccounts = async (): Promise<{ created: number; skipped: number; errors: string[] }> => {
  const response = await api.post<ApiResponse<{ created: number; skipped: number; errors: string[] }>>('/payouts/fund-accounts/sync');
  return response.data.data;
};

// Payout Batch APIs
export const createPayoutBatch = async (data: {
  month: number;
  year: number;
  payrollBatchId?: string;
  payrollIds?: string[];
}): Promise<PayoutBatch> => {
  const response = await api.post<ApiResponse<PayoutBatch>>('/payouts/batches', data);
  return response.data.data;
};

export const getPayoutBatches = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  month?: number;
  year?: number;
}): Promise<{ batches: PayoutBatch[]; pagination: any }> => {
  const response = await api.get<PaginatedResponse<PayoutBatch>>('/payouts/batches', { params });
  return response.data.data as any;
};

export const getPayoutBatchDetails = async (id: string): Promise<{ batch: PayoutBatch; payouts: Payout[] }> => {
  const response = await api.get<ApiResponse<{ batch: PayoutBatch; payouts: Payout[] }>>(`/payouts/batches/${id}`);
  return response.data.data;
};

export const getPayoutBatchSummary = async (id: string): Promise<any> => {
  const response = await api.get<ApiResponse<any>>(`/payouts/batches/${id}/summary`);
  return response.data.data;
};

export const approveBatch = async (id: string, comment?: string): Promise<void> => {
  await api.post(`/payouts/batches/${id}/approve`, { comment });
};

export const rejectBatch = async (id: string, comment: string): Promise<void> => {
  await api.post(`/payouts/batches/${id}/reject`, { comment });
};

export const processBatch = async (id: string): Promise<void> => {
  await api.post(`/payouts/batches/${id}/process`);
};

export const cancelBatch = async (id: string, reason?: string): Promise<void> => {
  await api.post(`/payouts/batches/${id}/cancel`, { reason });
};

// Individual Payout APIs
export const getPayouts = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  batchId?: string;
  employeeId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}): Promise<{ payouts: Payout[]; pagination: any }> => {
  const response = await api.get<PaginatedResponse<Payout>>('/payouts', { params });
  return response.data.data as any;
};

export const getPayoutById = async (id: string): Promise<{ payout: Payout; auditLogs: any[] }> => {
  const response = await api.get<ApiResponse<{ payout: Payout; auditLogs: any[] }>>(`/payouts/${id}`);
  return response.data.data;
};

export const retryPayout = async (id: string): Promise<void> => {
  await api.post(`/payouts/${id}/retry`);
};

export const cancelPayout = async (id: string, reason?: string): Promise<void> => {
  await api.post(`/payouts/${id}/cancel`, { reason });
};

export const getEmployeePayouts = async (employeeId: string, params?: {
  page?: number;
  limit?: number;
}): Promise<{ payouts: Payout[]; pagination: any }> => {
  const response = await api.get<PaginatedResponse<Payout>>(`/payouts/employee/${employeeId}`, { params });
  return response.data.data as any;
};

export const getPayoutStats = async (params?: {
  month?: number;
  year?: number;
}): Promise<{ totalPayouts: number; totalAmount: number; byStatus: any[] }> => {
  const response = await api.get<ApiResponse<any>>('/payouts/stats', { params });
  return response.data.data;
};

export const syncPayoutStatus = async (id: string): Promise<{ status: string; razorpayStatus: string; utr?: string }> => {
  const response = await api.post<ApiResponse<any>>(`/payouts/${id}/sync-status`);
  return response.data.data;
};

export default {
  // Config
  getPayoutConfig,
  updatePayoutConfig,
  updatePayoutCredentials,
  updatePayoutWorkflow,
  testPayoutConnection,

  // Fund Accounts
  createFundAccount,
  getFundAccounts,
  getFundAccountByEmployee,
  verifyFundAccount,
  deactivateFundAccount,
  syncFundAccounts,

  // Batches
  createPayoutBatch,
  getPayoutBatches,
  getPayoutBatchDetails,
  getPayoutBatchSummary,
  approveBatch,
  rejectBatch,
  processBatch,
  cancelBatch,

  // Payouts
  getPayouts,
  getPayoutById,
  retryPayout,
  cancelPayout,
  getEmployeePayouts,
  getPayoutStats,
  syncPayoutStatus,
};
