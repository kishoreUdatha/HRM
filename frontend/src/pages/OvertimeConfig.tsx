import React, { useState, useEffect } from 'react';
import {
  HiClock,
  HiPlus,
  HiPencil,
  HiTrash,
  HiRefresh,
  HiCheck,
  HiX,
  HiCog,
  HiMoon,
  HiSun,
  HiCalendar,
} from 'react-icons/hi';
import api from '../services/api';

interface OvertimePolicy {
  _id: string;
  name: string;
  code: string;
  description?: string;
  rates: {
    regularOvertime: number;
    weekendOvertime: number;
    holidayOvertime: number;
    nightShiftOvertime: number;
  };
  eligibility: {
    minHoursPerDay: number;
    maxOvertimeHoursPerDay: number;
    maxOvertimeHoursPerMonth: number;
    excludedDesignations?: string[];
    excludedDepartments?: string[];
  };
  approvalRequired: boolean;
  approvalLevels: number;
  calculationBasis: 'basic' | 'gross' | 'fixed_hourly';
  fixedHourlyRate?: number;
  isActive: boolean;
  createdAt: string;
}

interface ShiftAllowance {
  _id: string;
  name: string;
  code: string;
  shiftType: 'morning' | 'afternoon' | 'night' | 'rotational' | 'split';
  timing: {
    startTime: string;
    endTime: string;
  };
  allowanceType: 'fixed' | 'percentage_of_basic' | 'per_hour';
  allowanceValue: number;
  taxable: boolean;
  eligibleDays: string[];
  isActive: boolean;
  createdAt: string;
}

const OvertimeConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'policies' | 'shifts'>('policies');
  const [policies, setPolicies] = useState<OvertimePolicy[]>([]);
  const [shifts, setShifts] = useState<ShiftAllowance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<OvertimePolicy | null>(null);
  const [editingShift, setEditingShift] = useState<ShiftAllowance | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Policy form state
  const [policyForm, setPolicyForm] = useState({
    name: '',
    code: '',
    description: '',
    regularOvertime: 1.5,
    weekendOvertime: 2,
    holidayOvertime: 2.5,
    nightShiftOvertime: 1.75,
    minHoursPerDay: 8,
    maxOvertimeHoursPerDay: 4,
    maxOvertimeHoursPerMonth: 50,
    approvalRequired: true,
    approvalLevels: 1,
    calculationBasis: 'basic' as 'basic' | 'gross' | 'fixed_hourly',
    fixedHourlyRate: 0,
  });

  // Shift form state
  const [shiftForm, setShiftForm] = useState({
    name: '',
    code: '',
    shiftType: 'morning' as 'morning' | 'afternoon' | 'night' | 'rotational' | 'split',
    startTime: '09:00',
    endTime: '18:00',
    allowanceType: 'fixed' as 'fixed' | 'percentage_of_basic' | 'per_hour',
    allowanceValue: 0,
    taxable: true,
    eligibleDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const tenantId = localStorage.getItem('tenantId');
      const [policiesRes, shiftsRes] = await Promise.all([
        api.get(`/payroll/extended/overtime/policies/${tenantId}`),
        api.get(`/payroll/extended/overtime/shifts/${tenantId}`),
      ]);
      setPolicies(policiesRes.data.data || []);
      setShifts(shiftsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch overtime data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePolicy = async () => {
    setIsSaving(true);
    try {
      const tenantId = localStorage.getItem('tenantId');
      const payload = {
        tenantId,
        name: policyForm.name,
        code: policyForm.code,
        description: policyForm.description,
        rates: {
          regularOvertime: policyForm.regularOvertime,
          weekendOvertime: policyForm.weekendOvertime,
          holidayOvertime: policyForm.holidayOvertime,
          nightShiftOvertime: policyForm.nightShiftOvertime,
        },
        eligibility: {
          minHoursPerDay: policyForm.minHoursPerDay,
          maxOvertimeHoursPerDay: policyForm.maxOvertimeHoursPerDay,
          maxOvertimeHoursPerMonth: policyForm.maxOvertimeHoursPerMonth,
        },
        approvalRequired: policyForm.approvalRequired,
        approvalLevels: policyForm.approvalLevels,
        calculationBasis: policyForm.calculationBasis,
        fixedHourlyRate: policyForm.fixedHourlyRate,
      };

      await api.post('/payroll/extended/overtime/policies', payload);
      setIsPolicyModalOpen(false);
      resetPolicyForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save policy:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveShift = async () => {
    setIsSaving(true);
    try {
      const tenantId = localStorage.getItem('tenantId');
      const payload = {
        tenantId,
        name: shiftForm.name,
        code: shiftForm.code,
        shiftType: shiftForm.shiftType,
        timing: {
          startTime: shiftForm.startTime,
          endTime: shiftForm.endTime,
        },
        allowanceType: shiftForm.allowanceType,
        allowanceValue: shiftForm.allowanceValue,
        taxable: shiftForm.taxable,
        eligibleDays: shiftForm.eligibleDays,
      };

      await api.post('/payroll/extended/overtime/shifts', payload);
      setIsShiftModalOpen(false);
      resetShiftForm();
      fetchData();
    } catch (error) {
      console.error('Failed to save shift:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const resetPolicyForm = () => {
    setPolicyForm({
      name: '',
      code: '',
      description: '',
      regularOvertime: 1.5,
      weekendOvertime: 2,
      holidayOvertime: 2.5,
      nightShiftOvertime: 1.75,
      minHoursPerDay: 8,
      maxOvertimeHoursPerDay: 4,
      maxOvertimeHoursPerMonth: 50,
      approvalRequired: true,
      approvalLevels: 1,
      calculationBasis: 'basic',
      fixedHourlyRate: 0,
    });
    setEditingPolicy(null);
  };

  const resetShiftForm = () => {
    setShiftForm({
      name: '',
      code: '',
      shiftType: 'morning',
      startTime: '09:00',
      endTime: '18:00',
      allowanceType: 'fixed',
      allowanceValue: 0,
      taxable: true,
      eligibleDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    });
    setEditingShift(null);
  };

  const handleDayToggle = (day: string) => {
    setShiftForm(prev => ({
      ...prev,
      eligibleDays: prev.eligibleDays.includes(day)
        ? prev.eligibleDays.filter(d => d !== day)
        : [...prev.eligibleDays, day],
    }));
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getShiftTypeIcon = (type: string) => {
    switch (type) {
      case 'night':
        return <HiMoon className="w-4 h-4" />;
      case 'morning':
        return <HiSun className="w-4 h-4" />;
      default:
        return <HiClock className="w-4 h-4" />;
    }
  };

  const getShiftTypeColor = (type: string) => {
    switch (type) {
      case 'night':
        return 'bg-indigo-100 text-indigo-700';
      case 'morning':
        return 'bg-amber-100 text-amber-700';
      case 'afternoon':
        return 'bg-orange-100 text-orange-700';
      case 'rotational':
        return 'bg-purple-100 text-purple-700';
      case 'split':
        return 'bg-pink-100 text-pink-700';
      default:
        return 'bg-secondary-100 text-secondary-700';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gradient-to-r from-secondary-200 to-secondary-100 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-secondary-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HiCog className="w-6 h-6 text-violet-200" />
              <span className="text-sm font-medium text-white/80">Payroll Configuration</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">Overtime & Shift Configuration</h1>
            <p className="text-white/70">Configure overtime policies and shift allowances for payroll calculations</p>
          </div>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all"
          >
            <HiRefresh className="w-5 h-5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-1 inline-flex">
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'policies'
              ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg'
              : 'text-secondary-600 hover:bg-secondary-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <HiClock className="w-5 h-5" />
            Overtime Policies
          </div>
        </button>
        <button
          onClick={() => setActiveTab('shifts')}
          className={`px-6 py-3 rounded-xl font-medium transition-all ${
            activeTab === 'shifts'
              ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white shadow-lg'
              : 'text-secondary-600 hover:bg-secondary-50'
          }`}
        >
          <div className="flex items-center gap-2">
            <HiMoon className="w-5 h-5" />
            Shift Allowances
          </div>
        </button>
      </div>

      {/* Policies Tab */}
      {activeTab === 'policies' && (
        <div className="space-y-4">
          {/* Add Policy Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetPolicyForm();
                setIsPolicyModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-600 transition-all shadow-lg shadow-violet-500/25"
            >
              <HiPlus className="w-5 h-5" />
              Add Policy
            </button>
          </div>

          {/* Policies Grid */}
          {policies.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HiClock className="w-8 h-8 text-violet-500" />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">No Overtime Policies</h3>
              <p className="text-secondary-500 mb-4">Create your first overtime policy to configure OT rates</p>
              <button
                onClick={() => {
                  resetPolicyForm();
                  setIsPolicyModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium"
              >
                <HiPlus className="w-4 h-4" />
                Create Policy
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {policies.map((policy) => (
                <div
                  key={policy._id}
                  className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-secondary-900">{policy.name}</h3>
                      <p className="text-sm text-secondary-500">Code: {policy.code}</p>
                    </div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      policy.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary-100 text-secondary-600'
                    }`}>
                      {policy.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {policy.description && (
                    <p className="text-sm text-secondary-600 mb-4">{policy.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-secondary-50 rounded-xl p-3">
                      <p className="text-xs text-secondary-500 mb-1">Regular OT</p>
                      <p className="text-lg font-bold text-secondary-900">{policy.rates.regularOvertime}x</p>
                    </div>
                    <div className="bg-secondary-50 rounded-xl p-3">
                      <p className="text-xs text-secondary-500 mb-1">Weekend OT</p>
                      <p className="text-lg font-bold text-secondary-900">{policy.rates.weekendOvertime}x</p>
                    </div>
                    <div className="bg-secondary-50 rounded-xl p-3">
                      <p className="text-xs text-secondary-500 mb-1">Holiday OT</p>
                      <p className="text-lg font-bold text-secondary-900">{policy.rates.holidayOvertime}x</p>
                    </div>
                    <div className="bg-secondary-50 rounded-xl p-3">
                      <p className="text-xs text-secondary-500 mb-1">Night OT</p>
                      <p className="text-lg font-bold text-secondary-900">{policy.rates.nightShiftOvertime}x</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-secondary-100">
                    <div className="flex items-center gap-2 text-sm text-secondary-500">
                      <HiClock className="w-4 h-4" />
                      Max {policy.eligibility.maxOvertimeHoursPerMonth} hrs/month
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      {policy.approvalRequired ? (
                        <span className="text-amber-600">Approval Required</span>
                      ) : (
                        <span className="text-emerald-600">Auto Approved</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Shifts Tab */}
      {activeTab === 'shifts' && (
        <div className="space-y-4">
          {/* Add Shift Button */}
          <div className="flex justify-end">
            <button
              onClick={() => {
                resetShiftForm();
                setIsShiftModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-semibold hover:from-violet-600 hover:to-purple-600 transition-all shadow-lg shadow-violet-500/25"
            >
              <HiPlus className="w-5 h-5" />
              Add Shift
            </button>
          </div>

          {/* Shifts Grid */}
          {shifts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-12 text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HiMoon className="w-8 h-8 text-violet-500" />
              </div>
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">No Shift Allowances</h3>
              <p className="text-secondary-500 mb-4">Create shift allowances for different work timings</p>
              <button
                onClick={() => {
                  resetShiftForm();
                  setIsShiftModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium"
              >
                <HiPlus className="w-4 h-4" />
                Create Shift
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {shifts.map((shift) => (
                <div
                  key={shift._id}
                  className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${getShiftTypeColor(shift.shiftType)}`}>
                        {getShiftTypeIcon(shift.shiftType)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-secondary-900">{shift.name}</h3>
                        <p className="text-xs text-secondary-500">{shift.code}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${getShiftTypeColor(shift.shiftType)}`}>
                      {shift.shiftType}
                    </span>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary-500">Timing</span>
                      <span className="font-medium text-secondary-900">
                        {shift.timing.startTime} - {shift.timing.endTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary-500">Allowance</span>
                      <span className="font-medium text-secondary-900">
                        {shift.allowanceType === 'fixed' && formatCurrency(shift.allowanceValue)}
                        {shift.allowanceType === 'percentage_of_basic' && `${shift.allowanceValue}% of Basic`}
                        {shift.allowanceType === 'per_hour' && `${formatCurrency(shift.allowanceValue)}/hr`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-secondary-500">Taxable</span>
                      <span className={`font-medium ${shift.taxable ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {shift.taxable ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-3 border-t border-secondary-100">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                      const dayFull = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][idx];
                      const isEligible = shift.eligibleDays.includes(dayFull);
                      return (
                        <span
                          key={day}
                          className={`px-2 py-1 text-xs rounded ${
                            isEligible ? 'bg-violet-100 text-violet-700' : 'bg-secondary-100 text-secondary-400'
                          }`}
                        >
                          {day}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Policy Modal */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <HiClock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editingPolicy ? 'Edit Overtime Policy' : 'Create Overtime Policy'}
                  </h2>
                  <p className="text-white/70 text-sm">Configure overtime rates and rules</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Policy Name</label>
                  <input
                    type="text"
                    value={policyForm.name}
                    onChange={(e) => setPolicyForm({ ...policyForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Standard OT Policy"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Policy Code</label>
                  <input
                    type="text"
                    value={policyForm.code}
                    onChange={(e) => setPolicyForm({ ...policyForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="OT-STD"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Description</label>
                <textarea
                  value={policyForm.description}
                  onChange={(e) => setPolicyForm({ ...policyForm, description: e.target.value })}
                  className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                  rows={2}
                  placeholder="Describe the overtime policy..."
                />
              </div>

              {/* OT Rates */}
              <div>
                <h3 className="text-sm font-semibold text-secondary-900 mb-3">Overtime Rate Multipliers</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-secondary-500 mb-1">Regular Overtime</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.25"
                        value={policyForm.regularOvertime}
                        onChange={(e) => setPolicyForm({ ...policyForm, regularOvertime: parseFloat(e.target.value) })}
                        className="flex-1 px-4 py-2 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <span className="text-secondary-500 font-medium">x</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-secondary-500 mb-1">Weekend Overtime</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.25"
                        value={policyForm.weekendOvertime}
                        onChange={(e) => setPolicyForm({ ...policyForm, weekendOvertime: parseFloat(e.target.value) })}
                        className="flex-1 px-4 py-2 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <span className="text-secondary-500 font-medium">x</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-secondary-500 mb-1">Holiday Overtime</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.25"
                        value={policyForm.holidayOvertime}
                        onChange={(e) => setPolicyForm({ ...policyForm, holidayOvertime: parseFloat(e.target.value) })}
                        className="flex-1 px-4 py-2 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <span className="text-secondary-500 font-medium">x</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-secondary-500 mb-1">Night Shift Overtime</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        step="0.25"
                        value={policyForm.nightShiftOvertime}
                        onChange={(e) => setPolicyForm({ ...policyForm, nightShiftOvertime: parseFloat(e.target.value) })}
                        className="flex-1 px-4 py-2 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                      />
                      <span className="text-secondary-500 font-medium">x</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Eligibility */}
              <div>
                <h3 className="text-sm font-semibold text-secondary-900 mb-3">Eligibility Rules</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-secondary-500 mb-1">Min Hours/Day</label>
                    <input
                      type="number"
                      value={policyForm.minHoursPerDay}
                      onChange={(e) => setPolicyForm({ ...policyForm, minHoursPerDay: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-secondary-500 mb-1">Max OT Hours/Day</label>
                    <input
                      type="number"
                      value={policyForm.maxOvertimeHoursPerDay}
                      onChange={(e) => setPolicyForm({ ...policyForm, maxOvertimeHoursPerDay: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-secondary-500 mb-1">Max OT Hours/Month</label>
                    <input
                      type="number"
                      value={policyForm.maxOvertimeHoursPerMonth}
                      onChange={(e) => setPolicyForm({ ...policyForm, maxOvertimeHoursPerMonth: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>
              </div>

              {/* Calculation Basis */}
              <div>
                <h3 className="text-sm font-semibold text-secondary-900 mb-3">Calculation Basis</h3>
                <div className="grid grid-cols-3 gap-3">
                  {['basic', 'gross', 'fixed_hourly'].map((basis) => (
                    <button
                      key={basis}
                      onClick={() => setPolicyForm({ ...policyForm, calculationBasis: basis as any })}
                      className={`px-4 py-3 rounded-xl border-2 transition-all ${
                        policyForm.calculationBasis === basis
                          ? 'border-violet-500 bg-violet-50 text-violet-700'
                          : 'border-secondary-200 text-secondary-600 hover:border-secondary-300'
                      }`}
                    >
                      {basis === 'basic' && 'Basic Salary'}
                      {basis === 'gross' && 'Gross Salary'}
                      {basis === 'fixed_hourly' && 'Fixed Rate'}
                    </button>
                  ))}
                </div>
                {policyForm.calculationBasis === 'fixed_hourly' && (
                  <div className="mt-3">
                    <label className="block text-xs text-secondary-500 mb-1">Fixed Hourly Rate</label>
                    <input
                      type="number"
                      value={policyForm.fixedHourlyRate}
                      onChange={(e) => setPolicyForm({ ...policyForm, fixedHourlyRate: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="Enter hourly rate in INR"
                    />
                  </div>
                )}
              </div>

              {/* Approval */}
              <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-secondary-900">Require Approval</h3>
                  <p className="text-sm text-secondary-500">Overtime entries must be approved before payroll</p>
                </div>
                <button
                  onClick={() => setPolicyForm({ ...policyForm, approvalRequired: !policyForm.approvalRequired })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    policyForm.approvalRequired ? 'bg-violet-500' : 'bg-secondary-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      policyForm.approvalRequired ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsPolicyModalOpen(false);
                  resetPolicyForm();
                }}
                className="px-4 py-2.5 text-secondary-700 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePolicy}
                disabled={isSaving || !policyForm.name || !policyForm.code}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiCheck className="w-5 h-5" />
                )}
                Save Policy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Modal */}
      {isShiftModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <HiMoon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editingShift ? 'Edit Shift Allowance' : 'Create Shift Allowance'}
                  </h2>
                  <p className="text-white/70 text-sm">Configure shift timing and allowance</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Shift Name</label>
                  <input
                    type="text"
                    value={shiftForm.name}
                    onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                    className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Night Shift"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Shift Code</label>
                  <input
                    type="text"
                    value={shiftForm.code}
                    onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="SHIFT-N"
                  />
                </div>
              </div>

              {/* Shift Type */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Shift Type</label>
                <div className="grid grid-cols-5 gap-2">
                  {['morning', 'afternoon', 'night', 'rotational', 'split'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setShiftForm({ ...shiftForm, shiftType: type as any })}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border-2 capitalize transition-all ${
                        shiftForm.shiftType === type
                          ? 'border-violet-500 bg-violet-50 text-violet-700'
                          : 'border-secondary-200 text-secondary-600 hover:border-secondary-300'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timing */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">Start Time</label>
                  <input
                    type="time"
                    value={shiftForm.startTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                    className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-2">End Time</label>
                  <input
                    type="time"
                    value={shiftForm.endTime}
                    onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                    className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* Allowance */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Allowance Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'fixed', label: 'Fixed Amount' },
                    { value: 'percentage_of_basic', label: '% of Basic' },
                    { value: 'per_hour', label: 'Per Hour' },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => setShiftForm({ ...shiftForm, allowanceType: type.value as any })}
                      className={`px-3 py-2 text-xs font-medium rounded-lg border-2 transition-all ${
                        shiftForm.allowanceType === type.value
                          ? 'border-violet-500 bg-violet-50 text-violet-700'
                          : 'border-secondary-200 text-secondary-600 hover:border-secondary-300'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Allowance Value
                  {shiftForm.allowanceType === 'percentage_of_basic' && ' (%)'}
                  {shiftForm.allowanceType === 'per_hour' && ' (per hour)'}
                </label>
                <input
                  type="number"
                  value={shiftForm.allowanceValue}
                  onChange={(e) => setShiftForm({ ...shiftForm, allowanceValue: parseFloat(e.target.value) })}
                  className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500"
                  placeholder={shiftForm.allowanceType === 'percentage_of_basic' ? '10' : '500'}
                />
              </div>

              {/* Eligible Days */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Eligible Days</label>
                <div className="flex gap-2">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => (
                    <button
                      key={day}
                      onClick={() => handleDayToggle(day)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border-2 capitalize transition-all ${
                        shiftForm.eligibleDays.includes(day)
                          ? 'border-violet-500 bg-violet-50 text-violet-700'
                          : 'border-secondary-200 text-secondary-400 hover:border-secondary-300'
                      }`}
                    >
                      {day.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Taxable */}
              <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-secondary-900">Taxable Allowance</h3>
                  <p className="text-sm text-secondary-500">Include in taxable income calculation</p>
                </div>
                <button
                  onClick={() => setShiftForm({ ...shiftForm, taxable: !shiftForm.taxable })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    shiftForm.taxable ? 'bg-violet-500' : 'bg-secondary-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      shiftForm.taxable ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsShiftModalOpen(false);
                  resetShiftForm();
                }}
                className="px-4 py-2.5 text-secondary-700 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveShift}
                disabled={isSaving || !shiftForm.name || !shiftForm.code}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all font-medium disabled:opacity-50"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiCheck className="w-5 h-5" />
                )}
                Save Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OvertimeConfig;
