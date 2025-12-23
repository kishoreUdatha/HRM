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
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface SystemSettingsData {
  platformName: string;
  platformUrl: string;
  supportEmail: string;
  maintenanceMode: boolean;
  maintenanceMessage: string;
  allowNewRegistrations: boolean;
  defaultTrialDays: number;
  plans: {
    name: string;
    price: number;
    employeeLimit: number;
    features: string[];
    isActive: boolean;
  }[];
  security: {
    passwordMinLength: number;
    requireSpecialChars: boolean;
    sessionTimeoutMinutes: number;
    maxLoginAttempts: number;
  };
  billing: {
    currency: string;
    taxRate: number;
    gracePeriodDays: number;
  };
}

const defaultSettings: SystemSettingsData = {
  platformName: 'HRM Platform',
  platformUrl: 'https://hrm-platform.com',
  supportEmail: 'support@hrm-platform.com',
  maintenanceMode: false,
  maintenanceMessage: 'We are currently performing scheduled maintenance. Please try again later.',
  allowNewRegistrations: true,
  defaultTrialDays: 14,
  plans: [
    { name: 'free', price: 0, employeeLimit: 10, features: ['Basic HR', 'Leave Management'], isActive: true },
    { name: 'starter', price: 29, employeeLimit: 50, features: ['All Free features', 'Payroll', 'Attendance'], isActive: true },
    { name: 'professional', price: 79, employeeLimit: 200, features: ['All Starter features', 'Performance', 'Recruitment'], isActive: true },
    { name: 'enterprise', price: 199, employeeLimit: 0, features: ['All features', 'Custom integrations', 'Dedicated support'], isActive: true },
  ],
  security: {
    passwordMinLength: 8,
    requireSpecialChars: true,
    sessionTimeoutMinutes: 60,
    maxLoginAttempts: 5,
  },
  billing: {
    currency: 'USD',
    taxRate: 0,
    gracePeriodDays: 7,
  },
};

const SystemSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'plans' | 'security' | 'billing'>('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const response = await api.get('/tenants/admin/settings', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success && response.data.data) {
        setSettings({ ...defaultSettings, ...response.data.data });
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      await api.put('/tenants/admin/settings', settings, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleMaintenanceMode = async () => {
    const token = localStorage.getItem('superAdminAccessToken');
    const newValue = !settings.maintenanceMode;

    try {
      await api.post(
        '/tenants/admin/maintenance',
        { enabled: newValue, message: settings.maintenanceMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSettings({ ...settings, maintenanceMode: newValue });
      toast.success(`Maintenance mode ${newValue ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Failed to toggle maintenance mode:', error);
      toast.error('Failed to toggle maintenance mode');
    }
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
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-500 mt-1">Configure platform-wide settings</p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform URL</label>
              <input
                type="url"
                value={settings.platformUrl}
                onChange={(e) => setSettings({ ...settings, platformUrl: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Trial Days
              </label>
              <input
                type="number"
                value={settings.defaultTrialDays}
                onChange={(e) =>
                  setSettings({ ...settings, defaultTrialDays: parseInt(e.target.value) || 14 })
                }
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
                onClick={() =>
                  setSettings({ ...settings, allowNewRegistrations: !settings.allowNewRegistrations })
                }
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.allowNewRegistrations ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.allowNewRegistrations ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
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
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {settings.maintenanceMode && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maintenance Message
                </label>
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

      {/* Plans Tab */}
      {activeTab === 'plans' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {settings.plans.map((plan, index) => (
              <div
                key={plan.name}
                className={`border rounded-lg p-4 ${
                  plan.isActive ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 capitalize">{plan.name}</h3>
                  <button
                    onClick={() => {
                      const newPlans = [...settings.plans];
                      newPlans[index].isActive = !newPlans[index].isActive;
                      setSettings({ ...settings, plans: newPlans });
                    }}
                    className={`p-1 rounded ${
                      plan.isActive ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    <HiCheckCircle className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs text-gray-500">Price ($/month)</label>
                    <input
                      type="number"
                      value={plan.price}
                      onChange={(e) => {
                        const newPlans = [...settings.plans];
                        newPlans[index].price = parseInt(e.target.value) || 0;
                        setSettings({ ...settings, plans: newPlans });
                      }}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Employee Limit (0 = unlimited)</label>
                    <input
                      type="number"
                      value={plan.employeeLimit}
                      onChange={(e) => {
                        const newPlans = [...settings.plans];
                        newPlans[index].employeeLimit = parseInt(e.target.value) || 0;
                        setSettings({ ...settings, plans: newPlans });
                      }}
                      className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Features</label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {plan.features.map((feature, fi) => (
                        <span
                          key={fi}
                          className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Password Length
              </label>
              <input
                type="number"
                value={settings.security.passwordMinLength}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      passwordMinLength: parseInt(e.target.value) || 8,
                    },
                  })
                }
                min={6}
                max={32}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={settings.security.sessionTimeoutMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      sessionTimeoutMinutes: parseInt(e.target.value) || 60,
                    },
                  })
                }
                min={5}
                max={1440}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Login Attempts
              </label>
              <input
                type="number"
                value={settings.security.maxLoginAttempts}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: {
                      ...settings.security,
                      maxLoginAttempts: parseInt(e.target.value) || 5,
                    },
                  })
                }
                min={3}
                max={10}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-6">
            <div>
              <p className="font-medium text-gray-900">Require Special Characters</p>
              <p className="text-sm text-gray-500">Password must contain special characters</p>
            </div>
            <button
              onClick={() =>
                setSettings({
                  ...settings,
                  security: {
                    ...settings.security,
                    requireSpecialChars: !settings.security.requireSpecialChars,
                  },
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                settings.security.requireSpecialChars ? 'bg-purple-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.security.requireSpecialChars ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
              <select
                value={settings.billing.currency}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    billing: { ...settings.billing, currency: e.target.value },
                  })
                }
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
                value={settings.billing.taxRate}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    billing: {
                      ...settings.billing,
                      taxRate: parseFloat(e.target.value) || 0,
                    },
                  })
                }
                min={0}
                max={100}
                step={0.1}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grace Period (days)
              </label>
              <input
                type="number"
                value={settings.billing.gracePeriodDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    billing: {
                      ...settings.billing,
                      gracePeriodDays: parseInt(e.target.value) || 7,
                    },
                  })
                }
                min={0}
                max={30}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
              <p className="text-xs text-gray-500 mt-1">Days before suspension after failed payment</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
