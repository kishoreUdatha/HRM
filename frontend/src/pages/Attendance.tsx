import React, { useState, useEffect } from 'react';
import { HiClock, HiCheckCircle, HiXCircle, HiCalendar, HiSearch, HiFilter } from 'react-icons/hi';
import api from '../services/api';
import SortableTableHeader, { useSortConfig } from '../components/common/SortableTableHeader';

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

const Attendance: React.FC = () => {
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

  // Debounce search term for auto-search (500ms delay)
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

      // Calculate stats
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

  // Reset to page 1 when search term changes
  useEffect(() => {
    if (debouncedSearchTerm !== '') {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }
  }, [debouncedSearchTerm]);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      present: {
        bg: 'bg-green-100',
        text: 'text-green-700',
        icon: <HiCheckCircle className="w-4 h-4" />,
      },
      absent: {
        bg: 'bg-red-100',
        text: 'text-red-700',
        icon: <HiXCircle className="w-4 h-4" />,
      },
      late: {
        bg: 'bg-yellow-100',
        text: 'text-yellow-700',
        icon: <HiClock className="w-4 h-4" />,
      },
      half_day: {
        bg: 'bg-orange-100',
        text: 'text-orange-700',
        icon: <HiClock className="w-4 h-4" />,
      },
      on_leave: {
        bg: 'bg-blue-100',
        text: 'text-blue-700',
        icon: <HiCalendar className="w-4 h-4" />,
      },
    };
    const style = styles[status] || styles.absent;
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}
      >
        {style.icon}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const formatTime = (time?: string) => {
    if (!time) return '-';
    return new Date(time).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
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
      {/* Header */}
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

      {/* Filters */}
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
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
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

      {/* Attendance Table */}
      <div className={`bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden transition-opacity ${isSearching ? 'opacity-60' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Employee
                </th>
                <SortableTableHeader
                  label="Status"
                  sortKey="status"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Check In"
                  sortKey="checkIn"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Check Out"
                  sortKey="checkOut"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Work Hours"
                  sortKey="workHours"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <HiClock className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                    <p className="text-secondary-500">
                      No attendance records found
                    </p>
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record._id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-medium">
                            {record.employee?.firstName?.[0] || '?'}
                            {record.employee?.lastName?.[0] || ''}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">
                            {record.employee?.firstName || 'Unknown'} {record.employee?.lastName || ''}
                          </p>
                          <p className="text-sm text-secondary-500">
                            {record.employee?.employeeCode || record.employeeId}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(record.status)}</td>
                    <td className="px-6 py-4 text-secondary-600">{formatTime(record.checkIn)}</td>
                    <td className="px-6 py-4 text-secondary-600">{formatTime(record.checkOut)}</td>
                    <td className="px-6 py-4 text-secondary-600">
                      {record.workHours ? `${record.workHours.toFixed(1)}h` : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
                <option value={30}>30</option>
                <option value={40}>40</option>
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
            <span className="text-sm text-secondary-600">
              Page {pagination.page} of {pagination.pages || 1}
            </span>
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

export default Attendance;
