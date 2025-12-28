import React, { useEffect, useState } from 'react';
import {
  HiCog,
  HiSave,
  HiRefresh,
  HiShieldCheck,
  HiMail,
  HiGlobe,
  HiCreditCard,
  HiExclamationCircle,
  HiCheckCircle,
  HiPlus,
  HiX,
  HiPencil,
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface PlanConfig {
  name: string;
  displayName: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  maxEmployees: number;
  maxAdmins: number;
  features: string[];
  isActive: boolean;
}

interface AvailableFeature {
  id: string;
  name: string;
  description: string;
}

interface SystemSettingsData {
  platformName: string;
  platformLogo?: string;
  supportEmail: string;
  supportPhone?: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowNewRegistrations: boolean;
  defaultTrialDays: number;
  requireEmailVerification: boolean;
  plans: PlanConfig[];
  securitySettings: {
    passwordMinLength: number;
    passwordRequireUppercase: boolean;
    passwordRequireNumber: boolean;
    passwordRequireSpecial: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    require2FA: boolean;
  };
  billingSettings: {
    currency: string;
    taxRate: number;
    invoicePrefix: string;
    paymentGateway: string;
  };
}

interface EditingPlanData {
  monthlyPrice: number;
  yearlyPrice: number;
  maxEmployees: number;
  maxAdmins: number;
}

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettingsData | null>(null);
  const [availableFeatures, setAvailableFeatures] = useState<AvailableFeature[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'plans' | 'security' | 'billing'>('general');
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingPlanData, setEditingPlanData] = useState<EditingPlanData | null>(null);
  const [savingPlan, setSavingPlan] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [selectedPlanForFeatures, setSelectedPlanForFeatures] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchAvailableFeatures();
  }, []);

  const getToken = () => localStorage.getItem('superAdminAccessToken');

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await api.get('/tenants/admin/settings', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (response.data.success && response.data.data) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableFeatures = async () => {
    try {
      const response = await api.get('/tenants/admin/features', {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (response.data.success) {
        setAvailableFeatures(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch features:', error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setIsSaving(true);

    try {
      await api.put('/tenants/admin/settings', settings, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditingPlan = (plan: PlanConfig) => {
    setEditingPlan(plan.name);
    setEditingPlanData({
      monthlyPrice: plan.price.monthly,
      yearlyPrice: plan.price.yearly,
      maxEmployees: plan.maxEmployees,
      maxAdmins: plan.maxAdmins,
    });
  };

  const cancelEditingPlan = () => {
    setEditingPlan(null);
    setEditingPlanData(null);
  };

  const handleUpdatePlan = async (planName: string, updates: Partial<PlanConfig>) => {
    setSavingPlan(true);
    try {
      const response = await api.put(`/tenants/admin/plans/${planName}`, updates, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (response.data.success) {
        toast.success('Plan updated successfully');
        await fetchSettings();
        setEditingPlan(null);
        setEditingPlanData(null);
      }
    } catch (error) {
      console.error('Failed to update plan:', error);
      toast.error('Failed to update plan');
    } finally {
      setSavingPlan(false);
    }
  };

  const savePlanChanges = async (plan: PlanConfig) => {
    if (!editingPlanData) return;

    await handleUpdatePlan(plan.name, {
      price: {
        monthly: editingPlanData.monthlyPrice,
        yearly: editingPlanData.yearlyPrice,
        currency: plan.price.currency,
      },
      maxEmployees: editingPlanData.maxEmployees,
      maxAdmins: editingPlanData.maxAdmins,
    });
  };

  const handleAddFeature = async (planName: string, feature: string) => {
    try {
      const response = await api.post(`/tenants/admin/plans/${planName}/features`,
        { feature },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (response.data.success) {
        toast.success('Feature added');
        fetchSettings();
      }
    } catch (error) {
      console.error('Failed to add feature:', error);
      toast.error('Failed to add feature');
    }
  };

  const handleRemoveFeature = async (planName: string, feature: string) => {
    try {
      const response = await api.delete(
        `/tenants/admin/plans/${planName}/features?feature=${encodeURIComponent(feature)}`,
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );

      if (response.data.success) {
        toast.success('Feature removed');
        fetchSettings();
      }
    } catch (error) {
      console.error('Failed to remove feature:', error);
      toast.error('Failed to remove feature');
    }
  };

  const toggleMaintenanceMode = async () => {
    if (!settings) return;
    const newValue = !settings.maintenanceMode;

    try {
      await api.post(
        '/tenants/admin/maintenance',
        { enabled: newValue, message: settings.maintenanceMessage },
        { headers: { Authorization: `Bearer ${getToken()}` } }
      );
      setSettings({ ...settings, maintenanceMode: newValue });
      toast.success(`Maintenance mode ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
      toast.error('Failed to toggle maintenance mode');
    }
  };

  const getFeatureName = (featureId: string) => {
    const feature = availableFeatures.find(f => f.id === featureId);
    return feature?.name || featureId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading || !settings) {
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
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500 mt-1">Configure platform-wide settings and subscription plans</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchSettings}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <HiRefresh className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            <HiSave className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Maintenance Mode Banner */}
      {settings.maintenanceMode && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HiExclamationCircle className="w-6 h-6 text-yellow-600" />
            <div>
              <p className="font-medium text-yellow-800">Maintenance Mode is Active</p>
              <p className="text-sm text-yellow-600">Users cannot access the platform</p>
            </div>
          </div>
          <button
            onClick={toggleMaintenanceMode}
            className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700"
          >
            Disable Maintenance
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'general', label: 'General', icon: HiGlobe },
            { id: 'plans', label: 'Subscription Plans', icon: HiCreditCard },
            { id: 'security', label: 'Security', icon: HiShieldCheck },
            { id: 'billing', label: 'Billing', icon: HiCreditCard },
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

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform Name</label>
              <input
                type="text"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Support Phone</label>
              <input
                type="tel"
                value={settings.supportPhone || ''}
                onChange={(e) => setSettings({ ...settings, supportPhone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Default Trial Days</label>
              <input
                type="number"
                value={settings.defaultTrialDays}
                onChange={(e) => setSettings({ ...settings, defaultTrialDays: parseInt(e.target.value) || 14 })}
                min={1}
                max={90}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Allow New Registrations</p>
                <p className="text-sm text-gray-500">Allow new organizations to sign up</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, allowNewRegistrations: !settings.allowNewRegistrations })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.allowNewRegistrations ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.allowNewRegistrations ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Require Email Verification</p>
                <p className="text-sm text-gray-500">Users must verify email before access</p>
              </div>
              <button
                onClick={() => setSettings({ ...settings, requireEmailVerification: !settings.requireEmailVerification })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.requireEmailVerification ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.requireEmailVerification ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">Maintenance Mode</p>
                <p className="text-sm text-gray-500">Temporarily disable platform access</p>
              </div>
              <button
                onClick={toggleMaintenanceMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.maintenanceMode ? 'bg-yellow-500' : 'bg-gray-200'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            {settings.maintenanceMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Message</label>
                <textarea
                  value={settings.maintenanceMessage}
                  onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans Tab - Enhanced with Feature Management */}
      {activeTab === 'plans' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">Subscription Plans</h2>
              <p className="text-sm text-gray-500">Click on a plan to edit features</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {settings.plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`border-2 rounded-xl p-5 transition-all ${
                    plan.isActive
                      ? 'border-purple-200 bg-gradient-to-b from-purple-50 to-white'
                      : 'border-gray-200 bg-gray-50 opacity-60'
                  } ${editingPlan === plan.name ? 'ring-2 ring-purple-500' : ''}`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-gray-900">{plan.displayName}</h3>
                    <div className="flex items-center gap-2">
                      {editingPlan !== plan.name && (
                        <button
                          onClick={() => startEditingPlan(plan)}
                          className="p-1.5 text-gray-400 hover:text-purple-600 rounded"
                          title="Edit plan"
                        >
                          <HiPencil className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleUpdatePlan(plan.name, { isActive: !plan.isActive })}
                        className={`p-1.5 rounded ${plan.isActive ? 'text-green-600' : 'text-gray-400'}`}
                        title={plan.isActive ? 'Plan is active' : 'Plan is inactive'}
                      >
                        <HiCheckCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-gray-900">
                        ${plan.price.monthly}
                      </span>
                      <span className="text-gray-500">/mo</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      ${plan.price.yearly}/year {plan.price.monthly > 0 && `(save ${Math.round((1 - plan.price.yearly / (plan.price.monthly * 12)) * 100)}%)`}
                    </p>
                  </div>

                  {editingPlan === plan.name && editingPlanData && (
                    <div className="space-y-3 mb-4 p-3 bg-white rounded-lg border border-purple-200">
                      <div>
                        <label className="text-xs font-medium text-gray-500">Monthly Price ($)</label>
                        <input
                          type="number"
                          value={editingPlanData.monthlyPrice}
                          onChange={(e) => setEditingPlanData({
                            ...editingPlanData,
                            monthlyPrice: parseFloat(e.target.value) || 0
                          })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Yearly Price ($)</label>
                        <input
                          type="number"
                          value={editingPlanData.yearlyPrice}
                          onChange={(e) => setEditingPlanData({
                            ...editingPlanData,
                            yearlyPrice: parseFloat(e.target.value) || 0
                          })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Max Employees (0 = unlimited)</label>
                        <input
                          type="number"
                          value={editingPlanData.maxEmployees}
                          onChange={(e) => setEditingPlanData({
                            ...editingPlanData,
                            maxEmployees: parseInt(e.target.value) || 0
                          })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500">Max Admins</label>
                        <input
                          type="number"
                          value={editingPlanData.maxAdmins}
                          onChange={(e) => setEditingPlanData({
                            ...editingPlanData,
                            maxAdmins: parseInt(e.target.value) || 1
                          })}
                          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm mt-1 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={cancelEditingPlan}
                          disabled={savingPlan}
                          className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => savePlanChanges(plan)}
                          disabled={savingPlan}
                          className="flex-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-1"
                        >
                          {savingPlan ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            <>
                              <HiSave className="w-4 h-4" />
                              Save
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500 uppercase">Features</span>
                      <button
                        onClick={() => {
                          setSelectedPlanForFeatures(plan.name);
                          setShowFeatureModal(true);
                        }}
                        className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
                      >
                        <HiPlus className="w-3 h-3" />
                        Add
                      </button>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {plan.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded group"
                        >
                          <span className="text-sm text-gray-700">{getFeatureName(feature)}</span>
                          <button
                            onClick={() => handleRemoveFeature(plan.name, feature)}
                            className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <HiX className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Employees</span>
                      <span className="font-medium text-gray-900">
                        {plan.maxEmployees === 0 || plan.maxEmployees >= 10000 ? 'Unlimited' : plan.maxEmployees}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-gray-500">Admins</span>
                      <span className="font-medium text-gray-900">{plan.maxAdmins}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Password Length</label>
              <input
                type="number"
                value={settings.securitySettings.passwordMinLength}
                onChange={(e) => setSettings({
                  ...settings,
                  securitySettings: { ...settings.securitySettings, passwordMinLength: parseInt(e.target.value) || 8 }
                })}
                min={6}
                max={32}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Session Timeout (minutes)</label>
              <input
                type="number"
                value={settings.securitySettings.sessionTimeout}
                onChange={(e) => setSettings({
                  ...settings,
                  securitySettings: { ...settings.securitySettings, sessionTimeout: parseInt(e.target.value) || 60 }
                })}
                min={5}
                max={1440}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Login Attempts</label>
              <input
                type="number"
                value={settings.securitySettings.maxLoginAttempts}
                onChange={(e) => setSettings({
                  ...settings,
                  securitySettings: { ...settings.securitySettings, maxLoginAttempts: parseInt(e.target.value) || 5 }
                })}
                min={3}
                max={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lockout Duration (minutes)</label>
              <input
                type="number"
                value={settings.securitySettings.lockoutDuration}
                onChange={(e) => setSettings({
                  ...settings,
                  securitySettings: { ...settings.securitySettings, lockoutDuration: parseInt(e.target.value) || 30 }
                })}
                min={5}
                max={120}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 space-y-4">
            {[
              { key: 'passwordRequireUppercase', label: 'Require Uppercase', desc: 'Password must contain uppercase letters' },
              { key: 'passwordRequireNumber', label: 'Require Numbers', desc: 'Password must contain numbers' },
              { key: 'passwordRequireSpecial', label: 'Require Special Characters', desc: 'Password must contain special characters' },
              { key: 'require2FA', label: 'Require Two-Factor Auth', desc: 'Users must enable 2FA for login' },
            ].map((item) => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{item.label}</p>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
                <button
                  onClick={() => setSettings({
                    ...settings,
                    securitySettings: {
                      ...settings.securitySettings,
                      [item.key]: !(settings.securitySettings as any)[item.key]
                    }
                  })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    (settings.securitySettings as any)[item.key] ? 'bg-purple-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    (settings.securitySettings as any)[item.key] ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={settings.billingSettings.currency}
                onChange={(e) => setSettings({
                  ...settings,
                  billingSettings: { ...settings.billingSettings, currency: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
                <option value="GBP">GBP - British Pound</option>
                <option value="INR">INR - Indian Rupee</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax Rate (%)</label>
              <input
                type="number"
                value={settings.billingSettings.taxRate}
                onChange={(e) => setSettings({
                  ...settings,
                  billingSettings: { ...settings.billingSettings, taxRate: parseFloat(e.target.value) || 0 }
                })}
                min={0}
                max={100}
                step={0.1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Prefix</label>
              <input
                type="text"
                value={settings.billingSettings.invoicePrefix}
                onChange={(e) => setSettings({
                  ...settings,
                  billingSettings: { ...settings.billingSettings, invoicePrefix: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Gateway</label>
              <select
                value={settings.billingSettings.paymentGateway}
                onChange={(e) => setSettings({
                  ...settings,
                  billingSettings: { ...settings.billingSettings, paymentGateway: e.target.value }
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="stripe">Stripe</option>
                <option value="razorpay">Razorpay</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Feature Selection Modal */}
      {showFeatureModal && selectedPlanForFeatures && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Add Features to {settings.plans.find(p => p.name === selectedPlanForFeatures)?.displayName}
              </h3>
              <button
                onClick={() => {
                  setShowFeatureModal(false);
                  setSelectedPlanForFeatures(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <HiX className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-2">
              {availableFeatures
                .filter(f => !settings.plans.find(p => p.name === selectedPlanForFeatures)?.features.includes(f.id))
                .map((feature) => (
                  <button
                    key={feature.id}
                    onClick={() => {
                      handleAddFeature(selectedPlanForFeatures, feature.id);
                    }}
                    className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-200 transition-colors text-left"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{feature.name}</p>
                      <p className="text-sm text-gray-500">{feature.description}</p>
                    </div>
                    <HiPlus className="w-5 h-5 text-purple-600" />
                  </button>
                ))}
              {availableFeatures.filter(f => !settings.plans.find(p => p.name === selectedPlanForFeatures)?.features.includes(f.id)).length === 0 && (
                <p className="text-center text-gray-500 py-4">All features are already added to this plan</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
