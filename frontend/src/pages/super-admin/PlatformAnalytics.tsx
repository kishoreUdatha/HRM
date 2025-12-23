import React, { useEffect, useState } from 'react';
import {
  HiCurrencyDollar,
  HiTrendingUp,
  HiTrendingDown,
  HiUserGroup,
  HiChartBar,
  HiRefresh,
  HiCalendar,
} from 'react-icons/hi';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
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

interface RevenueData {
  mrr: number;
  arr: number;
  revenueByPlan: Record<string, number>;
  totalPaidTenants: number;
  averageRevenuePerTenant: number;
  growthData: { month: string; revenue: number; signups: number }[];
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
  retentionRate: number;
}

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

const PlatformAnalytics: React.FC = () => {
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [growth, setGrowth] = useState<GrowthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'revenue' | 'growth' | 'usage'>('revenue');
  const [dateRange, setDateRange] = useState('30d');

  useEffect(() => {
    fetchAnalytics();
  }, [dateRange]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const [revenueRes, growthRes] = await Promise.allSettled([
        api.get('/tenants/admin/revenue', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get('/tenants/admin/growth', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (revenueRes.status === 'fulfilled') {
        setRevenue(revenueRes.value.data.data);
      }
      if (growthRes.status === 'fulfilled') {
        setGrowth(growthRes.value.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
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

  const revenueByPlanData = revenue?.revenueByPlan
    ? Object.entries(revenue.revenueByPlan).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  // Mock data for charts when API data is not available
  const monthlyRevenueData = revenue?.growthData || [
    { month: 'Jan', revenue: 12000, signups: 15 },
    { month: 'Feb', revenue: 15000, signups: 22 },
    { month: 'Mar', revenue: 18000, signups: 28 },
    { month: 'Apr', revenue: 22000, signups: 35 },
    { month: 'May', revenue: 28000, signups: 42 },
    { month: 'Jun', revenue: 32000, signups: 50 },
  ];

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
          <h1 className="text-2xl font-bold text-gray-900">Platform Analytics</h1>
          <p className="text-gray-500 mt-1">Revenue, growth, and usage insights</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="12m">Last 12 months</option>
          </select>
          <button
            onClick={fetchAnalytics}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <HiRefresh className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'revenue', label: 'Revenue', icon: HiCurrencyDollar },
            { id: 'growth', label: 'Growth', icon: HiTrendingUp },
            { id: 'usage', label: 'Usage', icon: HiChartBar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 pb-4 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Revenue Tab */}
      {activeTab === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Monthly Revenue (MRR)</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(revenue?.mrr || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <HiCurrencyDollar className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Annual Revenue (ARR)</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(revenue?.arr || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <HiTrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">ARPU</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(revenue?.averageRevenuePerTenant || 0)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Avg per tenant</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <HiUserGroup className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Churn Rate</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {revenue?.churnRate || 0}%
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    <HiTrendingDown className="w-3 h-3 inline" /> Target &lt; 5%
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                  <HiTrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={monthlyRevenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8B5CF6"
                    fill="url(#colorRevenue)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Plan</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={revenueByPlanData.length > 0 ? revenueByPlanData : [
                      { name: 'Starter', value: 15000 },
                      { name: 'Professional', value: 45000 },
                      { name: 'Enterprise', value: 80000 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  >
                    {(revenueByPlanData.length > 0 ? revenueByPlanData : [
                      { name: 'Starter', value: 15000 },
                      { name: 'Professional', value: 45000 },
                      { name: 'Enterprise', value: 80000 },
                    ]).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Growth Tab */}
      {activeTab === 'growth' && (
        <div className="space-y-6">
          {/* Growth KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Tenants</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{growth?.totalTenants || 0}</p>
              <p className="text-sm text-green-600 mt-1">
                +{growth?.newThisMonth || 0} this month
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Active Tenants</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{growth?.activeTenants || 0}</p>
              <p className="text-sm text-gray-500 mt-1">
                {growth?.totalTenants
                  ? Math.round((growth.activeTenants / growth.totalTenants) * 100)
                  : 0}
                % of total
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Trial Tenants</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{growth?.trialTenants || 0}</p>
              <p className="text-sm text-yellow-600 mt-1">Conversion: {revenue?.conversionRate || 0}%</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Growth Rate</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{growth?.growthRate || 0}%</p>
              <p className="text-sm text-gray-500 mt-1">vs last month</p>
            </div>
          </div>

          {/* Growth Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Signups</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={growth?.dailySignups || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Signup Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="signups"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Usage Tab */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">2,847</p>
              <p className="text-sm text-gray-500 mt-1">Across all tenants</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">API Requests Today</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">145,892</p>
              <p className="text-sm text-green-600 mt-1">+12% vs yesterday</p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <p className="text-sm text-gray-500">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">128 GB</p>
              <p className="text-sm text-gray-500 mt-1">of 500 GB capacity</p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Usage</h3>
            <div className="space-y-4">
              {[
                { name: 'Employee Management', usage: 95 },
                { name: 'Leave Management', usage: 88 },
                { name: 'Attendance', usage: 75 },
                { name: 'Payroll', usage: 62 },
                { name: 'Performance Reviews', usage: 45 },
                { name: 'Recruitment', usage: 38 },
              ].map((feature) => (
                <div key={feature.name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{feature.name}</span>
                    <span className="text-gray-500">{feature.usage}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${feature.usage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformAnalytics;
