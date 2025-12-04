import React, { useEffect, useState } from 'react';
import { HiUsers, HiUserAdd, HiCalendar, HiClock, HiTrendingUp, HiTrendingDown } from 'react-icons/hi';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import type { DashboardStats } from '../types';
import { useAppSelector } from '../hooks/useAppDispatch';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { tenant } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        setStats(response.data.data);
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
        // Use mock data
        setStats({
          totalEmployees: 0,
          activeEmployees: 0,
          newHires: 0,
          pendingLeaves: 0,
          presentToday: 0,
          absentToday: 0,
          upcomingBirthdays: [],
          departmentDistribution: [],
          attendanceTrend: [],
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
          <button className="p-4 bg-primary-50 rounded-lg text-left hover:bg-primary-100 transition-colors">
            <HiUserAdd className="w-6 h-6 text-primary-600 mb-2" />
            <p className="font-medium text-secondary-900">Add Employee</p>
            <p className="text-sm text-secondary-500">Create new record</p>
          </button>
          <button className="p-4 bg-green-50 rounded-lg text-left hover:bg-green-100 transition-colors">
            <HiCalendar className="w-6 h-6 text-green-600 mb-2" />
            <p className="font-medium text-secondary-900">Leave Requests</p>
            <p className="text-sm text-secondary-500">{stats?.pendingLeaves || 0} pending</p>
          </button>
          <button className="p-4 bg-purple-50 rounded-lg text-left hover:bg-purple-100 transition-colors">
            <HiClock className="w-6 h-6 text-purple-600 mb-2" />
            <p className="font-medium text-secondary-900">Attendance</p>
            <p className="text-sm text-secondary-500">View today's log</p>
          </button>
          <button className="p-4 bg-orange-50 rounded-lg text-left hover:bg-orange-100 transition-colors">
            <HiUsers className="w-6 h-6 text-orange-600 mb-2" />
            <p className="font-medium text-secondary-900">Team Overview</p>
            <p className="text-sm text-secondary-500">{stats?.totalEmployees || 0} employees</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
