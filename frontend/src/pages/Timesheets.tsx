import React, { useState, useEffect, useCallback } from 'react';
import {
  HiClock,
  HiPlay,
  HiStop,
  HiCheck,
  HiX,
  HiRefresh,
  HiSearch,
  HiFilter,
  HiChevronLeft,
  HiChevronRight,
  HiDocumentText,
  HiUserGroup,
  HiTrendingUp,
  HiLightningBolt,
  HiCalendar,
  HiClipboardCheck,
  HiPaperAirplane,
  HiEye,
  HiPencil,
  HiChevronDown,
  HiChevronUp,
  HiExclamationCircle,
  HiBriefcase,
  HiViewGrid,
  HiViewList,
} from 'react-icons/hi';
import api from '../services/api';
import { useAppSelector } from '../hooks/useAppDispatch';

interface TimesheetEntry {
  projectCode: string;
  projectName: string;
  description: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
  totalHours: number;
}

interface Timesheet {
  _id: string;
  employeeId: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    email?: string;
  };
  weekStartDate: string;
  weekEndDate: string;
  weekNumber: number;
  month: number;
  year: number;
  entries: TimesheetEntry[];
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  comments?: string;
}

interface Project {
  _id: string;
  name: string;
  code: string;
  client: string;
  color: string;
  budgetHours: number;
  isActive: boolean;
}

const Timesheets: React.FC = () => {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(3); // Current week in December
  const [selectedYear, setSelectedYear] = useState(2025);
  const [selectedMonth, setSelectedMonth] = useState(12);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTimesheets, setExpandedTimesheets] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedTimesheet, setSelectedTimesheet] = useState<Timesheet | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerProject, setTimerProject] = useState<string>('');

  const { user } = useAppSelector((state) => state.auth);
  const isAdmin = user?.role === 'admin' || user?.role === 'tenant_admin' || user?.role === 'hr' || user?.role === 'hr_manager';

  // Check if user has permission to view all timesheets
  const canViewAllTimesheets = user?.permissions?.includes('*') ||
    user?.permissions?.includes('attendance:write') ||
    user?.permissions?.includes('employees:read') ||
    isAdmin;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  useEffect(() => {
    fetchTimesheets();
    fetchProjects();
  }, [selectedWeek, selectedMonth, selectedYear, statusFilter]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const fetchTimesheets = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        weekNumber: selectedWeek.toString(),
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });
      if (statusFilter !== 'all') {
        params.append('status', statusFilter);
      }
      // If user is not admin/hr, only fetch their own timesheets
      if (!canViewAllTimesheets && user?._id) {
        params.append('employeeId', user._id);
      }
      const response = await api.get(`/timesheets?${params}`);
      let fetchedTimesheets = response.data.data?.timesheets || response.data.timesheets || [];

      // Extra safety: filter on frontend as well for non-admin users
      if (!canViewAllTimesheets && user?._id) {
        fetchedTimesheets = fetchedTimesheets.filter((ts: Timesheet) =>
          ts.employeeId === user._id || ts.employee?._id === user._id
        );
      }

      setTimesheets(fetchedTimesheets);
    } catch (error) {
      console.error('Failed to fetch timesheets:', error);
      // Use mock data for demo
      generateMockTimesheets();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await api.get('/timesheets/projects');
      setProjects(response.data.data?.projects || response.data.projects || []);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
      // Mock projects
      setProjects([
        { _id: '1', name: 'Project Alpha', code: 'ALPHA', client: 'Acme Corp', color: '#3B82F6', budgetHours: 500, isActive: true },
        { _id: '2', name: 'Project Beta', code: 'BETA', client: 'Tech Solutions', color: '#10B981', budgetHours: 300, isActive: true },
        { _id: '3', name: 'Project Gamma', code: 'GAMMA', client: 'Global Inc', color: '#8B5CF6', budgetHours: 400, isActive: true },
        { _id: '4', name: 'Internal Development', code: 'INTERNAL', client: 'Internal', color: '#F59E0B', budgetHours: 200, isActive: true },
        { _id: '5', name: 'Client Support', code: 'SUPPORT', client: 'Various', color: '#EF4444', budgetHours: 150, isActive: true },
      ]);
    }
  };

  const generateMockTimesheets = () => {
    const mockTimesheets: Timesheet[] = [];

    // For employees (non-admin), only generate their own timesheet
    if (!canViewAllTimesheets && user) {
      const projectEntries = [
        { projectCode: 'ALPHA', projectName: 'Project Alpha', description: 'Development tasks' },
        { projectCode: 'BETA', projectName: 'Project Beta', description: 'Testing and QA' },
      ];

      const entries: TimesheetEntry[] = projectEntries.map(p => ({
        ...p,
        monday: Math.floor(Math.random() * 2) + 7,
        tuesday: Math.floor(Math.random() * 2) + 7,
        wednesday: Math.floor(Math.random() * 2) + 7,
        thursday: Math.floor(Math.random() * 2) + 7,
        friday: Math.floor(Math.random() * 2) + 7,
        saturday: 0,
        sunday: 0,
        totalHours: 0,
      }));

      entries.forEach(e => {
        e.totalHours = e.monday + e.tuesday + e.wednesday + e.thursday + e.friday + e.saturday + e.sunday;
      });

      const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);

      mockTimesheets.push({
        _id: `ts-${user._id}`,
        employeeId: user._id,
        employee: {
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          employeeCode: 'EMP00001',
          email: user.email,
        },
        weekStartDate: '2025-12-15',
        weekEndDate: '2025-12-21',
        weekNumber: selectedWeek,
        month: 12,
        year: 2025,
        entries,
        totalHours,
        regularHours: Math.min(totalHours, 40),
        overtimeHours: Math.max(totalHours - 40, 0),
        status: 'draft',
      });

      setTimesheets(mockTimesheets);
      return;
    }

    // For admin/HR, generate mock data for multiple employees
    const names = [
      { firstName: 'Patricia', lastName: 'Edwards', code: 'EMP00001' },
      { firstName: 'Margaret', lastName: 'Rodriguez', code: 'EMP00002' },
      { firstName: 'Stephanie', lastName: 'Flores', code: 'EMP00003' },
      { firstName: 'Matthew', lastName: 'Campbell', code: 'EMP00004' },
      { firstName: 'Carol', lastName: 'Flores', code: 'EMP00005' },
      { firstName: 'John', lastName: 'Smith', code: 'EMP00006' },
      { firstName: 'Emily', lastName: 'Johnson', code: 'EMP00007' },
      { firstName: 'Michael', lastName: 'Brown', code: 'EMP00008' },
    ];

    const statuses: Array<'draft' | 'submitted' | 'approved' | 'rejected'> = ['draft', 'submitted', 'approved', 'approved'];
    const projectEntries = [
      { projectCode: 'ALPHA', projectName: 'Project Alpha', description: 'Development tasks' },
      { projectCode: 'BETA', projectName: 'Project Beta', description: 'Testing and QA' },
      { projectCode: 'SUPPORT', projectName: 'Client Support', description: 'Customer issues' },
    ];

    names.forEach((emp, idx) => {
      const entries: TimesheetEntry[] = projectEntries.slice(0, Math.floor(Math.random() * 2) + 2).map(p => ({
        ...p,
        monday: Math.floor(Math.random() * 4) + 4,
        tuesday: Math.floor(Math.random() * 4) + 4,
        wednesday: Math.floor(Math.random() * 4) + 4,
        thursday: Math.floor(Math.random() * 4) + 4,
        friday: Math.floor(Math.random() * 4) + 4,
        saturday: Math.random() < 0.3 ? Math.floor(Math.random() * 4) : 0,
        sunday: 0,
        totalHours: 0,
      }));

      entries.forEach(e => {
        e.totalHours = e.monday + e.tuesday + e.wednesday + e.thursday + e.friday + e.saturday + e.sunday;
      });

      const totalHours = entries.reduce((sum, e) => sum + e.totalHours, 0);

      mockTimesheets.push({
        _id: `ts-${idx}`,
        employeeId: `emp-${idx}`,
        employee: {
          _id: `emp-${idx}`,
          firstName: emp.firstName,
          lastName: emp.lastName,
          employeeCode: emp.code,
          email: `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase()}@company.com`,
        },
        weekStartDate: '2025-12-15',
        weekEndDate: '2025-12-21',
        weekNumber: selectedWeek,
        month: 12,
        year: 2025,
        entries,
        totalHours,
        regularHours: Math.min(totalHours, 40),
        overtimeHours: Math.max(totalHours - 40, 0),
        status: statuses[idx % statuses.length],
        submittedAt: statuses[idx % statuses.length] !== 'draft' ? new Date().toISOString() : undefined,
        approvedAt: statuses[idx % statuses.length] === 'approved' ? new Date().toISOString() : undefined,
      });
    });

    setTimesheets(mockTimesheets);
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/timesheets/${id}/approve`);
      fetchTimesheets();
    } catch (error) {
      console.error('Failed to approve timesheet:', error);
      // Update locally for demo
      setTimesheets(prev => prev.map(ts =>
        ts._id === id ? { ...ts, status: 'approved' as const, approvedAt: new Date().toISOString() } : ts
      ));
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.patch(`/timesheets/${id}/reject`);
      fetchTimesheets();
    } catch (error) {
      console.error('Failed to reject timesheet:', error);
      setTimesheets(prev => prev.map(ts =>
        ts._id === id ? { ...ts, status: 'rejected' as const } : ts
      ));
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedTimesheets);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedTimesheets(newExpanded);
  };

  const formatTimer = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const safeNumber = (value: number | undefined | null): number => Number(value) || 0;

  const getEmployeeName = (ts: Timesheet): string => {
    if (ts.employee?.firstName && ts.employee?.lastName) {
      return `${ts.employee.firstName} ${ts.employee.lastName}`;
    }
    return 'Unknown Employee';
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; gradient: string; icon: React.ReactNode }> = {
      draft: { bg: 'bg-slate-100', text: 'text-slate-700', gradient: 'from-slate-500 to-slate-600', icon: <HiPencil className="w-4 h-4" /> },
      submitted: { bg: 'bg-amber-100', text: 'text-amber-700', gradient: 'from-amber-500 to-orange-500', icon: <HiPaperAirplane className="w-4 h-4" /> },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', gradient: 'from-emerald-500 to-teal-500', icon: <HiCheck className="w-4 h-4" /> },
      rejected: { bg: 'bg-rose-100', text: 'text-rose-700', gradient: 'from-rose-500 to-red-500', icon: <HiX className="w-4 h-4" /> },
    };
    return configs[status] || configs.draft;
  };

  const getProjectColor = (code: string): string => {
    const colors: Record<string, string> = {
      ALPHA: 'from-blue-500 to-cyan-500',
      BETA: 'from-emerald-500 to-teal-500',
      GAMMA: 'from-violet-500 to-purple-500',
      INTERNAL: 'from-amber-500 to-orange-500',
      SUPPORT: 'from-rose-500 to-pink-500',
      TRAINING: 'from-fuchsia-500 to-pink-500',
    };
    return colors[code] || 'from-gray-500 to-slate-500';
  };

  const filteredTimesheets = timesheets.filter(ts => {
    if (!searchTerm) return true;
    const name = getEmployeeName(ts).toLowerCase();
    const code = (ts.employee?.employeeCode || '').toLowerCase();
    const search = searchTerm.toLowerCase();
    return name.includes(search) || code.includes(search);
  });

  // Stats
  const stats = {
    totalEmployees: timesheets.length,
    totalHours: timesheets.reduce((sum, ts) => sum + safeNumber(ts.totalHours), 0),
    avgHours: timesheets.length > 0 ? Math.round(timesheets.reduce((sum, ts) => sum + safeNumber(ts.totalHours), 0) / timesheets.length) : 0,
    totalOvertime: timesheets.reduce((sum, ts) => sum + safeNumber(ts.overtimeHours), 0),
    pendingApproval: timesheets.filter(ts => ts.status === 'submitted').length,
    approved: timesheets.filter(ts => ts.status === 'approved').length,
  };

  const getAvatarGradient = (name: string) => {
    const gradients = [
      'from-violet-500 to-purple-600',
      'from-blue-500 to-cyan-500',
      'from-emerald-500 to-teal-500',
      'from-rose-500 to-pink-500',
      'from-amber-500 to-orange-500',
      'from-indigo-500 to-blue-500',
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

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
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HiClock className="w-6 h-6 text-pink-200" />
              <span className="text-sm font-medium text-white/80">Time Tracking</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">Employee Timesheets</h1>
            <p className="text-white/70">Week {selectedWeek} - {months[selectedMonth - 1]} {selectedYear}</p>
          </div>

          {/* Timer Widget */}
          <div className="flex items-center gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-mono font-bold">{formatTimer(timerSeconds)}</p>
                <p className="text-xs text-white/70 mt-1">{timerProject || 'Select a project'}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTimerRunning(!timerRunning)}
                  className={`p-3 rounded-xl transition-all ${
                    timerRunning
                      ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/25'
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25'
                  }`}
                >
                  {timerRunning ? <HiStop className="w-6 h-6" /> : <HiPlay className="w-6 h-6" />}
                </button>
                {timerSeconds > 0 && (
                  <button
                    onClick={() => { setTimerSeconds(0); setTimerRunning(false); }}
                    className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
                  >
                    <HiRefresh className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl text-white shadow-lg shadow-indigo-500/25">
                <HiUserGroup className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Employees</span>
            </div>
            <p className="text-3xl font-bold text-secondary-900">{stats.totalEmployees}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl text-white shadow-lg shadow-blue-500/25">
                <HiClock className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Total Hours</span>
            </div>
            <p className="text-3xl font-bold text-secondary-900">{stats.totalHours}</p>
            <p className="text-xs text-secondary-400 mt-1">Avg: {stats.avgHours} hrs/employee</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-white shadow-lg shadow-amber-500/25">
                <HiLightningBolt className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Overtime</span>
            </div>
            <p className="text-3xl font-bold text-amber-600">{stats.totalOvertime}</p>
            <p className="text-xs text-secondary-400 mt-1">hours this week</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl text-white shadow-lg shadow-emerald-500/25">
                <HiClipboardCheck className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Pending Approval</span>
            </div>
            <p className="text-3xl font-bold text-secondary-900">{stats.pendingApproval}</p>
            <p className="text-xs text-secondary-400 mt-1">{stats.approved} approved</p>
          </div>
        </div>
      </div>

      {/* Week Navigation & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Week Navigation */}
          <div className="flex items-center gap-2 bg-secondary-50 rounded-xl p-1">
            <button
              onClick={() => setSelectedWeek(prev => Math.max(1, prev - 1))}
              className="p-2.5 hover:bg-white rounded-lg transition-all"
            >
              <HiChevronLeft className="w-5 h-5 text-secondary-600" />
            </button>
            <div className="px-4 py-2 min-w-[140px] text-center">
              <p className="font-semibold text-secondary-900">Week {selectedWeek}</p>
              <p className="text-xs text-secondary-500">{months[selectedMonth - 1]} {selectedYear}</p>
            </div>
            <button
              onClick={() => setSelectedWeek(prev => Math.min(4, prev + 1))}
              className="p-2.5 hover:bg-white rounded-lg transition-all"
            >
              <HiChevronRight className="w-5 h-5 text-secondary-600" />
            </button>
          </div>

          {/* Search */}
          <div className="flex-1 relative">
            <HiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by employee name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-secondary-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <div className="flex bg-secondary-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === 'cards' ? 'bg-white shadow-sm text-indigo-600' : 'text-secondary-500 hover:text-secondary-700'
                }`}
              >
                <HiViewGrid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2.5 rounded-lg transition-all ${
                  viewMode === 'table' ? 'bg-white shadow-sm text-indigo-600' : 'text-secondary-500 hover:text-secondary-700'
                }`}
              >
                <HiViewList className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={fetchTimesheets}
              className="p-3 text-secondary-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
            >
              <HiRefresh className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Status Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'all', label: 'All', count: filteredTimesheets.length },
          { key: 'draft', label: 'Draft', count: filteredTimesheets.filter(t => t.status === 'draft').length },
          { key: 'submitted', label: 'Submitted', count: filteredTimesheets.filter(t => t.status === 'submitted').length },
          { key: 'approved', label: 'Approved', count: filteredTimesheets.filter(t => t.status === 'approved').length },
          { key: 'rejected', label: 'Rejected', count: filteredTimesheets.filter(t => t.status === 'rejected').length },
        ].map(item => {
          const config = item.key === 'all' ? null : getStatusConfig(item.key);
          return (
            <button
              key={item.key}
              onClick={() => setStatusFilter(item.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl transition-all ${
                statusFilter === item.key
                  ? item.key === 'all'
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25'
                    : `bg-gradient-to-r ${config?.gradient} text-white shadow-lg`
                  : item.key === 'all'
                    ? 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50'
                    : `${config?.bg} ${config?.text} hover:opacity-80`
              }`}
            >
              {config?.icon}
              {item.label}: {item.count}
            </button>
          );
        })}
      </div>

      {/* Timesheets */}
      {filteredTimesheets.length === 0 ? (
        <div className="bg-gradient-to-br from-secondary-50 to-white rounded-2xl border border-secondary-200 p-12 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <HiClock className="w-10 h-10 text-indigo-500" />
          </div>
          <h3 className="text-xl font-bold text-secondary-900 mb-2">No Timesheets Found</h3>
          <p className="text-secondary-500 mb-4">No timesheet records for this week</p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTimesheets.map((ts) => {
            const isExpanded = expandedTimesheets.has(ts._id);
            const statusConfig = getStatusConfig(ts.status);

            return (
              <div
                key={ts._id}
                className={`bg-white rounded-2xl shadow-sm border border-secondary-100 overflow-hidden transition-all hover:shadow-lg ${
                  isExpanded ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
                }`}
              >
                {/* Header */}
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-14 h-14 bg-gradient-to-br ${getAvatarGradient(getEmployeeName(ts))} rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
                        {getEmployeeName(ts).charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-secondary-900 text-lg">{getEmployeeName(ts)}</h3>
                        <p className="text-sm text-secondary-500">{ts.employee?.employeeCode || 'N/A'}</p>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${statusConfig.bg} ${statusConfig.text}`}>
                      {statusConfig.icon}
                      {ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
                    </span>
                  </div>

                  {/* Hours Summary */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                      <p className="text-2xl font-bold text-blue-600">{safeNumber(ts.totalHours)}</p>
                      <p className="text-xs text-secondary-500">Total Hours</p>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                      <p className="text-2xl font-bold text-emerald-600">{safeNumber(ts.regularHours)}</p>
                      <p className="text-xs text-secondary-500">Regular</p>
                    </div>
                    <div className="text-center p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl">
                      <p className="text-2xl font-bold text-amber-600">{safeNumber(ts.overtimeHours)}</p>
                      <p className="text-xs text-secondary-500">Overtime</p>
                    </div>
                  </div>

                  {/* Project Pills */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(ts.entries || []).slice(0, 3).map((entry, idx) => (
                      <div
                        key={idx}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r ${getProjectColor(entry.projectCode)} text-white text-xs font-medium shadow-sm`}
                      >
                        <HiBriefcase className="w-3 h-3" />
                        {entry.projectCode}: {safeNumber(entry.totalHours)}h
                      </div>
                    ))}
                    {(ts.entries || []).length > 3 && (
                      <span className="text-xs text-secondary-500 px-2 py-1">
                        +{ts.entries.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Expand/Actions */}
                  <div className="flex items-center justify-between pt-3 border-t border-secondary-100">
                    <button
                      onClick={() => toggleExpand(ts._id)}
                      className="inline-flex items-center gap-2 text-sm text-secondary-500 hover:text-indigo-600 transition-colors"
                    >
                      {isExpanded ? <HiChevronUp className="w-4 h-4" /> : <HiChevronDown className="w-4 h-4" />}
                      {isExpanded ? 'Hide Details' : 'View Details'}
                    </button>
                    <div className="flex items-center gap-2">
                      {isAdmin && ts.status === 'submitted' && (
                        <>
                          <button
                            onClick={() => handleApprove(ts._id)}
                            className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                            title="Approve"
                          >
                            <HiCheck className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleReject(ts._id)}
                            className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors"
                            title="Reject"
                          >
                            <HiX className="w-5 h-5" />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => { setSelectedTimesheet(ts); setIsDetailModalOpen(true); }}
                        className="p-2 text-secondary-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="View Full Details"
                      >
                        <HiEye className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-secondary-100 p-5 bg-gradient-to-b from-secondary-50 to-white">
                    <h4 className="font-semibold text-secondary-900 mb-3">Weekly Breakdown</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-secondary-100">
                            <th className="text-left px-3 py-2 rounded-l-lg">Project</th>
                            {weekDays.map(day => (
                              <th key={day} className="text-center px-2 py-2">{day}</th>
                            ))}
                            <th className="text-center px-3 py-2 rounded-r-lg">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(ts.entries || []).map((entry, idx) => (
                            <tr key={idx} className="border-b border-secondary-100">
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${getProjectColor(entry.projectCode)}`} />
                                  <span className="font-medium">{entry.projectName}</span>
                                </div>
                              </td>
                              <td className="text-center px-2 py-2">{safeNumber(entry.monday)}</td>
                              <td className="text-center px-2 py-2">{safeNumber(entry.tuesday)}</td>
                              <td className="text-center px-2 py-2">{safeNumber(entry.wednesday)}</td>
                              <td className="text-center px-2 py-2">{safeNumber(entry.thursday)}</td>
                              <td className="text-center px-2 py-2">{safeNumber(entry.friday)}</td>
                              <td className="text-center px-2 py-2 text-secondary-400">{safeNumber(entry.saturday)}</td>
                              <td className="text-center px-2 py-2 text-secondary-400">{safeNumber(entry.sunday)}</td>
                              <td className="text-center px-3 py-2 font-bold text-indigo-600">{safeNumber(entry.totalHours)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
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
                  <th className="text-left px-6 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">Employee</th>
                  <th className="text-center px-4 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">Mon</th>
                  <th className="text-center px-4 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">Tue</th>
                  <th className="text-center px-4 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">Wed</th>
                  <th className="text-center px-4 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">Thu</th>
                  <th className="text-center px-4 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">Fri</th>
                  <th className="text-center px-4 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">Sat</th>
                  <th className="text-center px-4 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">Sun</th>
                  <th className="text-center px-4 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">Total</th>
                  <th className="text-center px-4 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">Status</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-secondary-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-secondary-100">
                {filteredTimesheets.map((ts, index) => {
                  const statusConfig = getStatusConfig(ts.status);
                  const dailyTotals = {
                    monday: (ts.entries || []).reduce((sum, e) => sum + safeNumber(e.monday), 0),
                    tuesday: (ts.entries || []).reduce((sum, e) => sum + safeNumber(e.tuesday), 0),
                    wednesday: (ts.entries || []).reduce((sum, e) => sum + safeNumber(e.wednesday), 0),
                    thursday: (ts.entries || []).reduce((sum, e) => sum + safeNumber(e.thursday), 0),
                    friday: (ts.entries || []).reduce((sum, e) => sum + safeNumber(e.friday), 0),
                    saturday: (ts.entries || []).reduce((sum, e) => sum + safeNumber(e.saturday), 0),
                    sunday: (ts.entries || []).reduce((sum, e) => sum + safeNumber(e.sunday), 0),
                  };

                  return (
                    <tr key={ts._id} className={`hover:bg-secondary-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/30'}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 bg-gradient-to-br ${getAvatarGradient(getEmployeeName(ts))} rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                            {getEmployeeName(ts).charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-secondary-900">{getEmployeeName(ts)}</p>
                            <p className="text-xs text-secondary-500">{ts.employee?.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-center px-4 py-4 font-medium">{dailyTotals.monday}</td>
                      <td className="text-center px-4 py-4 font-medium">{dailyTotals.tuesday}</td>
                      <td className="text-center px-4 py-4 font-medium">{dailyTotals.wednesday}</td>
                      <td className="text-center px-4 py-4 font-medium">{dailyTotals.thursday}</td>
                      <td className="text-center px-4 py-4 font-medium">{dailyTotals.friday}</td>
                      <td className="text-center px-4 py-4 text-secondary-400">{dailyTotals.saturday}</td>
                      <td className="text-center px-4 py-4 text-secondary-400">{dailyTotals.sunday}</td>
                      <td className="text-center px-4 py-4">
                        <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-500/25">
                          {safeNumber(ts.totalHours)}h
                        </span>
                      </td>
                      <td className="text-center px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.icon}
                          {ts.status.charAt(0).toUpperCase() + ts.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {isAdmin && ts.status === 'submitted' && (
                            <>
                              <button
                                onClick={() => handleApprove(ts._id)}
                                className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-colors"
                                title="Approve"
                              >
                                <HiCheck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleReject(ts._id)}
                                className="p-2 bg-rose-100 text-rose-600 rounded-lg hover:bg-rose-200 transition-colors"
                                title="Reject"
                              >
                                <HiX className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => { setSelectedTimesheet(ts); setIsDetailModalOpen(true); }}
                            className="p-2 text-secondary-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          >
                            <HiEye className="w-4 h-4" />
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

      {/* Detail Modal */}
      {isDetailModalOpen && selectedTimesheet && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold text-lg`}>
                  {getEmployeeName(selectedTimesheet).charAt(0)}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{getEmployeeName(selectedTimesheet)}</h2>
                  <p className="text-white/70 text-sm">Week {selectedTimesheet.weekNumber} Timesheet</p>
                </div>
              </div>
              <button
                onClick={() => { setIsDetailModalOpen(false); setSelectedTimesheet(null); }}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all text-white"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                  <p className="text-3xl font-bold text-blue-600">{safeNumber(selectedTimesheet.totalHours)}</p>
                  <p className="text-sm text-secondary-600">Total Hours</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                  <p className="text-3xl font-bold text-emerald-600">{safeNumber(selectedTimesheet.regularHours)}</p>
                  <p className="text-sm text-secondary-600">Regular Hours</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                  <p className="text-3xl font-bold text-amber-600">{safeNumber(selectedTimesheet.overtimeHours)}</p>
                  <p className="text-sm text-secondary-600">Overtime</p>
                </div>
                <div className="text-center p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                  <p className="text-3xl font-bold text-violet-600">{(selectedTimesheet.entries || []).length}</p>
                  <p className="text-sm text-secondary-600">Projects</p>
                </div>
              </div>

              {/* Detailed Table */}
              <div className="overflow-x-auto rounded-xl border border-secondary-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-secondary-100 to-secondary-50">
                      <th className="text-left px-4 py-3 text-xs font-bold text-secondary-600 uppercase">Project</th>
                      <th className="text-center px-3 py-3 text-xs font-bold text-secondary-600 uppercase">Mon</th>
                      <th className="text-center px-3 py-3 text-xs font-bold text-secondary-600 uppercase">Tue</th>
                      <th className="text-center px-3 py-3 text-xs font-bold text-secondary-600 uppercase">Wed</th>
                      <th className="text-center px-3 py-3 text-xs font-bold text-secondary-600 uppercase">Thu</th>
                      <th className="text-center px-3 py-3 text-xs font-bold text-secondary-600 uppercase">Fri</th>
                      <th className="text-center px-3 py-3 text-xs font-bold text-secondary-600 uppercase">Sat</th>
                      <th className="text-center px-3 py-3 text-xs font-bold text-secondary-600 uppercase">Sun</th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-secondary-600 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedTimesheet.entries || []).map((entry, idx) => (
                      <tr key={idx} className="border-t border-secondary-100 hover:bg-secondary-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 bg-gradient-to-r ${getProjectColor(entry.projectCode)} rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-sm`}>
                              {entry.projectCode.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900">{entry.projectName}</p>
                              <p className="text-xs text-secondary-500">{entry.description}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-center px-3 py-3 font-medium">{safeNumber(entry.monday)}</td>
                        <td className="text-center px-3 py-3 font-medium">{safeNumber(entry.tuesday)}</td>
                        <td className="text-center px-3 py-3 font-medium">{safeNumber(entry.wednesday)}</td>
                        <td className="text-center px-3 py-3 font-medium">{safeNumber(entry.thursday)}</td>
                        <td className="text-center px-3 py-3 font-medium">{safeNumber(entry.friday)}</td>
                        <td className="text-center px-3 py-3 text-secondary-400">{safeNumber(entry.saturday)}</td>
                        <td className="text-center px-3 py-3 text-secondary-400">{safeNumber(entry.sunday)}</td>
                        <td className="text-center px-4 py-3">
                          <span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-sm">
                            {safeNumber(entry.totalHours)}h
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-t-2 border-indigo-200">
                      <td className="px-4 py-3 font-bold text-secondary-900">Daily Total</td>
                      <td className="text-center px-3 py-3 font-bold">
                        {(selectedTimesheet.entries || []).reduce((sum, e) => sum + safeNumber(e.monday), 0)}
                      </td>
                      <td className="text-center px-3 py-3 font-bold">
                        {(selectedTimesheet.entries || []).reduce((sum, e) => sum + safeNumber(e.tuesday), 0)}
                      </td>
                      <td className="text-center px-3 py-3 font-bold">
                        {(selectedTimesheet.entries || []).reduce((sum, e) => sum + safeNumber(e.wednesday), 0)}
                      </td>
                      <td className="text-center px-3 py-3 font-bold">
                        {(selectedTimesheet.entries || []).reduce((sum, e) => sum + safeNumber(e.thursday), 0)}
                      </td>
                      <td className="text-center px-3 py-3 font-bold">
                        {(selectedTimesheet.entries || []).reduce((sum, e) => sum + safeNumber(e.friday), 0)}
                      </td>
                      <td className="text-center px-3 py-3 font-bold text-secondary-500">
                        {(selectedTimesheet.entries || []).reduce((sum, e) => sum + safeNumber(e.saturday), 0)}
                      </td>
                      <td className="text-center px-3 py-3 font-bold text-secondary-500">
                        {(selectedTimesheet.entries || []).reduce((sum, e) => sum + safeNumber(e.sunday), 0)}
                      </td>
                      <td className="text-center px-4 py-3">
                        <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-bold shadow-lg shadow-indigo-500/25">
                          {safeNumber(selectedTimesheet.totalHours)}h
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex justify-end gap-3">
              <button
                onClick={() => { setIsDetailModalOpen(false); setSelectedTimesheet(null); }}
                className="px-4 py-2.5 text-secondary-700 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all font-medium"
              >
                Close
              </button>
              {isAdmin && selectedTimesheet.status === 'submitted' && (
                <>
                  <button
                    onClick={() => { handleReject(selectedTimesheet._id); setIsDetailModalOpen(false); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-all font-medium"
                  >
                    <HiX className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => { handleApprove(selectedTimesheet._id); setIsDetailModalOpen(false); }}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 transition-all font-medium shadow-lg shadow-emerald-500/25"
                  >
                    <HiCheck className="w-5 h-5" />
                    Approve
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Timesheets;
