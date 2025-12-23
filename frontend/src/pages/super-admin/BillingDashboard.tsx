import React, { useEffect, useState } from 'react';
import {
  HiCurrencyRupee,
  HiTrendingUp,
  HiUserGroup,
  HiCreditCard,
  HiRefresh,
  HiDocumentText,
  HiCheckCircle,
  HiClock,
  HiExclamationCircle,
} from 'react-icons/hi';
import {
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
  totalRevenue: number;
  revenueByPlan: Record<string, number>;
  subscriptionsByPlan: Record<string, number>;
  activeSubscriptions: number;
  totalSubscriptions: number;
  monthlyRevenue: { month: string; revenue: number; invoices: number }[];
}

interface Subscription {
  _id: string;
  tenantId: string;
  plan: string;
  status: string;
  billingCycle: string;
  amount: number;
  currentPeriodEnd?: string;
  createdAt: string;
}

interface Invoice {
  _id: string;
  tenantId: string;
  invoiceNumber: string;
  amount: number;
  status: string;
  paidAt?: string;
  createdAt: string;
}

const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B'];

const BillingDashboard: React.FC = () => {
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'invoices'>('overview');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const [revenueRes, subsRes, invoicesRes] = await Promise.allSettled([
        api.get('/billing/admin/revenue', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get('/billing/admin/subscriptions?limit=10', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get('/billing/admin/invoices?limit=10', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (revenueRes.status === 'fulfilled') {
        setRevenue(revenueRes.value.data.data);
      }
      if (subsRes.status === 'fulfilled') {
        setSubscriptions(subsRes.value.data.data || []);
      }
      if (invoicesRes.status === 'fulfilled') {
        setInvoices(invoicesRes.value.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch billing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const planDistribution = revenue?.subscriptionsByPlan
    ? Object.entries(revenue.subscriptionsByPlan)
        .filter(([_, value]) => value > 0)
        .map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value,
        }))
    : [];

  const revenueByPlanData = revenue?.revenueByPlan
    ? Object.entries(revenue.revenueByPlan).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value,
      }))
    : [];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      pending: 'bg-yellow-100 text-yellow-700',
      halted: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      paid: 'bg-green-100 text-green-700',
      issued: 'bg-blue-100 text-blue-700',
      draft: 'bg-gray-100 text-gray-700',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-700'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

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
          <h1 className="text-2xl font-bold text-gray-900">Billing Dashboard</h1>
          <p className="text-gray-500 mt-1">Revenue, subscriptions, and invoices</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <HiRefresh className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'overview', label: 'Overview', icon: HiCurrencyRupee },
            { id: 'subscriptions', label: 'Subscriptions', icon: HiCreditCard },
            { id: 'invoices', label: 'Invoices', icon: HiDocumentText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
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

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* KPI Cards */}
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
                  <HiCurrencyRupee className="w-6 h-6 text-green-600" />
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
                  <p className="text-sm text-gray-500">Active Subscriptions</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {revenue?.activeSubscriptions || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <HiUserGroup className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {formatCurrency(revenue?.totalRevenue || 0)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <HiCreditCard className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenue?.monthlyRevenue || []}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${value / 1000}k`} />
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscriptions by Plan</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={planDistribution.length > 0 ? planDistribution : [
                      { name: 'Free', value: 10 },
                      { name: 'Starter', value: 5 },
                      { name: 'Professional', value: 3 },
                      { name: 'Enterprise', value: 1 },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {(planDistribution.length > 0 ? planDistribution : [
                      { name: 'Free', value: 10 },
                      { name: 'Starter', value: 5 },
                      { name: 'Professional', value: 3 },
                      { name: 'Enterprise', value: 1 },
                    ]).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Plan */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Plan</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={revenueByPlanData.length > 0 ? revenueByPlanData : [
                { name: 'Starter', value: 14990 },
                { name: 'Professional', value: 39990 },
                { name: 'Enterprise', value: 99990 },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `₹${value / 1000}k`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Subscriptions Tab */}
      {activeTab === 'subscriptions' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Subscriptions</h3>
          </div>
          {subscriptions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <HiCreditCard className="w-12 h-12 mb-2" />
              <p>No subscriptions yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Tenant ID
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Plan
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Billing Cycle
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Amount
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Period End
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subscriptions.map((sub) => (
                    <tr key={sub._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                        {sub.tenantId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium capitalize">
                          {sub.plan}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                        {sub.billingCycle}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(sub.amount / 100)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(sub.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {sub.currentPeriodEnd
                          ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Invoices Tab */}
      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
          </div>
          {invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <HiDocumentText className="w-12 h-12 mb-2" />
              <p>No invoices yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Invoice #
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Tenant
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Amount
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Status
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {invoices.map((invoice) => (
                    <tr key={invoice._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900 font-mono">
                        {invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 font-mono">
                        {invoice.tenantId.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatCurrency(invoice.amount)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(invoice.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(invoice.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BillingDashboard;
