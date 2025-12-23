import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HiOfficeBuilding,
  HiCurrencyDollar,
  HiTrendingUp,
  HiUserGroup,
  HiClock,
  HiCheckCircle,
  HiExclamationCircle,
  HiArrowUp,
  HiArrowDown,
  HiPlus,
  HiBell,
  HiCog,
} from 'react-icons/hi';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import api from '../../services/api';

interface PlatformStats {
  totalTenants: number;
  byStatus: Record<string, number>;
  byPlan: Record<string, number>;
  recentTenants: any[];
  trialExpiringSoon: number;
}

interface RevenueData {
  mrr: number;
  arr: number;
  revenueByPlan: Record<string, number>;
  totalPaidTenants: number;
  averageRevenuePerTenant: number;
  growthData: { month: string; signups: number }[];
  conversionRate: number;
  churnRate: number;
}

interface GrowthData {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  newThisMonth: number;
  newLastMonth: number;
  growthRate: number;
  dailySignups: { date: string; count: number }[];
}

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];

const PlatformDashboard: React.FC = () => {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const [statsRes, revenueRes, growthRes] = await Promise.allSettled([
        api.get('/tenants/admin/stats', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get('/tenants/admin/revenue', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get('/tenants/admin/growth', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data.data);
      }
      if (revenueRes.status === 'fulfilled') {
        setRevenue(revenueRes.value.data.data);
      }
      if (growthRes.status === 'fulfilled') {
        setGrowth(growthRes.value.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const planDistribution = stats?.byPlan
    ? Object.entries(stats.byPlan).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your HRM SaaS platform</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/super-admin/notifications"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <HiBell className="w-4 h-4" />
            Send Notification
          </Link>
          <Link
            to="/super-admin/tenants"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <HiPlus className="w-4 h-4" />
            Add Tenant
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Tenants */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Tenants</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {stats?.totalTenants || 0}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <HiArrowUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600">
                  +{growth?.newThisMonth || 0} this month
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <HiOfficeBuilding className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        {/* MRR */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Monthly Revenue (MRR)</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(revenue?.mrr || 0)}
              </p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm text-gray-500">
                  ARR: {formatCurrency(revenue?.arr || 0)}
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <HiCurrencyDollar className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Growth Rate */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Growth Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {growth?.growthRate || 0}%
              </p>
              <div className="flex items-center gap-1 mt-2">
                {(growth?.growthRate || 0) >= 0 ? (
                  <HiArrowUp className="w-4 h-4 text-green-500" />
                ) : (
                  <HiArrowDown className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm text-gray-500">vs last month</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <HiTrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Trial Conversion</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {revenue?.conversionRate || 0}%
              </p>
              <div className="flex items-center gap-1 mt-2">
                <span className="text-sm text-gray-500">
                  Churn: {revenue?.churnRate || 0}%
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <HiUserGroup className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signups Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Tenant Signups</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={growth?.dailySignups || []}>
              <defs>
                <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#8B5CF6"
                fill="url(#colorSignups)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Plan Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Plan Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={planDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}`}
              >
                {planDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tenants */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Tenants</h3>
            <Link
              to="/super-admin/tenants"
              className="text-sm text-purple-600 hover:text-purple-700"
            >
              View all
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-3 font-medium">Organization</th>
                  <th className="pb-3 font-medium">Plan</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats?.recentTenants?.map((tenant) => (
                  <tr key={tenant._id} className="text-sm">
                    <td className="py-3">
                      <Link
                        to={`/super-admin/tenants/${tenant._id}`}
                        className="font-medium text-gray-900 hover:text-purple-600"
                      >
                        {tenant.name}
                      </Link>
                      <p className="text-gray-500 text-xs">{tenant.slug}</p>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium">
                        {tenant.subscription?.plan || 'Free'}
                      </span>
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
                          tenant.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : tenant.status === 'trial'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {tenant.status === 'active' && <HiCheckCircle className="w-3 h-3" />}
                        {tenant.status === 'trial' && <HiClock className="w-3 h-3" />}
                        {tenant.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions & Alerts */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Alerts</h3>
            <div className="space-y-3">
              {(stats?.trialExpiringSoon || 0) > 0 && (
                <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                  <HiExclamationCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">
                      Trials Expiring Soon
                    </p>
                    <p className="text-xs text-yellow-600">
                      {stats?.trialExpiringSoon} trial(s) expiring within 7 days
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <HiCheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">System Healthy</p>
                  <p className="text-xs text-green-600">All services operational</p>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link
                to="/super-admin/tenants"
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <HiOfficeBuilding className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Manage Tenants</span>
              </Link>
              <Link
                to="/super-admin/notifications"
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <HiBell className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">
                  Send Announcement
                </span>
              </Link>
              <Link
                to="/super-admin/settings"
                className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <HiCog className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Platform Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlatformDashboard;
