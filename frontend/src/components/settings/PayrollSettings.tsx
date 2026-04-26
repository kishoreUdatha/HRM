import React, { useState, useEffect } from 'react';
import { HiClock, HiCalendar, HiCurrencyRupee, HiExclamationCircle, HiCheckCircle } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface PayrollSettingsData {
  calculationMode: 'hourly' | 'daily';
  hourlyModeSettings: {
    trackOvertimeAutomatically: boolean;
    overtimeMultiplier: number;
    requireOvertimeApproval: boolean;
    holdPayrollForPendingOvertime: boolean;
    calculateShortfall: boolean;
  };
  dailyModeSettings: {
    countHalfDays: boolean;
    halfDayThresholdHours: number;
    fullDayThresholdHours: number;
    deductForAbsence: boolean;
    deductForHalfDay: boolean;
  };
}

const PayrollSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<PayrollSettingsData>({
    calculationMode: 'daily',
    hourlyModeSettings: {
      trackOvertimeAutomatically: true,
      overtimeMultiplier: 1.5,
      requireOvertimeApproval: true,
      holdPayrollForPendingOvertime: true,
      calculateShortfall: true,
    },
    dailyModeSettings: {
      countHalfDays: true,
      halfDayThresholdHours: 4,
      fullDayThresholdHours: 8,
      deductForAbsence: true,
      deductForHalfDay: true,
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/tenants/current/payroll-settings');
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch payroll settings:', error);
      toast.error('Failed to load payroll settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await api.put('/tenants/current/payroll-settings', settings);
      if (response.data.success) {
        toast.success('Payroll settings saved successfully');
        setSettings(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save payroll settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleModeChange = (mode: 'hourly' | 'daily') => {
    setSettings({ ...settings, calculationMode: mode });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-secondary-200 rounded w-1/3"></div>
          <div className="h-4 bg-secondary-200 rounded w-2/3"></div>
          <div className="h-32 bg-secondary-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
      <h2 className="text-lg font-semibold text-secondary-900 mb-2">Payroll Calculation Settings</h2>
      <p className="text-secondary-500 text-sm mb-6">
        Configure how salaries are calculated for your employees. Choose between hourly-based or daily-based calculation modes.
      </p>

      {/* Calculation Mode Selection */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-secondary-700 mb-3">
          Calculation Mode
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Hourly Mode Card */}
          <div
            onClick={() => handleModeChange('hourly')}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
              settings.calculationMode === 'hourly'
                ? 'border-primary-500 bg-primary-50'
                : 'border-secondary-200 hover:border-secondary-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                settings.calculationMode === 'hourly' ? 'bg-primary-100' : 'bg-secondary-100'
              }`}>
                <HiClock className={`w-6 h-6 ${
                  settings.calculationMode === 'hourly' ? 'text-primary-600' : 'text-secondary-500'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-secondary-900">Hourly Mode</h3>
                  {settings.calculationMode === 'hourly' && (
                    <HiCheckCircle className="w-5 h-5 text-primary-600" />
                  )}
                </div>
                <p className="text-sm text-secondary-500 mt-1">
                  Calculate salary based on actual hours worked. Tracks overtime, shortfall, and requires approval for extra hours.
                </p>
                <ul className="mt-2 text-xs text-secondary-500 space-y-1">
                  <li>• Automatic overtime detection</li>
                  <li>• Shortfall deductions</li>
                  <li>• Payroll hold for pending approvals</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Daily Mode Card */}
          <div
            onClick={() => handleModeChange('daily')}
            className={`cursor-pointer p-4 rounded-xl border-2 transition-all ${
              settings.calculationMode === 'daily'
                ? 'border-primary-500 bg-primary-50'
                : 'border-secondary-200 hover:border-secondary-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${
                settings.calculationMode === 'daily' ? 'bg-primary-100' : 'bg-secondary-100'
              }`}>
                <HiCalendar className={`w-6 h-6 ${
                  settings.calculationMode === 'daily' ? 'text-primary-600' : 'text-secondary-500'
                }`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-secondary-900">Daily Mode</h3>
                  {settings.calculationMode === 'daily' && (
                    <HiCheckCircle className="w-5 h-5 text-primary-600" />
                  )}
                </div>
                <p className="text-sm text-secondary-500 mt-1">
                  Calculate salary based on days present. Simple proration using present days / working days ratio.
                </p>
                <ul className="mt-2 text-xs text-secondary-500 space-y-1">
                  <li>• Simple day-based calculation</li>
                  <li>• Half-day tracking</li>
                  <li>• No automatic overtime tracking</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode-specific Settings */}
      {settings.calculationMode === 'hourly' ? (
        <div className="border-t border-secondary-200 pt-6">
          <h3 className="font-medium text-secondary-900 mb-4 flex items-center gap-2">
            <HiClock className="w-5 h-5 text-primary-600" />
            Hourly Mode Settings
          </h3>
          <div className="space-y-4">
            {/* Overtime Multiplier */}
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div>
                <h4 className="font-medium text-secondary-900">Overtime Multiplier</h4>
                <p className="text-sm text-secondary-500">
                  Rate multiplier for overtime hours (e.g., 1.5x means 50% extra)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="3"
                  value={settings.hourlyModeSettings.overtimeMultiplier}
                  onChange={(e) => setSettings({
                    ...settings,
                    hourlyModeSettings: {
                      ...settings.hourlyModeSettings,
                      overtimeMultiplier: parseFloat(e.target.value) || 1.5
                    }
                  })}
                  className="w-20 px-3 py-2 border border-secondary-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <span className="text-secondary-500">x</span>
              </div>
            </div>

            {/* Track Overtime Automatically */}
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div>
                <h4 className="font-medium text-secondary-900">Track Overtime Automatically</h4>
                <p className="text-sm text-secondary-500">
                  Automatically detect overtime from attendance records
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hourlyModeSettings.trackOvertimeAutomatically}
                  onChange={(e) => setSettings({
                    ...settings,
                    hourlyModeSettings: {
                      ...settings.hourlyModeSettings,
                      trackOvertimeAutomatically: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Require Overtime Approval */}
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div>
                <h4 className="font-medium text-secondary-900">Require Overtime Approval</h4>
                <p className="text-sm text-secondary-500">
                  Overtime must be approved by HR/Admin before payment
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hourlyModeSettings.requireOvertimeApproval}
                  onChange={(e) => setSettings({
                    ...settings,
                    hourlyModeSettings: {
                      ...settings.hourlyModeSettings,
                      requireOvertimeApproval: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Hold Payroll for Pending Overtime */}
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div>
                <h4 className="font-medium text-secondary-900">Hold Payroll for Pending Overtime</h4>
                <p className="text-sm text-secondary-500">
                  Put payroll on hold if employee has unapproved overtime
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hourlyModeSettings.holdPayrollForPendingOvertime}
                  onChange={(e) => setSettings({
                    ...settings,
                    hourlyModeSettings: {
                      ...settings.hourlyModeSettings,
                      holdPayrollForPendingOvertime: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Calculate Shortfall */}
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div>
                <h4 className="font-medium text-secondary-900">Calculate Shortfall Deduction</h4>
                <p className="text-sm text-secondary-500">
                  Deduct salary for hours not worked (below expected hours)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.hourlyModeSettings.calculateShortfall}
                  onChange={(e) => setSettings({
                    ...settings,
                    hourlyModeSettings: {
                      ...settings.hourlyModeSettings,
                      calculateShortfall: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-t border-secondary-200 pt-6">
          <h3 className="font-medium text-secondary-900 mb-4 flex items-center gap-2">
            <HiCalendar className="w-5 h-5 text-primary-600" />
            Daily Mode Settings
          </h3>
          <div className="space-y-4">
            {/* Half Day Threshold */}
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div>
                <h4 className="font-medium text-secondary-900">Half Day Threshold (Hours)</h4>
                <p className="text-sm text-secondary-500">
                  Minimum hours to count as half day attendance
                </p>
              </div>
              <input
                type="number"
                min="1"
                max="12"
                value={settings.dailyModeSettings.halfDayThresholdHours}
                onChange={(e) => setSettings({
                  ...settings,
                  dailyModeSettings: {
                    ...settings.dailyModeSettings,
                    halfDayThresholdHours: parseInt(e.target.value) || 4
                  }
                })}
                className="w-20 px-3 py-2 border border-secondary-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Full Day Threshold */}
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div>
                <h4 className="font-medium text-secondary-900">Full Day Threshold (Hours)</h4>
                <p className="text-sm text-secondary-500">
                  Minimum hours to count as full day attendance
                </p>
              </div>
              <input
                type="number"
                min="1"
                max="24"
                value={settings.dailyModeSettings.fullDayThresholdHours}
                onChange={(e) => setSettings({
                  ...settings,
                  dailyModeSettings: {
                    ...settings.dailyModeSettings,
                    fullDayThresholdHours: parseInt(e.target.value) || 8
                  }
                })}
                className="w-20 px-3 py-2 border border-secondary-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Count Half Days */}
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div>
                <h4 className="font-medium text-secondary-900">Count Half Days</h4>
                <p className="text-sm text-secondary-500">
                  Track and include half days in attendance
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dailyModeSettings.countHalfDays}
                  onChange={(e) => setSettings({
                    ...settings,
                    dailyModeSettings: {
                      ...settings.dailyModeSettings,
                      countHalfDays: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Deduct for Absence */}
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div>
                <h4 className="font-medium text-secondary-900">Deduct for Absence</h4>
                <p className="text-sm text-secondary-500">
                  Deduct salary for absent days (without leave)
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dailyModeSettings.deductForAbsence}
                  onChange={(e) => setSettings({
                    ...settings,
                    dailyModeSettings: {
                      ...settings.dailyModeSettings,
                      deductForAbsence: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Deduct for Half Day */}
            <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
              <div>
                <h4 className="font-medium text-secondary-900">Deduct for Half Day</h4>
                <p className="text-sm text-secondary-500">
                  Deduct half salary for half day attendance
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.dailyModeSettings.deductForHalfDay}
                  onChange={(e) => setSettings({
                    ...settings,
                    dailyModeSettings: {
                      ...settings.dailyModeSettings,
                      deductForHalfDay: e.target.checked
                    }
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <HiExclamationCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">Important Note</p>
          <p className="mt-1">
            Changing the calculation mode will affect all future payroll calculations.
            Existing processed payrolls will not be affected.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <HiCurrencyRupee className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save Payroll Settings'}
        </button>
      </div>
    </div>
  );
};

export default PayrollSettings;
