import React, { useState, useEffect } from 'react';
import {
  HiClock,
  HiCheckCircle,
  HiXCircle,
  HiCalendar,
  HiSearch,
  HiFilter,
  HiPlay,
  HiLogout,
  HiChevronLeft,
  HiChevronRight,
  HiLocationMarker,
  HiSun,
} from 'react-icons/hi';
import api from '../services/api';
import SortableTableHeader, { useSortConfig } from '../components/common/SortableTableHeader';
import { useAppSelector } from '../hooks/useAppDispatch';

// Debounce hook for auto-search
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

interface AttendanceRecord {
  _id: string;
  employeeId?: string;
  employee?: {
    _id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    departmentId?: {
      _id: string;
      name: string;
    };
  };
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave';
  workHours?: number;
  notes?: string;
}

interface Department {
  _id: string;
  name: string;
}

// Employee Attendance View Component
const EmployeeAttendanceView: React.FC<{ user: any }> = ({ user }) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Fetch today's status on mount
  useEffect(() => {
    fetchTodayStatus();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchAttendanceHistory();
  }, [selectedMonth, selectedYear, user]);

  const fetchTodayStatus = async () => {
    if (!user?.employeeId && !user?._id) return;

    try {
      const employeeId = user.employeeId || user._id;
      const response = await api.get(`/attendance/today/${employeeId}`);
      const data = response.data.data;

      if (data) {
        setIsCheckedIn(data.isCheckedIn || false);
        setIsCheckedOut(data.isCheckedOut || false);

        if (data.attendance?.checkIn) {
          setCheckInTime(new Date(data.attendance.checkIn).toLocaleTimeString());
        }
        if (data.attendance?.checkOut) {
          setCheckOutTime(new Date(data.attendance.checkOut).toLocaleTimeString());
        }
        if (data.attendance?.status) {
          setAttendanceStatus(data.attendance.status);
        }
      }
    } catch (error) {
      console.error('Failed to fetch today status:', error);
    }
  };

  const fetchAttendanceHistory = async () => {
    if (!user?.employeeId && !user?._id) {
      generateMockHistory();
      return;
    }

    try {
      setIsLoadingHistory(true);
      const employeeId = user.employeeId || user._id;

      // Calculate start and end dates for the selected month
      const startDate = new Date(selectedYear, selectedMonth, 1);
      const endDate = new Date(selectedYear, selectedMonth + 1, 0);

      const response = await api.get(`/attendance?employeeId=${employeeId}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}&limit=50`);

      const records = response.data.data?.records || [];

      if (records.length > 0) {
        // Calculate work hours for each record
        const processedRecords = records.map((record: any) => ({
          ...record,
          workHours: record.checkIn && record.checkOut
            ? (new Date(record.checkOut).getTime() - new Date(record.checkIn).getTime()) / (1000 * 60 * 60)
            : record.workHours || 0,
        }));
        setAttendanceHistory(processedRecords.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      } else {
        // If no records from API, show empty or generate mock
        setAttendanceHistory([]);
      }
    } catch (error) {
      console.error('Failed to fetch attendance history:', error);
      generateMockHistory();
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const generateMockHistory = () => {
    const records: AttendanceRecord[] = [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const today = new Date();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(selectedYear, selectedMonth, day);
      if (date > today) continue; // Don't show future dates
      if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends

      const statuses: Array<'present' | 'absent' | 'late' | 'on_leave'> = ['present', 'present', 'present', 'present', 'late', 'on_leave'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      let checkIn, checkOut, workHours;
      if (status === 'present' || status === 'late') {
        const baseHour = status === 'late' ? 9 + Math.floor(Math.random() * 2) : 8 + Math.floor(Math.random() * 2);
        checkIn = new Date(selectedYear, selectedMonth, day, baseHour, Math.floor(Math.random() * 60)).toISOString();
        checkOut = new Date(selectedYear, selectedMonth, day, 17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60)).toISOString();
        workHours = 8 + Math.random() * 2;
      }

      records.push({
        _id: `att-${day}`,
        date: date.toISOString().split('T')[0],
        status,
        checkIn,
        checkOut,
        workHours,
      });
    }

    setAttendanceHistory(records.reverse());
    setIsLoadingHistory(false);
  };

  const handleCheckIn = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await api.post('/attendance/check-in', {
        employeeId: user?.employeeId || user?._id,
      });

      if (response.data.success) {
        setIsCheckedIn(true);
        setCheckInTime(new Date().toLocaleTimeString());
        setAttendanceStatus(response.data.data.attendance.status);
        // Refresh attendance history to show today's record
        fetchAttendanceHistory();
      }
    } catch (error: any) {
      console.error('Check-in failed:', error);
      const message = error.response?.data?.message || 'Check-in failed';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await api.post('/attendance/check-out', {
        employeeId: user?.employeeId || user?._id,
      });

      if (response.data.success) {
        setIsCheckedOut(true);
        setCheckOutTime(new Date().toLocaleTimeString());
        if (response.data.data.attendance.status) {
          setAttendanceStatus(response.data.data.attendance.status);
        }
        // Refresh attendance history to show updated record
        fetchAttendanceHistory();
      }
    } catch (error: any) {
      console.error('Check-out failed:', error);
      const message = error.response?.data?.message || 'Check-out failed';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      present: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <HiCheckCircle className="w-4 h-4" /> },
      absent: { bg: 'bg-rose-100', text: 'text-rose-700', icon: <HiXCircle className="w-4 h-4" /> },
      late: { bg: 'bg-amber-100', text: 'text-amber-700', icon: <HiClock className="w-4 h-4" /> },
      half_day: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <HiClock className="w-4 h-4" /> },
      on_leave: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <HiCalendar className="w-4 h-4" /> },
    };
    const style = styles[status] || styles.absent;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        {style.icon}
        {status.replace('_', ' ').charAt(0).toUpperCase() + status.replace('_', ' ').slice(1)}
      </span>
    );
  };

  const formatTime = (time?: string) => {
    if (!time) return '-';
    return new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Calculate stats
  const stats = {
    present: attendanceHistory.filter(r => r.status === 'present').length,
    late: attendanceHistory.filter(r => r.status === 'late').length,
    absent: attendanceHistory.filter(r => r.status === 'absent').length,
    onLeave: attendanceHistory.filter(r => r.status === 'on_leave').length,
    totalHours: attendanceHistory.reduce((sum, r) => sum + (r.workHours || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header with Check In/Out */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HiClock className="w-5 h-5 text-pink-200" />
              <span className="text-sm font-medium text-white/80">My Attendance</span>
            </div>
            <h1 className="text-3xl font-bold">Track Your Attendance</h1>
            <p className="text-white/70 mt-1">{currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </div>

          {/* Check In/Out Widget */}
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-4xl font-mono font-bold">{currentTime.toLocaleTimeString()}</p>
                <p className="text-xs text-white/70 mt-1">
                  {isCheckedOut
                    ? `In: ${checkInTime} | Out: ${checkOutTime}`
                    : isCheckedIn
                    ? `Checked in at ${checkInTime}`
                    : 'Not checked in yet'}
                </p>
              </div>
              {isCheckedOut ? (
                <div className="p-4 rounded-xl bg-blue-500 shadow-lg shadow-blue-500/25">
                  <HiCheckCircle className="w-8 h-8" />
                </div>
              ) : (
                <button
                  onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                  disabled={isLoading}
                  className={`p-4 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                    isCheckedIn
                      ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/25'
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/25'
                  }`}
                >
                  {isLoading ? (
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : isCheckedIn ? (
                    <HiLogout className="w-8 h-8" />
                  ) : (
                    <HiPlay className="w-8 h-8" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Today's Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${
              isCheckedOut ? 'bg-blue-100' : isCheckedIn ? 'bg-emerald-100' : 'bg-amber-100'
            }`}>
              {isCheckedOut ? (
                <HiCheckCircle className="w-5 h-5 text-blue-600" />
              ) : isCheckedIn ? (
                <HiCheckCircle className="w-5 h-5 text-emerald-600" />
              ) : (
                <HiClock className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <span className="text-sm font-medium text-secondary-500">Today's Status</span>
          </div>
          <p className={`text-xl font-bold ${
            isCheckedOut ? 'text-blue-600' : isCheckedIn ? 'text-emerald-600' : 'text-amber-600'
          }`}>
            {isCheckedOut ? 'Day Complete' : isCheckedIn ? 'Checked In' : 'Not Checked In'}
          </p>
          {checkInTime && <p className="text-xs text-secondary-400 mt-1">In: {checkInTime}</p>}
          {checkOutTime && <p className="text-xs text-secondary-400">Out: {checkOutTime}</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-blue-100 rounded-xl">
              <HiSun className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-secondary-500">Shift</span>
          </div>
          <p className="text-xl font-bold text-secondary-900">General</p>
          <p className="text-xs text-secondary-400">9:00 AM - 6:00 PM</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-purple-100 rounded-xl">
              <HiLocationMarker className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-secondary-500">Location</span>
          </div>
          <p className="text-xl font-bold text-secondary-900">Office</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-emerald-100 rounded-xl">
              <HiClock className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-secondary-500">Hours This Month</span>
          </div>
          <p className="text-xl font-bold text-secondary-900">{stats.totalHours.toFixed(1)}h</p>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-secondary-900">Monthly Summary</h3>
          <div className="flex items-center gap-2 bg-secondary-50 rounded-xl p-1">
            <button
              onClick={() => {
                if (selectedMonth === 0) {
                  setSelectedMonth(11);
                  setSelectedYear(selectedYear - 1);
                } else {
                  setSelectedMonth(selectedMonth - 1);
                }
              }}
              className="p-2 hover:bg-white rounded-lg transition-all"
            >
              <HiChevronLeft className="w-5 h-5 text-secondary-600" />
            </button>
            <span className="px-4 py-2 min-w-[140px] text-center font-medium">
              {months[selectedMonth]} {selectedYear}
            </span>
            <button
              onClick={() => {
                if (selectedMonth === 11) {
                  setSelectedMonth(0);
                  setSelectedYear(selectedYear + 1);
                } else {
                  setSelectedMonth(selectedMonth + 1);
                }
              }}
              className="p-2 hover:bg-white rounded-lg transition-all"
            >
              <HiChevronRight className="w-5 h-5 text-secondary-600" />
            </button>
          </div>
        </div>

        {/* Stats Pills */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 rounded-xl">
            <HiCheckCircle className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">Present: {stats.present}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl">
            <HiClock className="w-5 h-5 text-amber-600" />
            <span className="text-sm font-medium text-amber-700">Late: {stats.late}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-xl">
            <HiXCircle className="w-5 h-5 text-rose-600" />
            <span className="text-sm font-medium text-rose-700">Absent: {stats.absent}</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-xl">
            <HiCalendar className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">On Leave: {stats.onLeave}</span>
          </div>
        </div>

        {/* Attendance History Table */}
        <div className="overflow-x-auto rounded-xl border border-secondary-200">
          <table className="w-full">
            <thead className="bg-secondary-50">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-secondary-600 uppercase">Date</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-secondary-600 uppercase">Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-secondary-600 uppercase">Check In</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-secondary-600 uppercase">Check Out</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-secondary-600 uppercase">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-100">
              {attendanceHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-secondary-500">
                    No attendance records for this month
                  </td>
                </tr>
              ) : (
                attendanceHistory.map((record) => (
                  <tr key={record._id} className="hover:bg-secondary-50">
                    <td className="px-4 py-3 font-medium text-secondary-900">{formatDate(record.date)}</td>
                    <td className="px-4 py-3 text-center">{getStatusBadge(record.status)}</td>
                    <td className="px-4 py-3 text-center text-secondary-600">{formatTime(record.checkIn)}</td>
                    <td className="px-4 py-3 text-center text-secondary-600">{formatTime(record.checkOut)}</td>
                    <td className="px-4 py-3 text-center text-secondary-600">
                      {record.workHours ? `${record.workHours.toFixed(1)}h` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Admin Attendance View Component (Original)
const AdminAttendanceView: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, onLeave: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const { sortConfig, handleSort } = useSortConfig('date', 'desc');

  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, statusFilter, departmentFilter, debouncedSearchTerm, pagination.page, pagination.limit, sortConfig]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchAttendance = async () => {
    try {
      setIsSearching(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        startDate: selectedDate,
        endDate: selectedDate,
      });
      if (statusFilter) params.append('status', statusFilter);
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (departmentFilter) params.append('departmentId', departmentFilter);
      if (sortConfig.key) {
        params.append('sortBy', sortConfig.key);
        params.append('sortOrder', sortConfig.order || 'desc');
      }

      const response = await api.get(`/attendance?${params}`);
      const data = response.data.data?.records || response.data.data || [];
      setRecords(data);

      if (response.data.data?.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.data.data.pagination.total || 0,
          pages: response.data.data.pagination.pages || 0,
        }));
      }

      const present = data.filter((r: AttendanceRecord) => r.status === 'present').length;
      const absent = data.filter((r: AttendanceRecord) => r.status === 'absent').length;
      const late = data.filter((r: AttendanceRecord) => r.status === 'late').length;
      const onLeave = data.filter((r: AttendanceRecord) => r.status === 'on_leave').length;
      setStats({ present, absent, late, onLeave });
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      setRecords([]);
      setStats({ present: 0, absent: 0, late: 0, onLeave: 0 });
    } finally {
      setIsInitialLoading(false);
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (debouncedSearchTerm !== '') {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  }, [debouncedSearchTerm]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      present: { bg: 'bg-green-100', text: 'text-green-700', icon: <HiCheckCircle className="w-4 h-4" /> },
      absent: { bg: 'bg-red-100', text: 'text-red-700', icon: <HiXCircle className="w-4 h-4" /> },
      late: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <HiClock className="w-4 h-4" /> },
      half_day: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <HiClock className="w-4 h-4" /> },
      on_leave: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <HiCalendar className="w-4 h-4" /> },
    };
    const style = styles[status] || styles.absent;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        {style.icon}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const formatTime = (time?: string) => {
    if (!time) return '-';
    return new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  if (isInitialLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-secondary-200 rounded w-1/4" />
        <div className="grid grid-cols-4 gap-4">
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Attendance</h1>
          <p className="text-secondary-500">Track employee attendance records</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            {isSearching ? (
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
            )}
            <input
              type="text"
              placeholder="Search by employee name or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <HiFilter className="text-secondary-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="on_leave">On Leave</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => {
                setDepartmentFilter(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <HiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Present</p>
              <p className="text-2xl font-bold text-secondary-900">{stats.present}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <HiXCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Absent</p>
              <p className="text-2xl font-bold text-secondary-900">{stats.absent}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <HiClock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">Late</p>
              <p className="text-2xl font-bold text-secondary-900">{stats.late}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HiCalendar className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-secondary-500">On Leave</p>
              <p className="text-2xl font-bold text-secondary-900">{stats.onLeave}</p>
            </div>
          </div>
        </div>
      </div>

      <div className={`bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden transition-opacity ${isSearching ? 'opacity-60' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">Employee</th>
                <SortableTableHeader label="Status" sortKey="status" currentSort={sortConfig} onSort={handleSort} />
                <SortableTableHeader label="Check In" sortKey="checkIn" currentSort={sortConfig} onSort={handleSort} />
                <SortableTableHeader label="Check Out" sortKey="checkOut" currentSort={sortConfig} onSort={handleSort} />
                <SortableTableHeader label="Work Hours" sortKey="workHours" currentSort={sortConfig} onSort={handleSort} />
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <HiClock className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                    <p className="text-secondary-500">No attendance records found</p>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record._id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-medium">
                            {record.employee?.firstName?.[0] || '?'}{record.employee?.lastName?.[0] || ''}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">
                            {record.employee?.firstName || 'Unknown'} {record.employee?.lastName || ''}
                          </p>
                          <p className="text-sm text-secondary-500">{record.employee?.employeeCode || record.employeeId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                    <td className="px-6 py-4 text-secondary-600">{formatTime(record.checkIn)}</td>
                    <td className="px-6 py-4 text-secondary-600">{formatTime(record.checkOut)}</td>
                    <td className="px-6 py-4 text-secondary-600">{record.workHours ? `${record.workHours.toFixed(1)}h` : '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-secondary-200">
          <div className="flex items-center gap-4">
            <p className="text-sm text-secondary-500">
              Showing {pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-secondary-500">Rows per page:</label>
              <select
                value={pagination.limit}
                onChange={(e) => setPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                className="px-2 py-1 text-sm border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border border-secondary-200 rounded-lg hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-secondary-600">Page {pagination.page} of {pagination.pages || 1}</span>
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages || pagination.pages === 0}
              className="px-3 py-1 text-sm border border-secondary-200 rounded-lg hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Attendance Component
const Attendance: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  const isAdminOrHR = user?.permissions?.includes('*') ||
    user?.permissions?.includes('employees:read') ||
    user?.permissions?.includes('attendance:write') ||
    user?.role === 'admin' ||
    user?.role === 'tenant_admin' ||
    user?.role === 'hr' ||
    user?.role === 'hr_manager' ||
    user?.role === 'manager';

  if (isAdminOrHR) {
    return <AdminAttendanceView />;
  }

  return <EmployeeAttendanceView user={user} />;
};

export default Attendance;
