import React, { useState, useEffect } from 'react';
import {
  HiRefresh,
  HiSearch,
  HiAdjustments,
  HiUserGroup,
  HiPlus,
  HiMinus,
  HiChevronDown,
  HiChevronUp,
  HiCalendar,
  HiTrendingUp,
  HiTrendingDown,
  HiClock,
  HiCheckCircle,
  HiExclamationCircle,
  HiSparkles,
  HiViewGrid,
  HiViewList,
} from 'react-icons/hi';
import api from '../services/api';

interface LeaveType {
  _id: string;
  name: string;
  code: string;
  isPaid: boolean;
  defaultDays: number;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email?: string;
  department?: { _id: string; name: string };
}

interface LeaveBalance {
  _id: string;
  employeeId: string;
  leaveTypeId: LeaveType;
  year: number;
  entitled: number;
  used: number;
  pending: number;
  carriedForward: number;
  adjusted: number;
  balance: number;
  employee?: Employee;
}

interface EmployeeBalances {
  employee: Employee;
  balances: LeaveBalance[];
  totalEntitled: number;
  totalUsed: number;
  totalPending: number;
  totalBalance: number;
}

const LeaveBalances: React.FC = () => {
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedLeaveType, setSelectedLeaveType] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Adjust balance modal
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingBalance, setAdjustingBalance] = useState<LeaveBalance | null>(null);
  const [adjustmentValue, setAdjustmentValue] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Initialize modal
  const [isInitializeModalOpen, setIsInitializeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');

  useEffect(() => {
    fetchLeaveTypes();
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchBalances();
  }, [selectedYear, selectedLeaveType]);

  const fetchLeaveTypes = async () => {
    try {
      const response = await api.get('/leaves/types?isActive=true');
      setLeaveTypes(response.data.data?.leaveTypes || []);
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees?status=active&limit=500');
      setEmployees(response.data.data?.employees || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchBalances = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        limit: '1000',
      });
      if (selectedLeaveType) params.append('leaveTypeId', selectedLeaveType);

      const response = await api.get(`/leaves/balance?${params}`);
      setBalances(response.data.data?.balances || []);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkInitialize = async (force = false) => {
    setIsInitializing(true);
    try {
      const response = await api.post('/leaves/balance/bulk-initialize', { year: selectedYear, force });
      if (response.data?.message) {
        alert(response.data.message);
      }
      fetchBalances();
    } catch (error) {
      console.error('Failed to bulk initialize:', error);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleInitializeEmployee = async () => {
    if (!selectedEmployee) return;
    try {
      await api.post('/leaves/balance/initialize', {
        employeeId: selectedEmployee,
        year: selectedYear,
      });
      setIsInitializeModalOpen(false);
      setSelectedEmployee('');
      fetchBalances();
    } catch (error) {
      console.error('Failed to initialize employee balance:', error);
    }
  };

  const handleAdjustBalance = async () => {
    if (!adjustingBalance || adjustmentValue === 0) return;
    try {
      await api.post('/leaves/balance/adjust', {
        employeeId: adjustingBalance.employeeId,
        leaveTypeId: adjustingBalance.leaveTypeId._id,
        year: selectedYear,
        adjustment: adjustmentValue,
        reason: adjustmentReason,
      });
      setIsAdjustModalOpen(false);
      setAdjustingBalance(null);
      setAdjustmentValue(0);
      setAdjustmentReason('');
      fetchBalances();
    } catch (error) {
      console.error('Failed to adjust balance:', error);
    }
  };

  const openAdjustModal = (balance: LeaveBalance) => {
    setAdjustingBalance(balance);
    setAdjustmentValue(0);
    setAdjustmentReason('');
    setIsAdjustModalOpen(true);
  };

  const toggleEmployeeExpand = (employeeId: string) => {
    const newExpanded = new Set(expandedEmployees);
    if (newExpanded.has(employeeId)) {
      newExpanded.delete(employeeId);
    } else {
      newExpanded.add(employeeId);
    }
    setExpandedEmployees(newExpanded);
  };

  // Group balances by employee with safe number handling
  const employeeBalances: EmployeeBalances[] = React.useMemo(() => {
    const groups = new Map<string, EmployeeBalances>();

    balances.forEach((balance) => {
      const employeeId = balance.employeeId;
      if (!groups.has(employeeId)) {
        groups.set(employeeId, {
          employee: balance.employee || {
            _id: employeeId,
            firstName: 'Unknown',
            lastName: '',
            employeeCode: '',
          },
          balances: [],
          totalEntitled: 0,
          totalUsed: 0,
          totalPending: 0,
          totalBalance: 0,
        });
      }
      const group = groups.get(employeeId)!;
      group.balances.push(balance);
      group.totalEntitled += Number(balance.entitled) || 0;
      group.totalUsed += Number(balance.used) || 0;
      group.totalPending += Number(balance.pending) || 0;
      group.totalBalance += Number(balance.balance) || 0;
    });

    return Array.from(groups.values())
      .filter((group) => {
        if (!searchTerm) return true;
        const search = searchTerm.toLowerCase();
        return (
          group.employee.firstName.toLowerCase().includes(search) ||
          group.employee.lastName.toLowerCase().includes(search) ||
          group.employee.employeeCode.toLowerCase().includes(search)
        );
      })
      .sort((a, b) => a.employee.firstName.localeCompare(b.employee.firstName));
  }, [balances, searchTerm]);

  // Summary stats with safe number handling
  const stats = React.useMemo(() => {
    const totalEmployees = employeeBalances.length;
    const totalEntitled = employeeBalances.reduce((sum, eb) => sum + (Number(eb.totalEntitled) || 0), 0);
    const totalUsed = employeeBalances.reduce((sum, eb) => sum + (Number(eb.totalUsed) || 0), 0);
    const totalPending = employeeBalances.reduce((sum, eb) => sum + (Number(eb.totalPending) || 0), 0);
    const totalBalance = employeeBalances.reduce((sum, eb) => sum + (Number(eb.totalBalance) || 0), 0);
    const lowBalanceCount = employeeBalances.filter(eb =>
      eb.balances.some(b => (Number(b.balance) || 0) <= 2 && (Number(b.entitled) || 0) > 0)
    ).length;
    const utilizationRate = totalEntitled > 0 ? Math.round((totalUsed / totalEntitled) * 100) : 0;
    return { totalEmployees, totalEntitled, totalUsed, totalPending, totalBalance, lowBalanceCount, utilizationRate };
  }, [employeeBalances]);

  // Leave type color schemes
  const getLeaveTypeColors = (code: string) => {
    const colorSchemes: Record<string, { gradient: string; bg: string; text: string; light: string; border: string }> = {
      AL: { gradient: 'from-blue-500 to-cyan-400', bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
      SL: { gradient: 'from-rose-500 to-pink-400', bg: 'bg-rose-500', text: 'text-rose-600', light: 'bg-rose-50', border: 'border-rose-200' },
      CL: { gradient: 'from-teal-500 to-emerald-400', bg: 'bg-teal-500', text: 'text-teal-600', light: 'bg-teal-50', border: 'border-teal-200' },
      ML: { gradient: 'from-fuchsia-500 to-purple-400', bg: 'bg-fuchsia-500', text: 'text-fuchsia-600', light: 'bg-fuchsia-50', border: 'border-fuchsia-200' },
      PL: { gradient: 'from-indigo-500 to-violet-400', bg: 'bg-indigo-500', text: 'text-indigo-600', light: 'bg-indigo-50', border: 'border-indigo-200' },
      UL: { gradient: 'from-slate-500 to-gray-400', bg: 'bg-slate-500', text: 'text-slate-600', light: 'bg-slate-50', border: 'border-slate-200' },
      CO: { gradient: 'from-amber-500 to-yellow-400', bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', border: 'border-amber-200' },
      BL: { gradient: 'from-violet-500 to-purple-400', bg: 'bg-violet-500', text: 'text-violet-600', light: 'bg-violet-50', border: 'border-violet-200' },
      PER: { gradient: 'from-orange-500 to-red-400', bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50', border: 'border-orange-200' },
    };
    return colorSchemes[code] || { gradient: 'from-gray-500 to-slate-400', bg: 'bg-gray-500', text: 'text-gray-600', light: 'bg-gray-50', border: 'border-gray-200' };
  };

  const getBalanceStatus = (balance: number, entitled: number) => {
    const safeBalance = Number(balance) || 0;
    const safeEntitled = Number(entitled) || 0;

    if (safeEntitled === 0) return { color: 'text-gray-400', bg: 'bg-gray-100', ring: 'ring-gray-200', status: 'N/A', icon: null };
    const percentage = (safeBalance / safeEntitled) * 100;
    if (percentage <= 0) return { color: 'text-red-600', bg: 'bg-red-100', ring: 'ring-red-200', status: 'Exhausted', icon: HiExclamationCircle };
    if (percentage <= 25) return { color: 'text-orange-600', bg: 'bg-orange-100', ring: 'ring-orange-200', status: 'Low', icon: HiTrendingDown };
    if (percentage <= 50) return { color: 'text-amber-600', bg: 'bg-amber-100', ring: 'ring-amber-200', status: 'Moderate', icon: HiClock };
    return { color: 'text-emerald-600', bg: 'bg-emerald-100', ring: 'ring-emerald-200', status: 'Good', icon: HiCheckCircle };
  };

  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-rose-500 to-pink-500',
      'from-amber-500 to-orange-500',
      'from-indigo-500 to-blue-500',
      'from-fuchsia-500 to-pink-500',
      'from-teal-500 to-cyan-500',
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  if (isLoading && balances.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-gradient-to-r from-secondary-200 to-secondary-100 rounded-lg w-1/3" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-gradient-to-br from-secondary-100 to-secondary-200 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-gradient-to-br from-secondary-100 to-secondary-200 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HiSparkles className="w-6 h-6 text-yellow-300" />
              <span className="text-sm font-medium text-white/80">Leave Management</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">Leave Balances</h1>
            <p className="text-white/70">Track and manage employee leave entitlements for {selectedYear}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setIsInitializeModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl font-medium transition-all"
            >
              <HiPlus className="w-5 h-5" />
              Add Employee
            </button>
            <button
              onClick={() => handleBulkInitialize(false)}
              disabled={isInitializing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-purple-600 rounded-xl font-medium hover:bg-white/90 transition-all shadow-lg disabled:opacity-50"
            >
              <HiUserGroup className="w-5 h-5" />
              {isInitializing ? 'Initializing...' : 'Initialize All'}
            </button>
            <button
              onClick={() => {
                if (window.confirm('This will delete orphaned balances and reinitialize for all active employees. Continue?')) {
                  handleBulkInitialize(true);
                }
              }}
              disabled={isInitializing}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-all shadow-lg disabled:opacity-50"
            >
              <HiRefresh className="w-5 h-5" />
              Fix & Reinitialize
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl text-white shadow-lg shadow-blue-500/25">
                <HiUserGroup className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Total Employees</span>
            </div>
            <p className="text-3xl font-bold text-secondary-900">{stats.totalEmployees}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white shadow-lg shadow-emerald-500/25">
                <HiCalendar className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Days Available</span>
            </div>
            <p className="text-3xl font-bold text-secondary-900">{stats.totalBalance}</p>
            <p className="text-xs text-secondary-400 mt-1">of {stats.totalEntitled} entitled</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl text-white shadow-lg shadow-violet-500/25">
                <HiTrendingUp className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Utilization Rate</span>
            </div>
            <p className="text-3xl font-bold text-secondary-900">{stats.utilizationRate}%</p>
            <p className="text-xs text-secondary-400 mt-1">{stats.totalUsed} days used</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-rose-500/10 to-pink-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl text-white shadow-lg shadow-rose-500/25">
                <HiExclamationCircle className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Low Balance</span>
            </div>
            <p className="text-3xl font-bold text-secondary-900">{stats.lowBalanceCount}</p>
            <p className="text-xs text-secondary-400 mt-1">employees need attention</p>
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
              placeholder="Search employees by name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white transition-all"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="px-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer font-medium"
            >
              {years.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              value={selectedLeaveType}
              onChange={(e) => setSelectedLeaveType(e.target.value)}
              className="px-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="">All Leave Types</option>
              {leaveTypes.map((type) => (
                <option key={type._id} value={type._id}>{type.name}</option>
              ))}
            </select>
            <div className="flex bg-secondary-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === 'cards' ? 'bg-white shadow-sm text-purple-600' : 'text-secondary-500 hover:text-secondary-700'
                }`}
                title="Card View"
              >
                <HiViewGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white shadow-sm text-purple-600' : 'text-secondary-500 hover:text-secondary-700'
                }`}
                title="Table View"
              >
                <HiViewList className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={fetchBalances}
              className="p-3 text-secondary-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
              title="Refresh"
            >
              <HiRefresh className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {employeeBalances.length === 0 ? (
        <div className="bg-gradient-to-br from-secondary-50 to-white rounded-2xl border border-secondary-200 p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <HiUserGroup className="w-10 h-10 text-purple-500" />
          </div>
          <h3 className="text-xl font-bold text-secondary-900 mb-2">No Leave Balances Found</h3>
          <p className="text-secondary-500 mb-8 max-w-md mx-auto">
            Get started by initializing leave balances for all employees based on your configured leave types.
          </p>
          <button
            onClick={() => handleBulkInitialize(true)}
            disabled={isInitializing}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-purple-500/25"
          >
            <HiSparkles className="w-5 h-5" />
            Initialize All Employees
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {employeeBalances.map((eb) => {
            const isExpanded = expandedEmployees.has(eb.employee._id);
            return (
              <div
                key={eb.employee._id}
                className={`bg-white rounded-2xl shadow-sm border border-secondary-100 overflow-hidden transition-all hover:shadow-lg ${
                  isExpanded ? 'ring-2 ring-purple-500 ring-offset-2' : ''
                }`}
              >
                {/* Employee Header */}
                <div
                  className="p-5 cursor-pointer"
                  onClick={() => toggleEmployeeExpand(eb.employee._id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 bg-gradient-to-br ${getAvatarGradient(eb.employee.firstName)} rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                        {eb.employee.firstName.charAt(0)}{eb.employee.lastName.charAt(0) || ''}
                      </div>
                      <div>
                        <h3 className="font-bold text-secondary-900 text-lg">
                          {eb.employee.firstName} {eb.employee.lastName}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-sm text-secondary-500">{eb.employee.employeeCode}</span>
                          {eb.employee.department && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-secondary-100 text-secondary-600">
                              {eb.employee.department.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <span className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                          {eb.totalBalance}
                        </span>
                        <span className="text-secondary-400 text-sm">days</span>
                      </div>
                      <p className="text-xs text-secondary-400">available</p>
                    </div>
                  </div>

                  {/* Leave Type Pills */}
                  <div className="flex flex-wrap gap-2">
                    {eb.balances.map((balance) => {
                      const colors = getLeaveTypeColors(balance.leaveTypeId?.code || '');
                      const status = getBalanceStatus(Number(balance.balance) || 0, Number(balance.entitled) || 0);
                      const safeBalance = Number(balance.balance) || 0;
                      const safeEntitled = Number(balance.entitled) || 0;

                      return (
                        <div
                          key={balance._id}
                          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${colors.light} ${colors.border}`}
                        >
                          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${colors.gradient}`} />
                          <span className={`text-xs font-bold ${colors.text}`}>
                            {balance.leaveTypeId?.code || 'N/A'}
                          </span>
                          <span className={`text-sm font-bold ${status.color}`}>
                            {safeBalance}
                          </span>
                          <span className="text-secondary-400 text-xs">/{safeEntitled}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expand Indicator */}
                  <div className="flex items-center justify-center mt-4 pt-3 border-t border-secondary-100">
                    <span className="text-xs text-secondary-400 mr-2">
                      {isExpanded ? 'Click to collapse' : 'Click to expand details'}
                    </span>
                    {isExpanded ? (
                      <HiChevronUp className="w-4 h-4 text-secondary-400" />
                    ) : (
                      <HiChevronDown className="w-4 h-4 text-secondary-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-secondary-100 p-5 bg-gradient-to-b from-secondary-50 to-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {eb.balances.map((balance) => {
                        const colors = getLeaveTypeColors(balance.leaveTypeId?.code || '');
                        const status = getBalanceStatus(Number(balance.balance) || 0, Number(balance.entitled) || 0);
                        const safeEntitled = Number(balance.entitled) || 0;
                        const safeUsed = Number(balance.used) || 0;
                        const safePending = Number(balance.pending) || 0;
                        const safeBalance = Number(balance.balance) || 0;
                        const usedPercentage = safeEntitled > 0 ? Math.min((safeUsed / safeEntitled) * 100, 100) : 0;
                        const pendingPercentage = safeEntitled > 0 ? Math.min((safePending / safeEntitled) * 100, 100 - usedPercentage) : 0;

                        return (
                          <div
                            key={balance._id}
                            className="bg-white rounded-xl border border-secondary-200 p-4 hover:shadow-md transition-all"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg`}>
                                  {balance.leaveTypeId?.code?.charAt(0) || '?'}
                                </div>
                                <div>
                                  <p className="font-semibold text-secondary-900">{balance.leaveTypeId?.name || 'Unknown'}</p>
                                  <p className={`text-xs font-medium ${status.color}`}>{status.status}</p>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAdjustModal(balance);
                                }}
                                className="p-2 text-secondary-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all"
                                title="Adjust Balance"
                              >
                                <HiAdjustments className="w-5 h-5" />
                              </button>
                            </div>

                            {/* Progress Bar */}
                            <div className="h-2.5 bg-secondary-100 rounded-full overflow-hidden mb-3">
                              <div className="h-full flex">
                                <div
                                  className="bg-gradient-to-r from-emerald-400 to-teal-500 transition-all"
                                  style={{ width: `${usedPercentage}%` }}
                                />
                                <div
                                  className="bg-gradient-to-r from-amber-300 to-orange-400 transition-all"
                                  style={{ width: `${pendingPercentage}%` }}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-4 gap-2 text-center">
                              <div className="p-2 bg-secondary-50 rounded-lg">
                                <p className="text-lg font-bold text-secondary-900">{safeEntitled}</p>
                                <p className="text-xs text-secondary-500">Entitled</p>
                              </div>
                              <div className="p-2 bg-emerald-50 rounded-lg">
                                <p className="text-lg font-bold text-emerald-600">{safeUsed}</p>
                                <p className="text-xs text-secondary-500">Used</p>
                              </div>
                              <div className="p-2 bg-amber-50 rounded-lg">
                                <p className="text-lg font-bold text-amber-600">{safePending}</p>
                                <p className="text-xs text-secondary-500">Pending</p>
                              </div>
                              <div className={`p-2 ${status.bg} rounded-lg`}>
                                <p className={`text-lg font-bold ${status.color}`}>{safeBalance}</p>
                                <p className="text-xs text-secondary-500">Balance</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-secondary-50 to-secondary-100">
                  <th className="text-left px-6 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">
                    Employee
                  </th>
                  {leaveTypes.map((lt) => {
                    const colors = getLeaveTypeColors(lt.code);
                    return (
                      <th key={lt._id} className="text-center px-4 py-4">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-8 h-8 bg-gradient-to-br ${colors.gradient} rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                            {lt.code.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-secondary-600">{lt.code}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="text-center px-6 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {employeeBalances.map((eb, index) => (
                  <tr key={eb.employee._id} className={`hover:bg-secondary-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/50'}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarGradient(eb.employee.firstName)} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                          {eb.employee.firstName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-secondary-900">
                            {eb.employee.firstName} {eb.employee.lastName}
                          </p>
                          <p className="text-xs text-secondary-500">{eb.employee.employeeCode}</p>
                        </div>
                      </div>
                    </td>
                    {leaveTypes.map((lt) => {
                      const balance = eb.balances.find(b => b.leaveTypeId?._id === lt._id);
                      const safeBalance = Number(balance?.balance) || 0;
                      const safeEntitled = Number(balance?.entitled) || 0;
                      const status = balance ? getBalanceStatus(safeBalance, safeEntitled) : null;

                      return (
                        <td key={lt._id} className="px-4 py-4 text-center">
                          {balance ? (
                            <button
                              onClick={() => openAdjustModal(balance)}
                              className={`inline-flex items-center justify-center min-w-[3rem] px-3 py-2 rounded-xl text-sm font-bold transition-all ${status?.bg} ${status?.color} hover:ring-2 hover:ring-offset-1 hover:ring-purple-300 hover:scale-105`}
                            >
                              {safeBalance}
                            </button>
                          ) : (
                            <span className="text-secondary-300 text-sm">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold text-sm shadow-lg shadow-purple-500/25">
                        {eb.totalBalance}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Adjust Balance Modal */}
      {isAdjustModalOpen && adjustingBalance && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-purple-600 via-violet-600 to-indigo-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <HiAdjustments className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Adjust Leave Balance</h2>
                  <p className="text-white/70 text-sm">Modify employee entitlement</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-2xl">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 bg-gradient-to-br ${getAvatarGradient(adjustingBalance.employee?.firstName || 'U')} rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                    {adjustingBalance.employee?.firstName?.charAt(0) || '?'}
                  </div>
                  <div>
                    <p className="font-bold text-secondary-900 text-lg">
                      {adjustingBalance.employee?.firstName} {adjustingBalance.employee?.lastName}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getLeaveTypeColors(adjustingBalance.leaveTypeId?.code || '').gradient}`} />
                      <p className="text-sm text-secondary-500">
                        {adjustingBalance.leaveTypeId?.name}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                  <span className="text-secondary-600 font-medium">Current Balance</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                    {Number(adjustingBalance.balance) || 0} days
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-secondary-700 mb-3">
                    Adjustment Amount
                  </label>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setAdjustmentValue((prev) => prev - 1)}
                      className="p-4 bg-gradient-to-br from-rose-500 to-pink-500 text-white rounded-2xl hover:from-rose-600 hover:to-pink-600 transition-all shadow-lg shadow-rose-500/25"
                    >
                      <HiMinus className="w-5 h-5" />
                    </button>
                    <input
                      type="number"
                      value={adjustmentValue}
                      onChange={(e) => setAdjustmentValue(Number(e.target.value))}
                      className="flex-1 px-4 py-4 text-center text-3xl font-bold bg-secondary-50 border-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <button
                      onClick={() => setAdjustmentValue((prev) => prev + 1)}
                      className="p-4 bg-gradient-to-br from-emerald-500 to-teal-500 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg shadow-emerald-500/25"
                    >
                      <HiPlus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="mt-3 text-center">
                    <span className="text-secondary-500">New balance: </span>
                    <span className="font-bold text-lg bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                      {(Number(adjustingBalance.balance) || 0) + adjustmentValue} days
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-secondary-700 mb-2">
                    Reason (Optional)
                  </label>
                  <textarea
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Enter reason for adjustment..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setIsAdjustModalOpen(false);
                    setAdjustingBalance(null);
                  }}
                  className="flex-1 px-4 py-3.5 text-secondary-700 bg-secondary-100 rounded-xl hover:bg-secondary-200 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdjustBalance}
                  disabled={adjustmentValue === 0}
                  className="flex-1 px-4 py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all font-semibold shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply Adjustment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Initialize Employee Modal */}
      {isInitializeModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all">
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <HiPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Initialize Employee Balance</h2>
                  <p className="text-white/70 text-sm">Set up leave entitlements</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-6 p-4 bg-gradient-to-br from-secondary-50 to-secondary-100 rounded-2xl">
                <div className="flex items-center gap-3 text-secondary-600">
                  <HiCalendar className="w-5 h-5" />
                  <p>
                    Creating balances for year <span className="font-bold text-secondary-900">{selectedYear}</span>
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold text-secondary-700 mb-2">
                  Select Employee
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="w-full px-4 py-3.5 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer font-medium"
                >
                  <option value="">Choose an employee...</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setIsInitializeModalOpen(false);
                    setSelectedEmployee('');
                  }}
                  className="flex-1 px-4 py-3.5 text-secondary-700 bg-secondary-100 rounded-xl hover:bg-secondary-200 transition-all font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInitializeEmployee}
                  disabled={!selectedEmployee}
                  className="flex-1 px-4 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all font-semibold shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Initialize
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveBalances;
