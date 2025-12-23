import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  HiArrowLeft,
  HiPencil,
  HiOfficeBuilding,
  HiMail,
  HiGlobe,
  HiCalendar,
  HiUserGroup,
  HiCreditCard,
  HiCheckCircle,
  HiClock,
  HiBan,
  HiTrash,
  HiRefresh,
  HiChartBar,
  HiCog,
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface TenantDetail {
  _id: string;
  name: string;
  slug: string;
  domain?: string;
  status: 'active' | 'trial' | 'suspended' | 'cancelled';
  subscription: {
    plan: string;
    startDate: string;
    endDate: string;
    trialEndsAt?: string;
  };
  settings: {
    employeeLimit: number;
    timezone: string;
    dateFormat: string;
    currency: string;
    language: string;
    allowedModules: string[];
  };
  branding?: {
    primaryColor: string;
    logo?: string;
  };
  owner?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface TenantStats {
  totalEmployees: number;
  activeUsers: number;
  departments: number;
  storage: number;
}

const TenantDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [showExtendTrialModal, setShowExtendTrialModal] = useState(false);
  const [trialDays, setTrialDays] = useState(14);

  useEffect(() => {
    if (id) {
      fetchTenantDetails();
    }
  }, [id]);

  const fetchTenantDetails = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const response = await api.get(`/tenants/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setTenant(response.data.data);
        setSelectedPlan(response.data.data.subscription?.plan || 'free');
        // Mock stats for now - in production, this would be a separate API call
        setStats({
          totalEmployees: Math.floor(Math.random() * 50) + 5,
          activeUsers: Math.floor(Math.random() * 30) + 5,
          departments: Math.floor(Math.random() * 10) + 2,
          storage: Math.floor(Math.random() * 5000) + 100,
        });
      }
    } catch (error) {
      console.error('Failed to fetch tenant:', error);
      toast.error('Failed to fetch tenant details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      await api.put(
        `/tenants/admin/${id}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Tenant status updated to ${newStatus}`);
      fetchTenantDetails();
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update tenant status');
    }
  };

  const handlePlanChange = async () => {
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      await api.put(
        `/tenants/current/subscription`,
        { plan: selectedPlan },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-tenant-id': id,
          },
        }
      );
      toast.success(`Plan updated to ${selectedPlan}`);
      setShowPlanModal(false);
      fetchTenantDetails();
    } catch (error) {
      console.error('Failed to update plan:', error);
      toast.error('Failed to update plan');
    }
  };

  const handleExtendTrial = async () => {
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      await api.put(
        `/tenants/admin/${id}/extend-trial`,
        { days: trialDays },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Trial extended by ${trialDays} days`);
      setShowExtendTrialModal(false);
      fetchTenantDetails();
    } catch (error) {
      console.error('Failed to extend trial:', error);
      toast.error('Failed to extend trial');
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete "${tenant?.name}"? This action cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem('superAdminAccessToken');

    try {
      await api.delete(`/tenants/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Tenant deleted successfully');
      navigate('/super-admin/tenants');
    } catch (error) {
      console.error('Failed to delete tenant:', error);
      toast.error('Failed to delete tenant');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      active: 'bg-green-100 text-green-700 border-green-200',
      trial: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      suspended: 'bg-red-100 text-red-700 border-red-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
    };

    const icons = {
      active: <HiCheckCircle className="w-4 h-4" />,
      trial: <HiClock className="w-4 h-4" />,
      suspended: <HiBan className="w-4 h-4" />,
      cancelled: <HiBan className="w-4 h-4" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {icons[status as keyof typeof icons]}
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

  if (!tenant) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Tenant not found</p>
        <Link to="/super-admin/tenants" className="text-purple-600 hover:underline mt-2 inline-block">
          Back to Tenants
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/super-admin/tenants')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <HiArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{tenant.name}</h1>
            <p className="text-gray-500">{tenant.slug}</p>
          </div>
          {getStatusBadge(tenant.status)}
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchTenantDetails}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <HiRefresh className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setShowPlanModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <HiCreditCard className="w-4 h-4" />
            Change Plan
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <HiUserGroup className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Employees</p>
              <p className="text-xl font-bold text-gray-900">{stats?.totalEmployees || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <HiCheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Users</p>
              <p className="text-xl font-bold text-gray-900">{stats?.activeUsers || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <HiOfficeBuilding className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Departments</p>
              <p className="text-xl font-bold text-gray-900">{stats?.departments || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <HiChartBar className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Storage Used</p>
              <p className="text-xl font-bold text-gray-900">{stats?.storage || 0} MB</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Organization Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Organization Details</h2>
              <button className="text-purple-600 hover:text-purple-700">
                <HiPencil className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <HiOfficeBuilding className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Organization Name</p>
                  <p className="font-medium text-gray-900">{tenant.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HiGlobe className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Slug</p>
                  <p className="font-medium text-gray-900">{tenant.slug}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HiGlobe className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Domain</p>
                  <p className="font-medium text-gray-900">{tenant.domain || 'Not configured'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <HiCalendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Created</p>
                  <p className="font-medium text-gray-900">
                    {new Date(tenant.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Subscription</h2>
              <button
                onClick={() => setShowPlanModal(true)}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                Change Plan
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
                  <HiCreditCard className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 capitalize">
                    {tenant.subscription?.plan || 'Free'} Plan
                  </p>
                  <p className="text-gray-500">
                    {tenant.status === 'trial' && tenant.subscription?.trialEndsAt
                      ? `Trial ends ${new Date(tenant.subscription.trialEndsAt).toLocaleDateString()}`
                      : 'Active subscription'}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Start Date</p>
                  <p className="font-medium text-gray-900">
                    {tenant.subscription?.startDate
                      ? new Date(tenant.subscription.startDate).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Employee Limit</p>
                  <p className="font-medium text-gray-900">
                    {tenant.settings?.employeeLimit || 'Unlimited'}
                  </p>
                </div>
              </div>
              {tenant.status === 'trial' && (
                <button
                  onClick={() => setShowExtendTrialModal(true)}
                  className="mt-4 w-full py-2 border border-purple-200 text-purple-600 rounded-lg hover:bg-purple-50 font-medium"
                >
                  Extend Trial Period
                </button>
              )}
            </div>
          </div>

          {/* Settings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
              <HiCog className="w-5 h-5 text-gray-400" />
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500">Timezone</p>
                <p className="font-medium text-gray-900">{tenant.settings?.timezone || 'UTC'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Currency</p>
                <p className="font-medium text-gray-900">{tenant.settings?.currency || 'USD'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date Format</p>
                <p className="font-medium text-gray-900">{tenant.settings?.dateFormat || 'MM/DD/YYYY'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Language</p>
                <p className="font-medium text-gray-900">{tenant.settings?.language || 'English'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Owner Info */}
          {tenant.owner && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Owner</h2>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-bold">
                      {tenant.owner.firstName?.[0]}
                      {tenant.owner.lastName?.[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {tenant.owner.firstName} {tenant.owner.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{tenant.owner.email}</p>
                  </div>
                </div>
                <button className="w-full py-2 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">
                  Login as Owner
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-4 space-y-2">
              {tenant.status === 'suspended' ? (
                <button
                  onClick={() => handleStatusChange('active')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-green-600 hover:bg-green-50 rounded-lg"
                >
                  <HiCheckCircle className="w-5 h-5" />
                  Activate Tenant
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange('suspended')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                >
                  <HiBan className="w-5 h-5" />
                  Suspend Tenant
                </button>
              )}
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg"
              >
                <HiTrash className="w-5 h-5" />
                Delete Tenant
              </button>
            </div>
          </div>

          {/* Allowed Modules */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Enabled Modules</h2>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {(tenant.settings?.allowedModules || ['employees', 'leave', 'attendance']).map(
                  (module) => (
                    <span
                      key={module}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {module}
                    </span>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Change Plan Modal */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Change Subscription Plan</h2>
            </div>
            <div className="p-6 space-y-4">
              {['free', 'starter', 'professional', 'enterprise'].map((plan) => (
                <label
                  key={plan}
                  className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer ${
                    selectedPlan === plan ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan"
                    value={plan}
                    checked={selectedPlan === plan}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="text-purple-600"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 capitalize">{plan}</p>
                    <p className="text-sm text-gray-500">
                      {plan === 'free' && 'Up to 10 employees'}
                      {plan === 'starter' && 'Up to 50 employees - $29/mo'}
                      {plan === 'professional' && 'Up to 200 employees - $79/mo'}
                      {plan === 'enterprise' && 'Unlimited employees - $199/mo'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowPlanModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handlePlanChange}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
              >
                Update Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extend Trial Modal */}
      {showExtendTrialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Extend Trial Period</h2>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Number of days to extend
              </label>
              <input
                type="number"
                value={trialDays}
                onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                min={1}
                max={90}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-sm text-gray-500 mt-2">Maximum 90 days extension</p>
            </div>
            <div className="flex gap-3 p-6 border-t border-gray-100">
              <button
                onClick={() => setShowExtendTrialModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendTrial}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
              >
                Extend Trial
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TenantDetails;
