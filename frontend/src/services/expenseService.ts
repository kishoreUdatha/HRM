import api from './api';

export interface ExpenseCategory {
  _id: string;
  tenantId: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
  policy: {
    maxAmount?: number;
    requiresReceipt: boolean;
    receiptThreshold: number;
    requiresApproval: boolean;
    approvalThreshold: number;
  };
}

export interface Expense {
  _id: string;
  tenantId: string;
  employeeId: string | { _id: string; firstName: string; lastName: string; email: string };
  categoryId: string | { _id: string; name: string; code: string };
  date: string;
  description: string;
  merchant: string;
  amount: number;
  currency: string;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'corporate_card' | 'other';
  receipts: {
    url: string;
    fileName: string;
    uploadedAt: string;
  }[];
  isBillable: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed' | 'cancelled';
  policyViolations?: {
    type: string;
    description: string;
    severity: 'warning' | 'violation';
  }[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseReport {
  _id: string;
  tenantId: string;
  employeeId: string | { _id: string; firstName: string; lastName: string; email: string };
  reportNumber: string;
  title: string;
  description?: string;
  expenses: string[];
  totalAmount: number;
  currency: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed';
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TravelRequest {
  _id: string;
  tenantId: string;
  employeeId: string | { _id: string; firstName: string; lastName: string; email: string };
  purpose: string;
  destination: string;
  startDate: string;
  endDate: string;
  estimatedBudget: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface CreateExpenseData {
  employeeId: string;
  categoryId: string;
  date: string;
  description: string;
  merchant: string;
  amount: number;
  currency?: string;
  paymentMethod?: string;
  isBillable?: boolean;
  notes?: string;
}

export interface CreateCategoryData {
  name: string;
  code: string;
  description?: string;
  isActive?: boolean;
  policy?: {
    maxAmount?: number;
    requiresReceipt?: boolean;
    receiptThreshold?: number;
    requiresApproval?: boolean;
    approvalThreshold?: number;
  };
}

export interface CreateExpenseReportData {
  employeeId: string;
  title: string;
  description?: string;
  expenses: string[];
  currency?: string;
}

export interface CreateTravelRequestData {
  employeeId: string;
  purpose: string;
  destination: string;
  startDate: string;
  endDate: string;
  estimatedBudget: number;
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

const getTenantId = (): string => {
  return localStorage.getItem('tenantId') || '';
};

export const expenseService = {
  // Categories
  getCategories: async (): Promise<ExpenseCategory[]> => {
    const tenantId = getTenantId();
    const response = await api.get<{ success: boolean; data: ExpenseCategory[] }>(
      `/expenses/${tenantId}/categories`
    );
    return response.data.data;
  },

  createCategory: async (data: CreateCategoryData): Promise<ExpenseCategory> => {
    const tenantId = getTenantId();
    const response = await api.post<{ success: boolean; data: ExpenseCategory }>(
      `/expenses/${tenantId}/categories`,
      data
    );
    return response.data.data;
  },

  updateCategory: async (id: string, data: Partial<CreateCategoryData>): Promise<ExpenseCategory> => {
    const tenantId = getTenantId();
    const response = await api.put<{ success: boolean; data: ExpenseCategory }>(
      `/expenses/${tenantId}/categories/${id}`,
      data
    );
    return response.data.data;
  },

  // Expenses
  getExpenses: async (params?: {
    employeeId?: string;
    status?: string;
    categoryId?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Expense>> => {
    const tenantId = getTenantId();
    const response = await api.get<PaginatedResponse<Expense>>(
      `/expenses/${tenantId}/expenses`,
      { params }
    );
    return response.data;
  },

  getExpenseById: async (id: string): Promise<Expense> => {
    const tenantId = getTenantId();
    const response = await api.get<{ success: boolean; data: Expense }>(
      `/expenses/${tenantId}/expenses/${id}`
    );
    return response.data.data;
  },

  createExpense: async (data: CreateExpenseData): Promise<Expense> => {
    const tenantId = getTenantId();
    const response = await api.post<{ success: boolean; data: Expense }>(
      `/expenses/${tenantId}/expenses`,
      data
    );
    return response.data.data;
  },

  updateExpense: async (id: string, data: Partial<CreateExpenseData>): Promise<Expense> => {
    const tenantId = getTenantId();
    const response = await api.put<{ success: boolean; data: Expense }>(
      `/expenses/${tenantId}/expenses/${id}`,
      data
    );
    return response.data.data;
  },

  deleteExpense: async (id: string): Promise<void> => {
    const tenantId = getTenantId();
    await api.delete(`/expenses/${tenantId}/expenses/${id}`);
  },

  uploadReceipt: async (expenseId: string, url: string, fileName: string): Promise<Expense> => {
    const tenantId = getTenantId();
    const response = await api.post<{ success: boolean; data: Expense }>(
      `/expenses/${tenantId}/expenses/${expenseId}/receipts`,
      { url, fileName }
    );
    return response.data.data;
  },

  // Expense Reports
  getExpenseReports: async (params?: {
    employeeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<ExpenseReport>> => {
    const tenantId = getTenantId();
    const response = await api.get<PaginatedResponse<ExpenseReport>>(
      `/expenses/${tenantId}/expense-reports`,
      { params }
    );
    return response.data;
  },

  getExpenseReportById: async (id: string): Promise<ExpenseReport> => {
    const tenantId = getTenantId();
    const response = await api.get<{ success: boolean; data: ExpenseReport }>(
      `/expenses/${tenantId}/expense-reports/${id}`
    );
    return response.data.data;
  },

  createExpenseReport: async (data: CreateExpenseReportData): Promise<ExpenseReport> => {
    const tenantId = getTenantId();
    const response = await api.post<{ success: boolean; data: ExpenseReport }>(
      `/expenses/${tenantId}/expense-reports`,
      data
    );
    return response.data.data;
  },

  submitExpenseReport: async (id: string): Promise<ExpenseReport> => {
    const tenantId = getTenantId();
    const response = await api.post<{ success: boolean; data: ExpenseReport }>(
      `/expenses/${tenantId}/expense-reports/${id}/submit`
    );
    return response.data.data;
  },

  approveExpenseReport: async (id: string, comments?: string): Promise<ExpenseReport> => {
    const tenantId = getTenantId();
    const response = await api.post<{ success: boolean; data: ExpenseReport }>(
      `/expenses/${tenantId}/expense-reports/${id}/approve`,
      { comments }
    );
    return response.data.data;
  },

  rejectExpenseReport: async (id: string, comments: string): Promise<ExpenseReport> => {
    const tenantId = getTenantId();
    const response = await api.post<{ success: boolean; data: ExpenseReport }>(
      `/expenses/${tenantId}/expense-reports/${id}/reject`,
      { comments }
    );
    return response.data.data;
  },

  // Travel Requests
  getTravelRequests: async (params?: {
    employeeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<TravelRequest>> => {
    const tenantId = getTenantId();
    const response = await api.get<PaginatedResponse<TravelRequest>>(
      `/expenses/${tenantId}/travel-requests`,
      { params }
    );
    return response.data;
  },

  createTravelRequest: async (data: CreateTravelRequestData): Promise<TravelRequest> => {
    const tenantId = getTenantId();
    const response = await api.post<{ success: boolean; data: TravelRequest }>(
      `/expenses/${tenantId}/travel-requests`,
      data
    );
    return response.data.data;
  },

  approveTravelRequest: async (id: string, comments?: string): Promise<TravelRequest> => {
    const tenantId = getTenantId();
    const response = await api.post<{ success: boolean; data: TravelRequest }>(
      `/expenses/${tenantId}/travel-requests/${id}/approve`,
      { comments }
    );
    return response.data.data;
  },

  // Stats
  getExpenseStats: async (): Promise<{
    totalPending: number;
    totalApproved: number;
    totalExpenses: number;
    pendingReports: number;
  }> => {
    const tenantId = getTenantId();
    const response = await api.get<{ success: boolean; data: any }>(
      `/expenses/${tenantId}/stats`
    );
    return response.data.data;
  },

  // Seed default categories
  seedCategories: async (): Promise<{ created: ExpenseCategory[]; skipped: string[] }> => {
    const tenantId = getTenantId();
    const response = await api.post<{ success: boolean; data: { created: ExpenseCategory[]; skipped: string[] } }>(
      `/expenses/${tenantId}/categories/seed`
    );
    return response.data.data;
  },
};
