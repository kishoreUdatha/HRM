import React, { useState, useEffect } from 'react';
import { HiClock, HiCheckCircle, HiXCircle, HiCalendar, HiSearch, HiFilter } from 'react-icons/hi';
import api from '../services/api';

interface AttendanceRecord {
  _id: string;
  employee: {
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
}

interface Department {
  _id: string;
  name: string;
}

const Attendance: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [stats, setStats] = useState({ present: 0, absent: 0, late: 0, onLeave: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetchAttendance();
    fetchDepartments();
  }, [selectedDate]);

  // Filter records when search or filters change
  useEffect(() => {
    let filtered = records;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.employee.firstName.toLowerCase().includes(search) ||
          r.employee.lastName.toLowerCase().includes(search) ||
          r.employee.employeeCode.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }

    // Apply department filter
    if (departmentFilter) {
      filtered = filtered.filter(
        (r) => r.employee.departmentId?._id === departmentFilter
      );
    }

    setFilteredRecords(filtered);
  }, [records, searchTerm, statusFilter, departmentFilter]);

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
      const response = await api.get(`/attendance?date=${selectedDate}`);
      const data = response.data.data?.records || response.data.data || [];
      setRecords(data);
      setFilteredRecords(data);

      // Calculate stats
      const present = data.filter((r: AttendanceRecord) => r.status === 'present').length;
      const absent = data.filter((r: AttendanceRecord) => r.status === 'absent').length;
      const late = data.filter((r: AttendanceRecord) => r.status === 'late').length;
      const onLeave = data.filter((r: AttendanceRecord) => r.status === 'on_leave').length;
      setStats({ present, absent, late, onLeave });
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
      // Set empty data for demo
      setRecords([]);
      setFilteredRecords([]);
      setStats({ present: 0, absent: 0, late: 0, onLeave: 0 });
    } finally {
      setIsLoading(false);
    }
  };

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

  if (isLoading) {
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
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
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
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="half_day">Half Day</option>
              <option value="on_leave">On Leave</option>
            </select>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
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
        {(searchTerm || statusFilter !== 'all' || departmentFilter) && (
          <div className="mt-3 flex items-center gap-2 text-sm text-secondary-600">
            <span>Showing {filteredRecords.length} of {records.length} records</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setDepartmentFilter('');
              }}
              className="text-primary-600 hover:text-primary-700"
            >
              Clear filters
            </button>
          </div>
        )}
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
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Check In
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Check Out
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Work Hours
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <HiClock className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                    <p className="text-secondary-500">
                      {records.length === 0 ? 'No attendance records for this date' : 'No records match your filters'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record._id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-medium">
                            {record.employee.firstName[0]}
                            {record.employee.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">
                            {record.employee.firstName} {record.employee.lastName}
                          </p>
                          <p className="text-sm text-secondary-500">{record.employee.employeeCode}</p>
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
      </div>
    </div>
  );
};

export default Attendance;
