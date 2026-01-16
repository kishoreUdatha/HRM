import React, { useEffect, useState } from 'react';
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiRefresh,
  HiCurrencyRupee,
  HiUserGroup,
  HiCheck,
  HiX,
  HiEye,
  HiEyeOff,
  HiSave,
} from 'react-icons/hi';
import api from '../../services/api';

interface Plan {
  _id?: string;
  planCode: string;
  displayName: string;
  description: string;
  pricing: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  limits: {
    maxEmployees: number;
    maxAdmins: number;
    maxStorage: number;
    maxApiCalls: number;
  };
  features: string[];
  isActive: boolean;
  isVisible: boolean;
  sortOrder: number;
  trialDays?: number;
}

const FEATURE_OPTIONS = [
  { code: 'employees', label: 'Employee Management' },
  { code: 'attendance', label: 'Attendance Tracking' },
  { code: 'basic_leaves', label: 'Basic Leave Management' },
  { code: 'leaves', label: 'Advanced Leave Management' },
  { code: 'basic_payroll', label: 'Basic Payroll' },
  { code: 'payroll', label: 'Full Payroll Management' },
  { code: 'recruitment', label: 'Recruitment Module' },
  { code: 'reports', label: 'Reports & Analytics' },
  { code: 'analytics', label: 'Advanced Analytics' },
  { code: 'api_access', label: 'API Access' },
  { code: 'email_support', label: 'Email Support' },
  { code: 'priority_support', label: 'Priority Support' },
  { code: 'dedicated_support', label: 'Dedicated Support' },
  { code: 'custom_integrations', label: 'Custom Integrations' },
  { code: 'sso', label: 'Single Sign-On (SSO)' },
  { code: 'audit_logs', label: 'Audit Logs' },
  { code: 'sla', label: 'SLA Guarantee' },
  { code: 'white_label', label: 'White Label' },
];

const emptyPlan: Plan = {
  planCode: '',
  displayName: '',
  description: '',
  pricing: { monthly: 0, yearly: 0, currency: 'INR' },
  limits: { maxEmployees: 10, maxAdmins: 1, maxStorage: 1024, maxApiCalls: 10000 },
  features: [],
  isActive: true,
  isVisible: true,
  sortOrder: 1,
};

const PlanManagement: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<Plan>(emptyPlan);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('superAdminAccessToken');
    try {
      const response = await api.get('/billing/admin/plans?includeInactive=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.success) {
        setPlans(response.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amountInPaise: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amountInPaise / 100);
  };

  const handleAdd = () => {
    setEditingPlan(null);
    setFormData({ ...emptyPlan, sortOrder: plans.length + 1 });
    setError('');
    setIsModalOpen(true);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({ ...plan });
    setError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (planCode: string) => {
    if (!confirm('Are you sure you want to deactivate this plan?')) return;

    const token = localStorage.getItem('superAdminAccessToken');
    try {
      await api.delete(`/billing/admin/plans/${planCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchPlans();
    } catch (err) {
      console.error('Failed to delete plan:', err);
    }
  };

  const handleSave = async () => {
    if (!formData.planCode || !formData.displayName) {
      setError('Plan code and display name are required');
      return;
    }

    setIsSaving(true);
    setError('');
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      if (editingPlan) {
        await api.put(`/billing/admin/plans/${editingPlan.planCode}`, formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await api.post('/billing/admin/plans', formData, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleFeature = (featureCode: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(featureCode)
        ? prev.features.filter((f) => f !== featureCode)
        : [...prev.features, featureCode],
    }));
  };

  const getFeatureLabel = (code: string) => {
    return FEATURE_OPTIONS.find((f) => f.code === code)?.label || code;
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
          <h1 className="text-2xl font-bold text-gray-900">Plan Management</h1>
          <p className="text-gray-500 mt-1">Manage subscription plans and pricing</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchPlans}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <HiRefresh className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <HiPlus className="w-4 h-4" />
            Add Plan
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <div
            key={plan.planCode}
            className={`bg-white rounded-xl border-2 shadow-sm overflow-hidden ${
              !plan.isActive ? 'opacity-60 border-gray-200' : 'border-purple-100'
            }`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{plan.displayName}</h3>
                  <p className="text-sm text-gray-500">Code: {plan.planCode}</p>
                </div>
                <div className="flex gap-1">
                  {plan.isVisible ? (
                    <span className="p-1 text-green-600" title="Visible">
                      <HiEye className="w-4 h-4" />
                    </span>
                  ) : (
                    <span className="p-1 text-gray-400" title="Hidden">
                      <HiEyeOff className="w-4 h-4" />
                    </span>
                  )}
                  {plan.isActive ? (
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Active</span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">Inactive</span>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-600 mb-4">{plan.description}</p>

              {/* Pricing */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 mb-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-purple-600">
                    {formatCurrency(plan.pricing.monthly)}
                  </span>
                  <span className="text-gray-500">/month</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  or {formatCurrency(plan.pricing.yearly)}/year
                </p>
              </div>

              {/* Limits */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <HiUserGroup className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">
                    {plan.limits.maxEmployees === -1 ? 'Unlimited' : plan.limits.maxEmployees} employees
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <HiUserGroup className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{plan.limits.maxAdmins} admins</span>
                </div>
              </div>

              {/* Features */}
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Features</p>
                <div className="flex flex-wrap gap-1">
                  {plan.features.slice(0, 5).map((feature) => (
                    <span
                      key={feature}
                      className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                    >
                      {getFeatureLabel(feature)}
                    </span>
                  ))}
                  {plan.features.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      +{plan.features.length - 5} more
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <button
                  onClick={() => handleEdit(plan)}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <HiPencil className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(plan.planCode)}
                  className="inline-flex items-center justify-center gap-2 px-3 py-2 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <HiTrash className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center">
          <HiCurrencyRupee className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Plans Found</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first subscription plan.</p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
          >
            <HiPlus className="w-4 h-4" />
            Create Plan
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <HiX className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plan Code *
                  </label>
                  <input
                    type="text"
                    value={formData.planCode}
                    onChange={(e) => setFormData({ ...formData, planCode: e.target.value.toLowerCase() })}
                    disabled={!!editingPlan}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100"
                    placeholder="e.g., starter"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Starter Plan"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Brief description of the plan"
                />
              </div>

              {/* Pricing */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Pricing (in Rupees)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Monthly Price (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="number"
                        value={formData.pricing.monthly / 100}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pricing: { ...formData.pricing, monthly: Math.round(parseFloat(e.target.value || '0') * 100) },
                          })
                        }
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Yearly Price (₹)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="number"
                        value={formData.pricing.yearly / 100}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            pricing: { ...formData.pricing, yearly: Math.round(parseFloat(e.target.value || '0') * 100) },
                          })
                        }
                        className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Limits */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Limits (-1 for unlimited)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Employees</label>
                    <input
                      type="number"
                      value={formData.limits.maxEmployees}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxEmployees: parseInt(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Admins</label>
                    <input
                      type="number"
                      value={formData.limits.maxAdmins}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxAdmins: parseInt(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Storage (MB)</label>
                    <input
                      type="number"
                      value={formData.limits.maxStorage}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxStorage: parseInt(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max API Calls/month</label>
                    <input
                      type="number"
                      value={formData.limits.maxApiCalls}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          limits: { ...formData.limits, maxApiCalls: parseInt(e.target.value) || 0 },
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Features */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Features</h3>
                <div className="grid grid-cols-2 gap-2">
                  {FEATURE_OPTIONS.map((feature) => (
                    <label
                      key={feature.code}
                      className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formData.features.includes(feature.code)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={formData.features.includes(feature.code)}
                        onChange={() => toggleFeature(feature.code)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center ${
                          formData.features.includes(feature.code)
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200'
                        }`}
                      >
                        {formData.features.includes(feature.code) && <HiCheck className="w-3 h-3" />}
                      </div>
                      <span className="text-sm text-gray-700">{feature.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isVisible}
                    onChange={(e) => setFormData({ ...formData, isVisible: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">Visible on pricing page</span>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 1 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Trial Days</label>
                  <input
                    type="number"
                    value={formData.trialDays || 0}
                    onChange={(e) => setFormData({ ...formData, trialDays: parseInt(e.target.value) || undefined })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiSave className="w-4 h-4" />
                )}
                {editingPlan ? 'Update Plan' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanManagement;
