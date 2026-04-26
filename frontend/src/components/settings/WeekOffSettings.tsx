import React, { useState, useEffect } from 'react';
import { HiCalendar, HiExclamationCircle, HiInformationCircle } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface WeekOffConfigData {
  weekOffDays: number[];
  maxWeekOffsPerWeek: number;
}

const WeekOffSettings: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [config, setConfig] = useState<WeekOffConfigData>({
    weekOffDays: [0], // Default: Sunday off
    maxWeekOffsPerWeek: 1,
  });

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const shortDayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/tenants/current/week-off-config');
      if (response.data.success) {
        setConfig(response.data.data);
      }
    } catch (error: any) {
      console.error('Failed to fetch week off config:', error);
      toast.error('Failed to load week off settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await api.put('/tenants/current/week-off-config', config);
      if (response.data.success) {
        toast.success('Week off settings saved successfully');
        setConfig(response.data.data);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save week off settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDayToggle = (dayIndex: number) => {
    setConfig((prev) => {
      const newDays = prev.weekOffDays.includes(dayIndex)
        ? prev.weekOffDays.filter((d) => d !== dayIndex)
        : [...prev.weekOffDays, dayIndex].sort((a, b) => a - b);
      return {
        ...prev,
        weekOffDays: newDays,
      };
    });
  };

  // Calculate working days in current month
  const calculateWorkingDays = (weekOffDays: number[]): number => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let workingDays = 0;
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      if (!weekOffDays.includes(dayOfWeek)) {
        workingDays++;
      }
    }
    return workingDays;
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

  const workingDaysThisMonth = calculateWorkingDays(config.weekOffDays);
  const totalDaysThisMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
      <h2 className="text-lg font-semibold text-secondary-900 mb-2">Default Week Off Settings</h2>
      <p className="text-secondary-500 text-sm mb-6">
        Configure the default week off days for your organization. These settings will be applied to new employees and can be overridden at the employee level.
      </p>

      {/* Week Off Days Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-secondary-700 mb-3">
          Week Off Days
        </label>
        <p className="text-sm text-secondary-500 mb-4">
          Select which days are week offs (non-working days) for your organization.
        </p>
        <div className="flex flex-wrap gap-2">
          {dayNames.map((day, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleDayToggle(index)}
              className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                config.weekOffDays.includes(index)
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-secondary-200 bg-white text-secondary-600 hover:border-secondary-300'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Max Week Offs Per Week */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-secondary-700 mb-2">
          Maximum Week Offs Per Week
        </label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            min="0"
            max="7"
            value={config.maxWeekOffsPerWeek}
            onChange={(e) => setConfig({
              ...config,
              maxWeekOffsPerWeek: parseInt(e.target.value) || 1
            })}
            className="w-20 px-3 py-2 border border-secondary-200 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-secondary-500 text-sm">days per week</span>
        </div>
        <p className="text-xs text-secondary-500 mt-1">
          This is the maximum number of week offs allowed per week for each employee.
        </p>
      </div>

      {/* Working Days Preview */}
      <div className="mb-6 p-4 bg-secondary-50 rounded-lg">
        <div className="flex items-start gap-3">
          <HiCalendar className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-secondary-900">Working Days Preview</h4>
            <p className="text-sm text-secondary-600 mt-1">
              With the selected week offs, this month will have:
            </p>
            <div className="mt-2 flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary-600">{workingDaysThisMonth}</p>
                <p className="text-xs text-secondary-500">Working Days</p>
              </div>
              <div className="text-secondary-300">/</div>
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary-600">{totalDaysThisMonth}</p>
                <p className="text-xs text-secondary-500">Total Days</p>
              </div>
              <div className="text-secondary-300">•</div>
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary-600">{totalDaysThisMonth - workingDaysThisMonth}</p>
                <p className="text-xs text-secondary-500">Week Offs</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Days Summary */}
      {config.weekOffDays.length > 0 && (
        <div className="mb-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-start gap-3">
            <HiInformationCircle className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-primary-800">
              <p className="font-medium">Selected Week Offs</p>
              <p className="mt-1">
                Employees will have <strong>{config.weekOffDays.map(d => shortDayNames[d]).join(', ')}</strong> as their default week off days.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <HiExclamationCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-medium">How Week Off Settings Work</p>
          <ul className="mt-2 space-y-1 text-blue-700">
            <li>• These settings apply as defaults for all new employees</li>
            <li>• Individual employees can have custom week off configurations</li>
            <li>• Week off settings affect salary calculations (working days per month)</li>
            <li>• Employees can also use their shift's week off days if configured</li>
          </ul>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          <HiCalendar className="w-5 h-5" />
          {isSaving ? 'Saving...' : 'Save Week Off Settings'}
        </button>
      </div>
    </div>
  );
};

export default WeekOffSettings;
