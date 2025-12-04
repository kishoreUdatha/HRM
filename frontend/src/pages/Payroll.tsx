import React, { useState, useEffect } from 'react';
import {
  HiCurrencyDollar,
  HiDocumentDownload,
  HiCheck,
  HiClock,
  HiPlus,
  HiRefresh,
  HiFilter,
  HiEye,
  HiDocumentText,
} from 'react-icons/hi';
import api from '../services/api';
import { useAppSelector } from '../hooks/useAppDispatch';

interface Payroll {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeId: string;
    department?: { name: string };
  };
  month: number;
  year: number;
  basicSalary: number;
  totalEarnings: number;
  totalDeductions: number;
  netSalary: number;
  status: 'draft' | 'processed' | 'approved' | 'paid';
  processedAt?: string;
  paidAt?: string;
}

interface PayrollSummary {
  totalPayroll: number;
  totalEmployees: number;
  totalEarnings: number;
  totalDeductions: number;
  avgSalary: number;
  statusBreakdown: {
    draft: number;
    processed: number;
    approved: number;
    paid: number;
  };
}

interface SalaryStructure {
  _id: string;
  name: string;
  code: string;
  isActive: boolean;
}

const Payroll: React.FC = () => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin' || user?.role === 'tenant_admin' || user?.role === 'hr';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchPayrolls();
    fetchSummary();
    fetchStructures();
  }, [selectedMonth, selectedYear, statusFilter]);

  const fetchPayrolls = async () => {
    try {
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      const response = await api.get(`/payroll?${params}`);
      setPayrolls(response.data.data?.payrolls || response.data.payrolls || []);
    } catch (error) {
      console.error('Failed to fetch payrolls:', error);
      setPayrolls([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get(`/payroll/summary?month=${selectedMonth}&year=${selectedYear}`);
      setSummary(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const fetchStructures = async () => {
    try {
      const response = await api.get('/payroll/structures');
      setStructures(response.data.data?.structures || response.data.structures || []);
    } catch (error) {
      console.error('Failed to fetch salary structures:', error);
    }
  };

  const handleBulkGenerate = async () => {
    setIsProcessing(true);
    try {
      await api.post('/payroll/generate/bulk', {
        month: selectedMonth,
        year: selectedYear,
      });
      fetchPayrolls();
      fetchSummary();
      setIsGenerateModalOpen(false);
    } catch (error) {
      console.error('Failed to generate payrolls:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcess = async (id: string) => {
    try {
      await api.patch(`/payroll/${id}/process`);
      fetchPayrolls();
      fetchSummary();
    } catch (error) {
      console.error('Failed to process payroll:', error);
    }
  };

  const handleMarkPaid = async (id: string) => {
    try {
      await api.patch(`/payroll/${id}/pay`);
      fetchPayrolls();
      fetchSummary();
    } catch (error) {
      console.error('Failed to mark as paid:', error);
    }
  };

  const handleDownloadPayslip = async (payrollId: string) => {
    try {
      await api.post(`/payroll/${payrollId}/payslip`);
      alert('Payslip generated successfully!');
    } catch (error) {
      console.error('Failed to generate payslip:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <HiDocumentText className="w-3 h-3" /> },
      processed: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <HiClock className="w-3 h-3" /> },
      approved: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <HiCheck className="w-3 h-3" /> },
      paid: { bg: 'bg-green-100', text: 'text-green-700', icon: <HiCurrencyDollar className="w-3 h-3" /> },
    };
    const style = styles[status] || styles.draft;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        {style.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-secondary-200 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-secondary-200 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-secondary-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Payroll Management</h1>
          <p className="text-secondary-500">Process and manage employee payrolls</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setIsGenerateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <HiPlus className="w-5 h-5" />
            Generate Payroll
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500">Total Payroll</p>
                <p className="text-2xl font-bold text-secondary-900">{formatCurrency(summary.totalPayroll || 0)}</p>
              </div>
              <div className="p-3 bg-primary-100 rounded-lg">
                <HiCurrencyDollar className="w-6 h-6 text-primary-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500">Total Employees</p>
                <p className="text-2xl font-bold text-secondary-900">{summary.totalEmployees || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <HiDocumentText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500">Total Earnings</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalEarnings || 0)}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <HiCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-secondary-500">Total Deductions</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalDeductions || 0)}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <HiClock className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-secondary-200">
        <div className="flex items-center gap-2">
          <HiFilter className="w-5 h-5 text-secondary-400" />
          <span className="text-sm font-medium text-secondary-700">Filters:</span>
        </div>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          className="px-3 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {months.map((month, index) => (
            <option key={month} value={index + 1}>{month}</option>
          ))}
        </select>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className="px-3 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          {[2023, 2024, 2025, 2026].map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="processed">Processed</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>
        <button
          onClick={() => { fetchPayrolls(); fetchSummary(); }}
          className="p-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
          title="Refresh"
        >
          <HiRefresh className="w-5 h-5" />
        </button>
      </div>

      {/* Status Breakdown */}
      {summary?.statusBreakdown && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(summary.statusBreakdown).map(([status, count]) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
            </button>
          ))}
        </div>
      )}

      {/* Payroll Table */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Period
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Earnings
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Deductions
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Net Salary
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Status
                </th>
                {isAdmin && (
                  <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {payrolls.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-6 py-12 text-center">
                    <HiCurrencyDollar className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                    <p className="text-secondary-500">No payroll records found</p>
                    <p className="text-sm text-secondary-400 mt-1">
                      Generate payroll for {months[selectedMonth - 1]} {selectedYear}
                    </p>
                  </td>
                </tr>
              ) : (
                payrolls.map((payroll) => (
                  <tr key={payroll._id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-secondary-900">
                          {payroll.employee?.firstName} {payroll.employee?.lastName}
                        </p>
                        <p className="text-sm text-secondary-500">
                          {payroll.employee?.employeeId}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-secondary-600">
                      {months[payroll.month - 1]} {payroll.year}
                    </td>
                    <td className="px-6 py-4 text-right text-green-600 font-medium">
                      {formatCurrency(payroll.totalEarnings)}
                    </td>
                    <td className="px-6 py-4 text-right text-red-600 font-medium">
                      {formatCurrency(payroll.totalDeductions)}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-secondary-900">
                      {formatCurrency(payroll.netSalary)}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(payroll.status)}</td>
                    {isAdmin && (
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedPayroll(payroll)}
                            className="p-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <HiEye className="w-4 h-4" />
                          </button>
                          {payroll.status === 'draft' && (
                            <button
                              onClick={() => handleProcess(payroll._id)}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                              title="Process"
                            >
                              <HiRefresh className="w-4 h-4" />
                            </button>
                          )}
                          {(payroll.status === 'processed' || payroll.status === 'approved') && (
                            <button
                              onClick={() => handleMarkPaid(payroll._id)}
                              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                              title="Mark as Paid"
                            >
                              <HiCheck className="w-4 h-4" />
                            </button>
                          )}
                          {payroll.status === 'paid' && (
                            <button
                              onClick={() => handleDownloadPayslip(payroll._id)}
                              className="p-2 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition-colors"
                              title="Download Payslip"
                            >
                              <HiDocumentDownload className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-secondary-900 mb-4">Generate Payroll</h2>
            <p className="text-secondary-600 mb-6">
              Generate payroll for all employees for{' '}
              <span className="font-semibold">{months[selectedMonth - 1]} {selectedYear}</span>
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-700">
                This will create payroll records for all active employees based on their salary structures.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsGenerateModalOpen(false)}
                className="px-4 py-2 text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkGenerate}
                disabled={isProcessing}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <HiPlus className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Detail Modal */}
      {selectedPayroll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-secondary-900 mb-4">Payroll Details</h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b border-secondary-200">
                <span className="text-secondary-600">Employee</span>
                <span className="font-medium">
                  {selectedPayroll.employee?.firstName} {selectedPayroll.employee?.lastName}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-secondary-200">
                <span className="text-secondary-600">Employee ID</span>
                <span className="font-medium">{selectedPayroll.employee?.employeeId}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-secondary-200">
                <span className="text-secondary-600">Period</span>
                <span className="font-medium">{months[selectedPayroll.month - 1]} {selectedPayroll.year}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-secondary-200">
                <span className="text-secondary-600">Basic Salary</span>
                <span className="font-medium">{formatCurrency(selectedPayroll.basicSalary)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-secondary-200">
                <span className="text-secondary-600">Total Earnings</span>
                <span className="font-medium text-green-600">{formatCurrency(selectedPayroll.totalEarnings)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-secondary-200">
                <span className="text-secondary-600">Total Deductions</span>
                <span className="font-medium text-red-600">{formatCurrency(selectedPayroll.totalDeductions)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-secondary-200">
                <span className="text-secondary-600">Net Salary</span>
                <span className="font-bold text-lg">{formatCurrency(selectedPayroll.netSalary)}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-secondary-600">Status</span>
                {getStatusBadge(selectedPayroll.status)}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-secondary-200">
              <button
                onClick={() => setSelectedPayroll(null)}
                className="px-4 py-2 text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                Close
              </button>
              {selectedPayroll.status === 'paid' && (
                <button
                  onClick={() => {
                    handleDownloadPayslip(selectedPayroll._id);
                    setSelectedPayroll(null);
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                >
                  <HiDocumentDownload className="w-4 h-4" />
                  Download Payslip
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
