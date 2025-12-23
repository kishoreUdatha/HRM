import React, { useEffect, useState } from 'react';
import {
  HiUsers,
  HiUserAdd,
  HiCalendar,
  HiClock,
  HiTrendingUp,
  HiTrendingDown,
  HiCheckCircle,
  HiXCircle,
  HiClipboardList,
  HiDocumentText,
  HiSun,
  HiBriefcase,
  HiCurrencyDollar,
  HiPlay,
  HiLogout,
  HiLocationMarker,
  HiExclamation,
} from 'react-icons/hi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import type { DashboardStats } from '../types';
import { useAppSelector } from '../hooks/useAppDispatch';
import { Link } from 'react-router-dom';

// Employee Dashboard Component
const EmployeeDashboard: React.FC<{ user: any; tenant: any }> = ({ user, tenant }) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState<string>('');
  const [leaveBalance, setLeaveBalance] = useState({
    annual: { total: 20, used: 5, pending: 2 },
    sick: { total: 10, used: 2, pending: 0 },
    casual: { total: 5, used: 1, pending: 1 },
  });
  const [recentLeaves, setRecentLeaves] = useState([
    { id: 1, type: 'Annual Leave', startDate: '2025-12-24', endDate: '2025-12-26', status: 'approved', days: 3 },
    { id: 2, type: 'Sick Leave', startDate: '2025-12-10', endDate: '2025-12-10', status: 'approved', days: 1 },
  ]);
  const [upcomingHolidays, setUpcomingHolidays] = useState([
    { name: 'Christmas Day', date: '2025-12-25' },
    { name: 'New Year', date: '2026-01-01' },
  ]);
  const [weeklyHours, setWeeklyHours] = useState({ logged: 32, target: 40 });

  // Fetch today's attendance status on load
  useEffect(() => {
    fetchTodayStatus();
  }, [user]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      }
    } catch (error: any) {
      console.error('Check-out failed:', error);
      const message = error.response?.data?.message || 'Check-out failed';
      alert(message);
    } finally {
      setIsLoading(false);
    }
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-white/70 text-sm">{formatDate(currentTime)}</p>
            <h1 className="text-3xl font-bold mt-1">{getGreeting()}, {user?.firstName}!</h1>
            <p className="text-white/80 mt-2">
              {tenant?.name} | {user?.role === 'employee' ? 'Team Member' : user?.role?.replace('_', ' ')}
            </p>
          </div>

          <div className="text-right">
            <p className="text-5xl font-mono font-bold">{currentTime.toLocaleTimeString()}</p>
            <p className="text-white/70 text-sm mt-1">Current Time</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Status */}
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

        {/* Leave Balance */}
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-blue-100 rounded-xl">
              <HiCalendar className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-secondary-500">Leave Balance</span>
          </div>
          <p className="text-xl font-bold text-secondary-900">
            {leaveBalance.annual.total - leaveBalance.annual.used} days
          </p>
          <p className="text-xs text-secondary-400 mt-1">Annual leave remaining</p>
        </div>

        {/* Weekly Hours */}
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-purple-100 rounded-xl">
              <HiBriefcase className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-secondary-500">This Week</span>
          </div>
          <p className="text-xl font-bold text-secondary-900">{weeklyHours.logged}h / {weeklyHours.target}h</p>
          <div className="w-full bg-secondary-100 rounded-full h-1.5 mt-2">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(weeklyHours.logged / weeklyHours.target) * 100}%` }}
            />
          </div>
        </div>

        {/* Pending Requests */}
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-orange-100 rounded-xl">
              <HiClipboardList className="w-5 h-5 text-orange-600" />
            </div>
            <span className="text-sm font-medium text-secondary-500">Pending</span>
          </div>
          <p className="text-xl font-bold text-secondary-900">
            {leaveBalance.annual.pending + leaveBalance.sick.pending + leaveBalance.casual.pending}
          </p>
          <p className="text-xs text-secondary-400 mt-1">Leave requests awaiting</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Check In/Out Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-secondary-100 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Attendance</h3>

          <div className="flex flex-col md:flex-row gap-4">
            {/* Check In/Out Button */}
            <div className="flex-1 bg-gradient-to-br from-secondary-50 to-white rounded-xl p-6 border border-secondary-100">
              <div className="text-center">
                <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4 ${
                  isCheckedOut ? 'bg-blue-100' : isCheckedIn ? 'bg-emerald-100' : 'bg-indigo-100'
                }`}>
                  {isCheckedOut ? (
                    <HiCheckCircle className="w-10 h-10 text-blue-600" />
                  ) : isCheckedIn ? (
                    <HiCheckCircle className="w-10 h-10 text-emerald-600" />
                  ) : (
                    <HiClock className="w-10 h-10 text-indigo-600" />
                  )}
                </div>

                {isCheckedOut ? (
                  <div className="w-full py-3 px-6 rounded-xl bg-blue-100 text-blue-700 font-semibold">
                    Day Complete
                  </div>
                ) : (
                  <button
                    onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                    disabled={isLoading}
                    className={`w-full py-3 px-6 rounded-xl font-semibold text-white transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
                      isCheckedIn
                        ? 'bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-500/25'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/25'
                    }`}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Processing...
                        </>
                      ) : isCheckedIn ? (
                        <>
                          <HiLogout className="w-5 h-5" />
                          Check Out
                        </>
                      ) : (
                        <>
                          <HiPlay className="w-5 h-5" />
                          Check In
                        </>
                      )}
                    </span>
                  </button>
                )}

                {checkInTime && (
                  <p className="mt-3 text-sm text-secondary-500">
                    Checked in at <span className="font-medium text-secondary-700">{checkInTime}</span>
                  </p>
                )}
                {checkOutTime && (
                  <p className="mt-1 text-sm text-secondary-500">
                    Checked out at <span className="font-medium text-secondary-700">{checkOutTime}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Today's Schedule */}
            <div className="flex-1 space-y-3">
              <div className="bg-secondary-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <HiSun className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary-900">Shift: General</p>
                    <p className="text-xs text-secondary-500">9:00 AM - 6:00 PM</p>
                  </div>
                </div>
              </div>

              <div className="bg-secondary-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <HiLocationMarker className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary-900">Work Location</p>
                    <p className="text-xs text-secondary-500">Office / Remote</p>
                  </div>
                </div>
              </div>

              <div className="bg-secondary-50 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg">
                    <HiBriefcase className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary-900">Department</p>
                    <p className="text-xs text-secondary-500">Engineering</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leave Balance Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-secondary-900">Leave Balance</h3>
            <Link to="/leaves" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View All
            </Link>
          </div>

          <div className="space-y-4">
            {Object.entries(leaveBalance).map(([type, balance]) => (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-secondary-700 capitalize">{type} Leave</span>
                  <span className="text-sm text-secondary-500">
                    {balance.total - balance.used} / {balance.total} days
                  </span>
                </div>
                <div className="w-full bg-secondary-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      type === 'annual' ? 'bg-blue-500' : type === 'sick' ? 'bg-rose-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${((balance.total - balance.used) / balance.total) * 100}%` }}
                  />
                </div>
                {balance.pending > 0 && (
                  <p className="text-xs text-amber-600">
                    {balance.pending} day(s) pending approval
                  </p>
                )}
              </div>
            ))}
          </div>

          <Link
            to="/leaves"
            className="mt-4 w-full py-2.5 px-4 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2"
          >
            <HiCalendar className="w-4 h-4" />
            Apply for Leave
          </Link>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leave Requests */}
        <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Recent Leave Requests</h3>

          {recentLeaves.length > 0 ? (
            <div className="space-y-3">
              {recentLeaves.map((leave) => (
                <div key={leave.id} className="flex items-center justify-between p-3 bg-secondary-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      leave.status === 'approved' ? 'bg-emerald-100' :
                      leave.status === 'pending' ? 'bg-amber-100' : 'bg-rose-100'
                    }`}>
                      {leave.status === 'approved' ? (
                        <HiCheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : leave.status === 'pending' ? (
                        <HiClock className="w-5 h-5 text-amber-600" />
                      ) : (
                        <HiXCircle className="w-5 h-5 text-rose-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-secondary-900">{leave.type}</p>
                      <p className="text-xs text-secondary-500">
                        {leave.startDate} - {leave.endDate} ({leave.days} day{leave.days > 1 ? 's' : ''})
                      </p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${
                    leave.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                    leave.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {leave.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-secondary-500">
              <HiCalendar className="w-12 h-12 mx-auto mb-2 text-secondary-300" />
              <p>No recent leave requests</p>
            </div>
          )}
        </div>

        {/* Upcoming Holidays & Quick Actions */}
        <div className="space-y-6">
          {/* Upcoming Holidays */}
          <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Upcoming Holidays</h3>

            <div className="space-y-3">
              {upcomingHolidays.map((holiday, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                  <div className="p-2 bg-white rounded-lg">
                    <HiSun className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-secondary-900">{holiday.name}</p>
                    <p className="text-xs text-secondary-500">{holiday.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-6">
            <h3 className="text-lg font-semibold text-secondary-900 mb-4">Quick Actions</h3>

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/leaves"
                className="p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors text-center"
              >
                <HiCalendar className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-secondary-900">Apply Leave</p>
              </Link>
              <Link
                to="/timesheets"
                className="p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors text-center"
              >
                <HiClock className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-secondary-900">Timesheet</p>
              </Link>
              <Link
                to="/documents"
                className="p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors text-center"
              >
                <HiDocumentText className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-secondary-900">Documents</p>
              </Link>
              <Link
                to="/profile"
                className="p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors text-center"
              >
                <HiUsers className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-secondary-900">My Profile</p>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Admin Dashboard Component (Original)
const AdminDashboard: React.FC<{ tenant: any }> = ({ tenant }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        // Use mock data
        setStats({
          totalEmployees: 156,
          activeEmployees: 142,
          newHires: 8,
          pendingLeaves: 12,
          presentToday: 128,
          absentToday: 14,
          upcomingBirthdays: [],
          departmentDistribution: [
            { department: 'Engineering', count: 45 },
            { department: 'Sales', count: 32 },
            { department: 'Marketing', count: 28 },
            { department: 'HR', count: 15 },
            { department: 'Finance', count: 20 },
            { department: 'Operations', count: 16 },
          ],
          attendanceTrend: [
            { date: 'Mon', present: 140, absent: 16 },
            { date: 'Tue', present: 145, absent: 11 },
            { date: 'Wed', present: 138, absent: 18 },
            { date: 'Thu', present: 142, absent: 14 },
            { date: 'Fri', present: 128, absent: 28 },
          ],
          recentHires: [],
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { title: 'Total Employees', value: stats?.totalEmployees || 0, icon: HiUsers, color: 'bg-blue-500', change: '+5.2%', trend: 'up' },
    { title: 'New Hires', value: stats?.newHires || 0, icon: HiUserAdd, color: 'bg-green-500', change: '+12.5%', trend: 'up' },
    { title: 'Present Today', value: stats?.presentToday || 0, icon: HiClock, color: 'bg-purple-500', change: '-2.1%', trend: 'down' },
    { title: 'Pending Leaves', value: stats?.pendingLeaves || 0, icon: HiCalendar, color: 'bg-orange-500', change: '+3.8%', trend: 'up' },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-secondary-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Dashboard</h1>
        <p className="text-secondary-500">
          Welcome to {tenant?.name || 'your organization'}! Here's what's happening today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-secondary-500">{stat.title}</p>
                <p className="text-3xl font-bold text-secondary-900 mt-1">{stat.value}</p>
                <div className="flex items-center gap-1 mt-2">
                  {stat.trend === 'up' ? (
                    <HiTrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <HiTrendingDown className="w-4 h-4 text-red-500" />
                  )}
                  <span className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {stat.change}
                  </span>
                  <span className="text-sm text-secondary-400">vs last month</span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={stats?.attendanceTrend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip />
              <Area type="monotone" dataKey="present" stackId="1" stroke="#3b82f6" fill="#93c5fd" name="Present" />
              <Area type="monotone" dataKey="absent" stackId="1" stroke="#ef4444" fill="#fca5a5" name="Absent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Department Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-4">Department Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={stats?.departmentDistribution || []}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="count"
                nameKey="department"
              >
                {stats?.departmentDistribution?.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {stats?.departmentDistribution?.map((dept, index) => (
              <div key={dept.department} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-xs text-secondary-600">{dept.department}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Link to="/employees/new" className="p-4 bg-primary-50 rounded-lg text-left hover:bg-primary-100 transition-colors">
            <HiUserAdd className="w-6 h-6 text-primary-600 mb-2" />
            <p className="font-medium text-secondary-900">Add Employee</p>
            <p className="text-sm text-secondary-500">Create new record</p>
          </Link>
          <Link to="/leaves" className="p-4 bg-green-50 rounded-lg text-left hover:bg-green-100 transition-colors">
            <HiCalendar className="w-6 h-6 text-green-600 mb-2" />
            <p className="font-medium text-secondary-900">Leave Requests</p>
            <p className="text-sm text-secondary-500">{stats?.pendingLeaves || 0} pending</p>
          </Link>
          <Link to="/attendance" className="p-4 bg-purple-50 rounded-lg text-left hover:bg-purple-100 transition-colors">
            <HiClock className="w-6 h-6 text-purple-600 mb-2" />
            <p className="font-medium text-secondary-900">Attendance</p>
            <p className="text-sm text-secondary-500">View today's log</p>
          </Link>
          <Link to="/employees" className="p-4 bg-orange-50 rounded-lg text-left hover:bg-orange-100 transition-colors">
            <HiUsers className="w-6 h-6 text-orange-600 mb-2" />
            <p className="font-medium text-secondary-900">Team Overview</p>
            <p className="text-sm text-secondary-500">{stats?.totalEmployees || 0} employees</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const Dashboard: React.FC = () => {
  const { user, tenant } = useAppSelector((state) => state.auth);

  // Check if user is admin/hr or regular employee
  const isAdminOrHR = user?.permissions?.includes('*') ||
    user?.permissions?.includes('employees:read') ||
    user?.role === 'admin' ||
    user?.role === 'tenant_admin' ||
    user?.role === 'hr' ||
    user?.role === 'hr_manager' ||
    user?.role === 'manager';

  if (isAdminOrHR) {
    return <AdminDashboard tenant={tenant} />;
  }

  return <EmployeeDashboard user={user} tenant={tenant} />;
};

export default Dashboard;
