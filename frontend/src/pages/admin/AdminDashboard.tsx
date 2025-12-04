import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

interface SystemStats {
  users: {
    total: number;
    active: number;
    byRole: Record<string, number>;
  };
  audit: {
    totalEvents: number;
    recentActivity: {
      action: string;
      category: string;
      userName: string;
      createdAt: string;
      status: string;
    }[];
  };
}

const AdminDashboard = () => {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [userStats, auditStats] = await Promise.all([
        api.get('/auth/admin/users/stats'),
        api.get('/auth/admin/audit-logs/stats'),
      ]);

      setStats({
        users: {
          total: userStats.data.data.totalUsers,
          active: userStats.data.data.byStatus?.active || 0,
          byRole: userStats.data.data.byRole || {},
        },
        audit: {
          totalEvents: auditStats.data.data.totalLogs,
          recentActivity: auditStats.data.data.recentActivity || [],
        },
      });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const adminModules = [
    {
      title: 'User Management',
      description: 'Manage users and their accounts',
      icon: '👥',
      link: '/admin/users',
      color: 'bg-blue-50 border-blue-200',
    },
    {
      title: 'Role Management',
      description: 'Configure roles and permissions',
      icon: '🔐',
      link: '/admin/roles',
      color: 'bg-indigo-50 border-indigo-200',
    },
    {
      title: 'Audit Logs',
      description: 'View system activity and security events',
      icon: '📋',
      link: '/admin/audit-logs',
      color: 'bg-purple-50 border-purple-200',
    },
    {
      title: 'Organization Settings',
      description: 'Configure organization preferences',
      icon: '⚙️',
      link: '/settings',
      color: 'bg-gray-50 border-gray-200',
    },
    {
      title: 'Reports',
      description: 'Generate and view analytics reports',
      icon: '📊',
      link: '/reports',
      color: 'bg-green-50 border-green-200',
    },
  ];

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      auth: '🔐', user: '👤', employee: '👥', attendance: '📅',
      leave: '🏖️', payroll: '💰', settings: '⚙️', document: '📄',
    };
    return icons[category] || '📋';
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-gray-500">System overview and administration tools</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Total Users</div>
              <div className="text-3xl font-bold text-gray-900">{stats?.users.total || 0}</div>
            </div>
            <div className="text-4xl">👥</div>
          </div>
          <div className="mt-2 text-sm text-green-600">
            {stats?.users.active || 0} active
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Admins</div>
              <div className="text-3xl font-bold text-purple-600">
                {stats?.users.byRole?.tenant_admin || 0}
              </div>
            </div>
            <div className="text-4xl">👑</div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats?.users.byRole?.hr || 0} HR managers
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Managers</div>
              <div className="text-3xl font-bold text-blue-600">
                {stats?.users.byRole?.manager || 0}
              </div>
            </div>
            <div className="text-4xl">👔</div>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats?.users.byRole?.employee || 0} employees
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Audit Events</div>
              <div className="text-3xl font-bold text-green-600">
                {stats?.audit.totalEvents || 0}
              </div>
            </div>
            <div className="text-4xl">📋</div>
          </div>
          <div className="mt-2 text-sm text-gray-500">Last 30 days</div>
        </div>
      </div>

      {/* Admin Modules */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Admin Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {adminModules.map((module) => (
            <Link
              key={module.title}
              to={module.link}
              className={`p-6 rounded-lg border-2 ${module.color} hover:shadow-md transition-shadow`}
            >
              <div className="text-4xl mb-3">{module.icon}</div>
              <h3 className="font-semibold text-gray-900">{module.title}</h3>
              <p className="text-sm text-gray-500 mt-1">{module.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
          <Link to="/admin/audit-logs" className="text-blue-600 hover:text-blue-900 text-sm">
            View All
          </Link>
        </div>
        <div className="divide-y divide-gray-200">
          {stats?.audit.recentActivity.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">
              No recent activity
            </div>
          ) : (
            stats?.audit.recentActivity.map((activity, index) => (
              <div key={index} className="px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-2xl">{getCategoryIcon(activity.category)}</span>
                  <div>
                    <div className="font-medium text-gray-900">
                      {activity.action.replace(/_/g, ' ')}
                    </div>
                    <div className="text-sm text-gray-500">
                      by {activity.userName}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    activity.status === 'success' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {activity.status}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(activity.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white">
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/admin/users"
            className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            + Add New User
          </Link>
          <Link
            to="/employees/new"
            className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            + Add Employee
          </Link>
          <Link
            to="/departments"
            className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            Manage Departments
          </Link>
          <Link
            to="/reports"
            className="px-4 py-2 bg-white bg-opacity-20 rounded-lg hover:bg-opacity-30 transition-colors"
          >
            Generate Report
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
