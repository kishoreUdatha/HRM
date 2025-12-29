import React, { useState, useEffect, useRef } from 'react';
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
  HiX,
  HiPrinter,
  HiUserGroup,
  HiTrendingUp,
  HiCalendar,
  HiOfficeBuilding,
  HiMail,
  HiPhone,
  HiCreditCard,
  HiClipboardCheck,
  HiSearch,
} from 'react-icons/hi';
import api from '../services/api';
import { useAppSelector } from '../hooks/useAppDispatch';

interface PayrollEarning {
  name: string;
  code: string;
  amount: number;
  isTaxable?: boolean;
}

interface PayrollDeduction {
  name: string;
  code: string;
  amount: number;
}

interface Payroll {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    email?: string;
    department?: { name: string };
  };
  employeeId: string;
  month: number;
  year: number;
  baseSalary: number;
  grossSalary: number;
  earnings: PayrollEarning[];
  deductions: PayrollDeduction[];
  totalDeductions: number;
  netSalary: number;
  taxableIncome: number;
  incomeTax: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  lopDays: number;
  overtimeHours: number;
  overtimePay: number;
  status: 'draft' | 'processed' | 'approved' | 'paid';
  processedAt?: string;
  paidAt?: string;
  paymentReference?: string;
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

const Payroll: React.FC = () => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [summary, setSummary] = useState<PayrollSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
  const [isPayslipOpen, setIsPayslipOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const payslipRef = useRef<HTMLDivElement>(null);

  const { user, tenant } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin' || user?.role === 'tenant_admin' || user?.role === 'hr';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchPayrolls();
    fetchSummary();
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

  const escapeHtml = (text: string | undefined | null): string => {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };

  const handleDownloadPDF = async (payroll: Payroll) => {
    if (!payroll || !tenant?._id) return;

    setIsDownloading(true);
    try {
      const response = await api.get(
        `/payroll/${tenant._id}/employees/${payroll.employeeId}/payslips/${payroll._id}/download`,
        { responseType: 'blob' }
      );

      // Create blob URL and trigger download
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Payslip_${getEmployeeCode(payroll)}_${months[payroll.month - 1]}_${payroll.year}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download payslip:', error);
      alert('Failed to download payslip PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrintPayslip = () => {
    const printContent = payslipRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const safeFirstName = escapeHtml(selectedPayroll?.employee?.firstName);
    const safeLastName = escapeHtml(selectedPayroll?.employee?.lastName);

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Payslip - ${safeFirstName} ${safeLastName}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; background: white; }
            .payslip { max-width: 800px; margin: 0 auto; border: 2px solid #1e40af; }
            .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 20px; text-align: center; }
            .header h1 { font-size: 24px; margin-bottom: 5px; }
            .header p { opacity: 0.9; }
            .period-badge { background: rgba(255,255,255,0.2); padding: 8px 16px; border-radius: 20px; display: inline-block; margin-top: 10px; }
            .employee-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding: 20px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; }
            .info-group label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .info-group p { font-weight: 600; color: #1e293b; margin-top: 2px; }
            .salary-section { padding: 20px; }
            .section-title { font-weight: 600; color: #1e293b; margin-bottom: 15px; padding-bottom: 8px; border-bottom: 2px solid #e2e8f0; }
            .salary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .salary-table { width: 100%; }
            .salary-table th, .salary-table td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
            .salary-table th { font-size: 11px; color: #64748b; text-transform: uppercase; }
            .salary-table td:last-child { text-align: right; font-weight: 500; }
            .earning { color: #059669; }
            .deduction { color: #dc2626; }
            .total-row { background: #f1f5f9; font-weight: 600; }
            .net-salary { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 20px; display: flex; justify-content: space-between; align-items: center; }
            .net-salary h3 { font-size: 14px; opacity: 0.9; }
            .net-salary .amount { font-size: 28px; font-weight: 700; }
            .footer { padding: 15px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 11px; color: #64748b; text-align: center; }
            @media print { body { padding: 0; } .payslip { border: none; } }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const formatCurrency = (amount: number | undefined | null): string => {
    const safeAmount = Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(safeAmount);
  };

  const safeNumber = (value: number | undefined | null): number => {
    return Number(value) || 0;
  };

  const getEmployeeName = (payroll: Payroll): string => {
    if (payroll.employee?.firstName && payroll.employee?.lastName) {
      return `${payroll.employee.firstName} ${payroll.employee.lastName}`;
    }
    if (payroll.employee?.firstName) {
      return payroll.employee.firstName;
    }
    return 'Unknown Employee';
  };

  const getEmployeeCode = (payroll: Payroll): string => {
    return payroll.employee?.employeeCode || payroll.employeeId || 'N/A';
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; gradient: string; icon: React.ReactNode }> = {
      draft: { bg: 'bg-slate-100', text: 'text-slate-700', gradient: 'from-slate-500 to-slate-600', icon: <HiDocumentText className="w-4 h-4" /> },
      processed: { bg: 'bg-blue-100', text: 'text-blue-700', gradient: 'from-blue-500 to-blue-600', icon: <HiClock className="w-4 h-4" /> },
      approved: { bg: 'bg-amber-100', text: 'text-amber-700', gradient: 'from-amber-500 to-amber-600', icon: <HiClipboardCheck className="w-4 h-4" /> },
      paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', gradient: 'from-emerald-500 to-emerald-600', icon: <HiCheck className="w-4 h-4" /> },
    };
    return configs[status] || configs.draft;
  };

  const filteredPayrolls = payrolls.filter(p => {
    if (!searchTerm) return true;
    const name = getEmployeeName(p).toLowerCase();
    const code = getEmployeeCode(p).toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || code.includes(search);
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gradient-to-r from-secondary-200 to-secondary-100 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-secondary-200 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-secondary-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HiCurrencyDollar className="w-6 h-6 text-emerald-200" />
              <span className="text-sm font-medium text-white/80">Payroll Management</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">Employee Payroll</h1>
            <p className="text-white/70">{months[selectedMonth - 1]} {selectedYear} Payroll Overview</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setIsGenerateModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-600 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg"
            >
              <HiPlus className="w-5 h-5" />
              Generate Payroll
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white shadow-lg shadow-emerald-500/25">
                <HiCurrencyDollar className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Total Payroll</span>
            </div>
            <p className="text-2xl font-bold text-secondary-900">{formatCurrency(summary?.totalPayroll)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white shadow-lg shadow-blue-500/25">
                <HiUserGroup className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Employees</span>
            </div>
            <p className="text-2xl font-bold text-secondary-900">{safeNumber(summary?.totalEmployees)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-green-500 to-emerald-500 rounded-xl text-white shadow-lg shadow-green-500/25">
                <HiTrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Total Earnings</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(summary?.totalEarnings)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-rose-500/10 to-pink-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl text-white shadow-lg shadow-rose-500/25">
                <HiCreditCard className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Total Deductions</span>
            </div>
            <p className="text-2xl font-bold text-rose-600">{formatCurrency(summary?.totalDeductions)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <HiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by employee name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer font-medium"
            >
              {months.map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer font-medium"
            >
              {[2023, 2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="processed">Processed</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
            </select>
            <button
              onClick={() => { fetchPayrolls(); fetchSummary(); }}
              className="p-3 text-secondary-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"
              title="Refresh"
            >
              <HiRefresh className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Status Pills */}
      {summary?.statusBreakdown && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 text-sm font-medium rounded-xl transition-all ${
              statusFilter === 'all'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25'
                : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50'
            }`}
          >
            All: {filteredPayrolls.length}
          </button>
          {Object.entries(summary.statusBreakdown).map(([status, count]) => {
            const config = getStatusConfig(status);
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                  statusFilter === status
                    ? `bg-gradient-to-r ${config.gradient} text-white shadow-lg`
                    : `${config.bg} ${config.text} hover:opacity-80`
                }`}
              >
                {config.icon}
                {status.charAt(0).toUpperCase() + status.slice(1)}: {safeNumber(count)}
              </button>
            );
          })}
        </div>
      )}

      {/* Payroll Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-secondary-50 to-secondary-100">
                <th className="text-left px-6 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="text-left px-6 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">
                  Period
                </th>
                <th className="text-right px-6 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">
                  Gross Salary
                </th>
                <th className="text-right px-6 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">
                  Deductions
                </th>
                <th className="text-right px-6 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">
                  Net Salary
                </th>
                <th className="text-center px-6 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {filteredPayrolls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <HiCurrencyDollar className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="text-lg font-semibold text-secondary-900">No Payroll Records</p>
                    <p className="text-secondary-500 mt-1">
                      Generate payroll for {months[selectedMonth - 1]} {selectedYear}
                    </p>
                    {isAdmin && (
                      <button
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium shadow-lg shadow-emerald-500/25"
                      >
                        <HiPlus className="w-4 h-4" />
                        Generate Payroll
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredPayrolls.map((payroll, index) => {
                  const statusConfig = getStatusConfig(payroll.status);
                  // Use compound key to ensure uniqueness even with potential duplicate IDs
                  const uniqueKey = `${payroll._id}-${payroll.employeeId}-${payroll.month}-${payroll.year}-${index}`;
                  return (
                    <tr key={uniqueKey} className={`hover:bg-secondary-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/30'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {getEmployeeName(payroll).charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-secondary-900">{getEmployeeName(payroll)}</p>
                            <p className="text-sm text-secondary-500">{getEmployeeCode(payroll)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <HiCalendar className="w-4 h-4 text-secondary-400" />
                          <span className="text-secondary-600">{months[payroll.month - 1]} {payroll.year}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-secondary-900">{formatCurrency(payroll.grossSalary)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-medium text-rose-600">{formatCurrency(payroll.totalDeductions)}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-lg bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                          {formatCurrency(payroll.netSalary)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.icon}
                          {payroll.status.charAt(0).toUpperCase() + payroll.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setSelectedPayroll(payroll); setIsPayslipOpen(true); }}
                            className="p-2 text-secondary-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                            title="View Payslip"
                          >
                            <HiEye className="w-5 h-5" />
                          </button>
                          {(payroll.status === 'processed' || payroll.status === 'paid') && (
                            <button
                              onClick={() => handleDownloadPDF(payroll)}
                              disabled={isDownloading}
                              className="p-2 text-secondary-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all disabled:opacity-50"
                              title="Download PDF"
                            >
                              <HiDocumentDownload className="w-5 h-5" />
                            </button>
                          )}
                          {isAdmin && payroll.status === 'draft' && (
                            <button
                              onClick={() => handleProcess(payroll._id)}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                              title="Process"
                            >
                              <HiRefresh className="w-5 h-5" />
                            </button>
                          )}
                          {isAdmin && (payroll.status === 'processed' || payroll.status === 'approved') && (
                            <button
                              onClick={() => handleMarkPaid(payroll._id)}
                              className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                              title="Mark as Paid"
                            >
                              <HiCheck className="w-5 h-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <HiCurrencyDollar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Generate Payroll</h2>
                  <p className="text-white/70 text-sm">Create payroll for all employees</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-2xl">
                <div className="flex items-center gap-3 text-secondary-600">
                  <HiCalendar className="w-5 h-5" />
                  <p>
                    Generating payroll for <span className="font-bold text-secondary-900">{months[selectedMonth - 1]} {selectedYear}</span>
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-sm text-amber-700">
                  This will create payroll records for all active employees based on their salary structures.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setIsGenerateModalOpen(false)}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 text-secondary-700 bg-secondary-100 rounded-xl hover:bg-secondary-200 transition-all font-semibold disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkGenerate}
                  disabled={isProcessing}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <HiPlus className="w-5 h-5" />
                      Generate
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Payslip Modal */}
      {isPayslipOpen && selectedPayroll && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <HiDocumentText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Payslip</h2>
                  <p className="text-white/70 text-sm">{months[selectedPayroll.month - 1]} {selectedPayroll.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPDF(selectedPayroll)}
                  disabled={isDownloading}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-white disabled:opacity-50"
                  title="Download PDF"
                >
                  {isDownloading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <HiDocumentDownload className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={handlePrintPayslip}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-white"
                  title="Print Payslip"
                >
                  <HiPrinter className="w-5 h-5" />
                </button>
                <button
                  onClick={() => { setIsPayslipOpen(false); setSelectedPayroll(null); }}
                  className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-white"
                >
                  <HiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Payslip Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div ref={payslipRef} className="payslip border-2 border-blue-600 rounded-xl overflow-hidden">
                {/* Payslip Header */}
                <div className="header bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 text-center">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <HiOfficeBuilding className="w-8 h-8" />
                    <h1 className="text-2xl font-bold">ACME Corporation</h1>
                  </div>
                  <p className="text-white/80">123 Business Park, Tech City, India - 500001</p>
                  <div className="period-badge inline-block bg-white/20 px-4 py-2 rounded-full mt-3">
                    <span className="font-semibold">Payslip for {months[selectedPayroll.month - 1]} {selectedPayroll.year}</span>
                  </div>
                </div>

                {/* Employee Information */}
                <div className="employee-info grid grid-cols-2 gap-6 p-6 bg-secondary-50 border-b border-secondary-200">
                  <div className="space-y-4">
                    <div className="info-group">
                      <label className="text-xs text-secondary-500 uppercase tracking-wider font-medium">Employee Name</label>
                      <p className="font-semibold text-secondary-900 text-lg">{getEmployeeName(selectedPayroll)}</p>
                    </div>
                    <div className="info-group">
                      <label className="text-xs text-secondary-500 uppercase tracking-wider font-medium">Employee Code</label>
                      <p className="font-semibold text-secondary-900">{getEmployeeCode(selectedPayroll)}</p>
                    </div>
                    <div className="info-group">
                      <label className="text-xs text-secondary-500 uppercase tracking-wider font-medium">Email</label>
                      <p className="font-medium text-secondary-700">{selectedPayroll.employee?.email || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="info-group">
                      <label className="text-xs text-secondary-500 uppercase tracking-wider font-medium">Pay Period</label>
                      <p className="font-semibold text-secondary-900">{months[selectedPayroll.month - 1]} {selectedPayroll.year}</p>
                    </div>
                    <div className="info-group">
                      <label className="text-xs text-secondary-500 uppercase tracking-wider font-medium">Working Days</label>
                      <p className="font-semibold text-secondary-900">{safeNumber(selectedPayroll.presentDays)} / {safeNumber(selectedPayroll.workingDays)} days</p>
                    </div>
                    <div className="info-group">
                      <label className="text-xs text-secondary-500 uppercase tracking-wider font-medium">Payment Reference</label>
                      <p className="font-medium text-secondary-700">{selectedPayroll.paymentReference || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                {/* Salary Details */}
                <div className="salary-section p-6">
                  <div className="grid grid-cols-2 gap-8">
                    {/* Earnings */}
                    <div>
                      <h3 className="section-title text-lg font-bold text-secondary-900 mb-4 pb-2 border-b-2 border-emerald-500">
                        Earnings
                      </h3>
                      <table className="salary-table w-full">
                        <thead>
                          <tr>
                            <th className="text-left py-2 text-xs text-secondary-500 uppercase">Component</th>
                            <th className="text-right py-2 text-xs text-secondary-500 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b border-secondary-100">
                            <td className="py-3 text-secondary-700">Basic Salary</td>
                            <td className="py-3 text-right font-medium text-emerald-600">{formatCurrency(selectedPayroll.baseSalary)}</td>
                          </tr>
                          {(selectedPayroll.earnings || []).map((earning, idx) => (
                            <tr key={idx} className="border-b border-secondary-100">
                              <td className="py-3 text-secondary-700">{earning.name}</td>
                              <td className="py-3 text-right font-medium text-emerald-600">{formatCurrency(earning.amount)}</td>
                            </tr>
                          ))}
                          {safeNumber(selectedPayroll.overtimePay) > 0 && (
                            <tr className="border-b border-secondary-100">
                              <td className="py-3 text-secondary-700">Overtime ({safeNumber(selectedPayroll.overtimeHours)} hrs)</td>
                              <td className="py-3 text-right font-medium text-emerald-600">{formatCurrency(selectedPayroll.overtimePay)}</td>
                            </tr>
                          )}
                          <tr className="total-row bg-emerald-50">
                            <td className="py-3 font-bold text-secondary-900">Total Earnings</td>
                            <td className="py-3 text-right font-bold text-emerald-600 text-lg">{formatCurrency(selectedPayroll.grossSalary)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Deductions */}
                    <div>
                      <h3 className="section-title text-lg font-bold text-secondary-900 mb-4 pb-2 border-b-2 border-rose-500">
                        Deductions
                      </h3>
                      <table className="salary-table w-full">
                        <thead>
                          <tr>
                            <th className="text-left py-2 text-xs text-secondary-500 uppercase">Component</th>
                            <th className="text-right py-2 text-xs text-secondary-500 uppercase">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedPayroll.deductions || []).map((deduction, idx) => (
                            <tr key={idx} className="border-b border-secondary-100">
                              <td className="py-3 text-secondary-700">{deduction.name}</td>
                              <td className="py-3 text-right font-medium text-rose-600">{formatCurrency(deduction.amount)}</td>
                            </tr>
                          ))}
                          {safeNumber(selectedPayroll.incomeTax) > 0 && (
                            <tr className="border-b border-secondary-100">
                              <td className="py-3 text-secondary-700">Income Tax (TDS)</td>
                              <td className="py-3 text-right font-medium text-rose-600">{formatCurrency(selectedPayroll.incomeTax)}</td>
                            </tr>
                          )}
                          <tr className="total-row bg-rose-50">
                            <td className="py-3 font-bold text-secondary-900">Total Deductions</td>
                            <td className="py-3 text-right font-bold text-rose-600 text-lg">{formatCurrency(selectedPayroll.totalDeductions)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Net Salary */}
                <div className="net-salary bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-sm uppercase tracking-wider opacity-90">Net Salary Payable</h3>
                    <p className="text-xs opacity-70 mt-1">Amount credited to bank account</p>
                  </div>
                  <div className="text-right">
                    <p className="amount text-4xl font-bold">{formatCurrency(selectedPayroll.netSalary)}</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="footer p-4 bg-secondary-50 border-t border-secondary-200 text-center">
                  <p className="text-xs text-secondary-500">
                    This is a computer-generated payslip and does not require a signature.
                  </p>
                  <p className="text-xs text-secondary-400 mt-1">
                    Generated on {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex justify-end gap-3">
              <button
                onClick={() => { setIsPayslipOpen(false); setSelectedPayroll(null); }}
                className="px-4 py-2.5 text-secondary-700 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all font-medium"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadPDF(selectedPayroll)}
                disabled={isDownloading}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-medium shadow-lg shadow-emerald-500/25 disabled:opacity-50"
              >
                {isDownloading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiDocumentDownload className="w-5 h-5" />
                )}
                Download PDF
              </button>
              <button
                onClick={handlePrintPayslip}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-blue-500/25"
              >
                <HiPrinter className="w-5 h-5" />
                Print Payslip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payroll;
