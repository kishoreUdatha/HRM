import React, { useState, useEffect } from 'react';
import {
  HiClock,
  HiPlus,
  HiCheck,
  HiX,
  HiRefresh,
  HiFilter,
  HiSearch,
  HiCalendar,
  HiUser,
  HiCheckCircle,
  HiXCircle,
  HiExclamationCircle,
  HiCurrencyRupee,
  HiUserGroup,
  HiTrendingUp,
} from 'react-icons/hi';
import api from '../services/api';
import { useAppSelector } from '../hooks/useAppDispatch';

interface OvertimeEntry {
  _id: string;
  tenantId: string;
  employeeId: string;
  employee?: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    department?: string;
  };
  date: string;
  regularHours: number;
  overtimeHours: number;
  overtimeType: 'regular' | 'weekend' | 'holiday' | 'night';
  rate: number;
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  remarks?: string;
  createdAt: string;
}

interface OvertimeSummary {
  totalEntries: number;
  totalHours: number;
  totalAmount: number;
  pendingApprovals: number;
  approvedEntries: number;
  paidEntries: number;
  typeBreakdown: Record<string, { hours: number; amount: number }>;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  department?: { name: string };
}

const OvertimeManagement: React.FC = () => {
  const [entries, setEntries] = useState<OvertimeEntry[]>([]);
  const [pendingEntries, setPendingEntries] = useState<OvertimeEntry[]>([]);
  const [summary, setSummary] = useState<OvertimeSummary | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<OvertimeEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin' || user?.role === 'tenant_admin' || user?.role === 'hr';

  // Form state for adding new entry
  const [entryForm, setEntryForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    overtimeHours: 1,
    overtimeType: 'regular' as 'regular' | 'weekend' | 'holiday' | 'night',
    remarks: '',
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const tenantId = localStorage.getItem('tenantId');
      const [pendingRes, summaryRes, employeesRes] = await Promise.all([
        api.get(`/payroll/extended/overtime/entries/${tenantId}/pending`),
        api.get(`/payroll/extended/overtime/summary/${tenantId}?month=${selectedMonth}&year=${selectedYear}`),
        api.get('/employees'),
      ]);

      setPendingEntries(pendingRes.data.data || []);
      setSummary(summaryRes.data.data || null);
      setEmployees(employeesRes.data.data || employeesRes.data.employees || []);
    } catch (error) {
      console.error('Failed to fetch overtime data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEntry = async () => {
    setIsSaving(true);
    try {
      const tenantId = localStorage.getItem('tenantId');

      // Get default overtime rates (we'll use basic multipliers)
      const multipliers = {
        regular: 1.5,
        weekend: 2,
        holiday: 2.5,
        night: 1.75,
      };

      // For now, use a default hourly rate of 200
      const hourlyRate = 200;

      const payload = {
        tenantId,
        employeeId: entryForm.employeeId,
        date: entryForm.date,
        overtimeHours: entryForm.overtimeHours,
        overtimeType: entryForm.overtimeType,
        remarks: entryForm.remarks,
        hourlyRate,
        overtimeMultiplier: multipliers[entryForm.overtimeType],
      };

      await api.post('/payroll/extended/overtime/entries', payload);
      setIsAddModalOpen(false);
      resetEntryForm();
      fetchData();
    } catch (error) {
      console.error('Failed to add overtime entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprove = async (entryId: string, approved: boolean) => {
    setIsSaving(true);
    try {
      const userId = user?._id || localStorage.getItem('userId');
      await api.put(`/payroll/extended/overtime/entries/${entryId}/approve`, {
        approverId: userId,
        approved,
        rejectionReason: approved ? undefined : rejectionReason,
      });
      setIsApproveModalOpen(false);
      setSelectedEntry(null);
      setRejectionReason('');
      fetchData();
    } catch (error) {
      console.error('Failed to approve/reject entry:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetEntryForm = () => {
    setEntryForm({
      employeeId: '',
      date: new Date().toISOString().split('T')[0],
      overtimeHours: 1,
      overtimeType: 'regular',
      remarks: '',
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <HiExclamationCircle className="w-4 h-4" /> },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <HiCheckCircle className="w-4 h-4" /> },
      rejected: { bg: 'bg-rose-100', text: 'text-rose-700', icon: <HiXCircle className="w-4 h-4" /> },
      paid: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <HiCheck className="w-4 h-4" /> },
    };
    return configs[status] || configs.pending;
  };

  const getOTTypeConfig = (type: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      regular: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Regular' },
      weekend: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Weekend' },
      holiday: { bg: 'bg-rose-100', text: 'text-rose-700', label: 'Holiday' },
      night: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Night' },
    };
    return configs[type] || configs.regular;
  };

  const getEmployeeName = (entry: OvertimeEntry): string => {
    if (entry.employee?.firstName) {
      return `${entry.employee.firstName} ${entry.employee.lastName || ''}`;
    }
    const emp = employees.find(e => e._id === entry.employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
  };

  const filteredPendingEntries = pendingEntries.filter(entry => {
    if (!searchTerm) return true;
    const name = getEmployeeName(entry).toLowerCase();
    return name.includes(searchTerm.toLowerCase());
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
      <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-2xl p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HiClock className="w-6 h-6 text-orange-200" />
              <span className="text-sm font-medium text-white/80">Time & Attendance</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">Overtime Management</h1>
            <p className="text-white/70">{months[selectedMonth - 1]} {selectedYear} Overview</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => {
                resetEntryForm();
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-orange-600 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg"
            >
              <HiPlus className="w-5 h-5" />
              Add OT Entry
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-white shadow-lg shadow-amber-500/25">
                <HiClock className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Total Hours</span>
            </div>
            <p className="text-2xl font-bold text-secondary-900">{summary?.totalHours?.toFixed(1) || 0} hrs</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl text-white shadow-lg shadow-emerald-500/25">
                <HiCurrencyRupee className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Total Amount</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary?.totalAmount || 0)}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/10 to-yellow-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-yellow-500 rounded-xl text-white shadow-lg shadow-amber-500/25">
                <HiExclamationCircle className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Pending Approvals</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{summary?.pendingApprovals || 0}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white shadow-lg shadow-blue-500/25">
                <HiUserGroup className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Total Entries</span>
            </div>
            <p className="text-2xl font-bold text-secondary-900">{summary?.totalEntries || 0}</p>
          </div>
        </div>
      </div>

      {/* Type Breakdown */}
      {summary?.typeBreakdown && Object.keys(summary.typeBreakdown).length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Overtime by Type</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(summary.typeBreakdown).map(([type, data]) => {
              const config = getOTTypeConfig(type);
              return (
                <div key={type} className={`${config.bg} rounded-xl p-4`}>
                  <p className={`text-sm font-medium ${config.text} mb-2`}>{config.label}</p>
                  <p className="text-xl font-bold text-secondary-900">{data.hours.toFixed(1)} hrs</p>
                  <p className="text-sm text-secondary-600">{formatCurrency(data.amount)}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <HiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by employee name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer font-medium"
            >
              {months.map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer font-medium"
            >
              {[2023, 2024, 2025, 2026].map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <button
              onClick={fetchData}
              className="p-3 text-secondary-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
              title="Refresh"
            >
              <HiRefresh className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Pending Approvals */}
      {isAdmin && filteredPendingEntries.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-secondary-100 bg-gradient-to-r from-amber-50 to-orange-50">
            <h3 className="text-lg font-semibold text-secondary-900 flex items-center gap-2">
              <HiExclamationCircle className="w-5 h-5 text-amber-500" />
              Pending Approvals ({filteredPendingEntries.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-secondary-50">
                  <th className="text-left px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Employee</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Date</th>
                  <th className="text-center px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Type</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Hours</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Remarks</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {filteredPendingEntries.map((entry) => {
                  const otConfig = getOTTypeConfig(entry.overtimeType);
                  return (
                    <tr key={entry._id} className="hover:bg-secondary-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                            {getEmployeeName(entry).charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-secondary-900">{getEmployeeName(entry)}</p>
                            <p className="text-sm text-secondary-500">{entry.employee?.employeeCode || ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-secondary-600">
                          <HiCalendar className="w-4 h-4" />
                          {formatDate(entry.date)}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${otConfig.bg} ${otConfig.text}`}>
                          {otConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-secondary-900">
                        {entry.overtimeHours} hrs
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-emerald-600">
                        {formatCurrency(entry.amount)}
                      </td>
                      <td className="px-6 py-4 text-secondary-600 text-sm max-w-[200px] truncate">
                        {entry.remarks || '-'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(entry._id, true)}
                            className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                            title="Approve"
                          >
                            <HiCheck className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedEntry(entry);
                              setIsApproveModalOpen(true);
                            }}
                            className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors"
                            title="Reject"
                          >
                            <HiX className="w-5 h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredPendingEntries.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-12 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <HiCheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-secondary-900 mb-2">All Caught Up!</h3>
          <p className="text-secondary-500">No pending overtime approvals at the moment.</p>
        </div>
      )}

      {/* Add Entry Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <HiClock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Add Overtime Entry</h2>
                  <p className="text-white/70 text-sm">Record overtime hours for an employee</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Employee</label>
                <select
                  value={entryForm.employeeId}
                  onChange={(e) => setEntryForm({ ...entryForm, employeeId: e.target.value })}
                  className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={entryForm.date}
                    onChange={(e) => setEntryForm({ ...entryForm, date: e.target.value })}
                    className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">OT Hours</label>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    value={entryForm.overtimeHours}
                    onChange={(e) => setEntryForm({ ...entryForm, overtimeHours: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Overtime Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {['regular', 'weekend', 'holiday', 'night'].map((type) => {
                    const config = getOTTypeConfig(type);
                    return (
                      <button
                        key={type}
                        onClick={() => setEntryForm({ ...entryForm, overtimeType: type as any })}
                        className={`px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all ${
                          entryForm.overtimeType === type
                            ? 'border-orange-500 bg-orange-50 text-orange-700'
                            : 'border-secondary-200 text-secondary-600 hover:border-secondary-300'
                        }`}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Remarks (Optional)</label>
                <textarea
                  value={entryForm.remarks}
                  onChange={(e) => setEntryForm({ ...entryForm, remarks: e.target.value })}
                  className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={2}
                  placeholder="Reason for overtime..."
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetEntryForm();
                }}
                className="px-4 py-2.5 text-secondary-700 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEntry}
                disabled={isSaving || !entryForm.employeeId || !entryForm.date || entryForm.overtimeHours <= 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 transition-all font-medium disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiPlus className="w-5 h-5" />
                )}
                Add Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {isApproveModalOpen && selectedEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-rose-500 to-pink-500 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <HiXCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Reject Overtime</h2>
                  <p className="text-white/70 text-sm">Provide a reason for rejection</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-secondary-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-secondary-500">Employee</span>
                  <span className="font-medium text-secondary-900">{getEmployeeName(selectedEntry)}</span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-secondary-500">Date</span>
                  <span className="font-medium text-secondary-900">{formatDate(selectedEntry.date)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-secondary-500">Hours / Amount</span>
                  <span className="font-medium text-secondary-900">
                    {selectedEntry.overtimeHours} hrs / {formatCurrency(selectedEntry.amount)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Rejection Reason</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                  rows={3}
                  placeholder="Please provide a reason for rejection..."
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsApproveModalOpen(false);
                  setSelectedEntry(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2.5 text-secondary-700 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleApprove(selectedEntry._id, false)}
                disabled={isSaving || !rejectionReason.trim()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-xl hover:from-rose-600 hover:to-pink-600 transition-all font-medium disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiX className="w-5 h-5" />
                )}
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OvertimeManagement;
