import React, { useState, useEffect } from 'react';
import {
  HiUserAdd,
  HiUserRemove,
  HiPlus,
  HiCheck,
  HiX,
  HiEye,
  HiRefresh,
  HiClipboardList,
  HiCheckCircle,
  HiClock,
  HiExclamationCircle,
  HiUserGroup,
  HiCalendar,
  HiUser,
} from 'react-icons/hi';
import api from '../services/api';
import { useAppSelector } from '../hooks/useAppDispatch';

interface OnboardingEntry {
  _id: string;
  employeeId: string;
  templateId?: string;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  currentPhase: string;
  overallProgress: number;
  buddyId?: string;
  tasks: Array<{
    taskId: string;
    title: string;
    status: string;
    isMandatory: boolean;
  }>;
  createdAt: string;
}

interface OffboardingEntry {
  _id: string;
  employeeId: string;
  lastWorkingDate: string;
  status: 'initiated' | 'in_progress' | 'completed' | 'cancelled';
  overallProgress: number;
  clearanceStatus: Record<string, string>;
  createdAt: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  employeeCode: string;
}

interface Template {
  _id: string;
  name: string;
  description: string;
}

const Onboarding: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'onboarding' | 'offboarding'>('onboarding');
  const [onboardings, setOnboardings] = useState<OnboardingEntry[]>([]);
  const [offboardings, setOffboardings] = useState<OffboardingEntry[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [offboardingTemplates, setOffboardingTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<OnboardingEntry | OffboardingEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [stats, setStats] = useState({
    activeOnboardings: 0,
    pendingTasks: 0,
    activeOffboardings: 0,
    completedThisMonth: 0,
  });

  const [formData, setFormData] = useState({
    employeeId: '',
    templateId: '',
    startDate: new Date().toISOString().split('T')[0],
    buddyId: '',
    lastWorkingDay: '',
    reason: '',
  });

  const { user } = useAppSelector((state) => state.auth);
  const tenantId = user?.tenantId || localStorage.getItem('tenantId');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [onboardingRes, offboardingRes, employeesRes, templatesRes, offboardingTemplatesRes, statsRes, offboardingStatsRes] = await Promise.all([
        api.get(`/onboarding/${tenantId}/onboarding`),
        api.get(`/onboarding/${tenantId}/offboarding`),
        api.get('/employees'),
        api.get(`/onboarding/${tenantId}/onboarding/templates`),
        api.get(`/onboarding/${tenantId}/offboarding/templates`),
        api.get(`/onboarding/${tenantId}/onboarding/stats`),
        api.get(`/onboarding/${tenantId}/offboarding/stats`),
      ]);

      setOnboardings(onboardingRes.data.data || []);
      setOffboardings(offboardingRes.data.data || []);
      setEmployees(employeesRes.data.data || []);
      setTemplates(templatesRes.data.data || []);
      setOffboardingTemplates(offboardingTemplatesRes.data.data || []);

      const onboardingStats = statsRes.data.data || {};
      const offboardingStats = offboardingStatsRes.data.data || {};

      const inProgressOnboarding = onboardingStats.statusStats?.find((s: any) => s._id === 'in_progress')?.count || 0;
      const notStartedOnboarding = onboardingStats.statusStats?.find((s: any) => s._id === 'not_started')?.count || 0;
      const inProgressOffboarding = offboardingStats.statusStats?.find((s: any) => s._id === 'in_progress')?.count || 0;
      const completedOnboarding = onboardingStats.statusStats?.find((s: any) => s._id === 'completed')?.count || 0;

      setStats({
        activeOnboardings: inProgressOnboarding + notStartedOnboarding,
        pendingTasks: 0,
        activeOffboardings: inProgressOffboarding,
        completedThisMonth: completedOnboarding,
      });
    } catch (error) {
      console.error('Failed to fetch onboarding data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateOnboarding = async () => {
    if (!formData.employeeId || !formData.templateId || !formData.startDate) return;

    setIsSaving(true);
    try {
      await api.post(`/onboarding/${tenantId}/onboarding`, {
        employeeId: formData.employeeId,
        templateId: formData.templateId,
        startDate: formData.startDate,
        buddyId: formData.buddyId || undefined,
      });
      setIsAddModalOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Failed to create onboarding:', error);
      const message = error.response?.data?.message || 'Failed to create onboarding';
      alert(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateOffboarding = async () => {
    if (!formData.employeeId || !formData.lastWorkingDay) return;

    setIsSaving(true);
    try {
      await api.post(`/onboarding/${tenantId}/offboarding`, {
        employeeId: formData.employeeId,
        lastWorkingDay: formData.lastWorkingDay,
        reason: formData.reason || 'resignation',
        templateId: formData.templateId || undefined,
      });
      setIsAddModalOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Failed to create offboarding:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompleteOnboarding = async (id: string) => {
    try {
      await api.post(`/onboarding/${tenantId}/onboarding/${id}/complete`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to complete onboarding');
    }
  };

  const handleCompleteOffboarding = async (id: string) => {
    try {
      await api.post(`/onboarding/${tenantId}/offboarding/${id}/complete`);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to complete offboarding');
    }
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      templateId: '',
      startDate: new Date().toISOString().split('T')[0],
      buddyId: '',
      lastWorkingDay: '',
      reason: '',
    });
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      not_started: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <HiClock className="w-4 h-4" /> },
      initiated: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <HiClock className="w-4 h-4" /> },
      in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <HiExclamationCircle className="w-4 h-4" /> },
      completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', icon: <HiCheckCircle className="w-4 h-4" /> },
      cancelled: { bg: 'bg-rose-100', text: 'text-rose-700', icon: <HiX className="w-4 h-4" /> },
    };
    return configs[status] || configs.not_started;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getEmployee = (employeeId: string): Employee | undefined => {
    return employees.find(e => e._id === employeeId);
  };

  const getEmployeeName = (employeeId: string): string => {
    const emp = getEmployee(employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown Employee';
  };

  const getEmployeeEmail = (employeeId: string): string => {
    const emp = getEmployee(employeeId);
    return emp?.email || '';
  };

  const getEmployeeInitial = (employeeId: string): string => {
    const emp = getEmployee(employeeId);
    return emp?.firstName?.[0] || 'E';
  };

  const getBuddyName = (buddyId?: string): string => {
    if (!buddyId) return '-';
    const emp = getEmployee(buddyId);
    return emp ? `${emp.firstName} ${emp.lastName}` : '-';
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gradient-to-r from-secondary-200 to-secondary-100 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-secondary-200 rounded-xl" />
          ))}
        </div>
        <div className="h-96 bg-secondary-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 rounded-2xl p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/4" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HiUserGroup className="w-6 h-6 text-purple-200" />
              <span className="text-sm font-medium text-white/80">Employee Lifecycle</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">Onboarding & Offboarding</h1>
            <p className="text-white/70">Manage employee transitions seamlessly</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setIsAddModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-purple-600 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg"
          >
            <HiPlus className="w-5 h-5" />
            {activeTab === 'onboarding' ? 'New Onboarding' : 'New Offboarding'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-violet-500/10 to-purple-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl text-white shadow-lg shadow-violet-500/25">
                <HiUserAdd className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Active Onboardings</span>
            </div>
            <p className="text-2xl font-bold text-secondary-900">{stats.activeOnboardings}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-amber-500/10 to-orange-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl text-white shadow-lg shadow-amber-500/25">
                <HiClipboardList className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Pending Tasks</span>
            </div>
            <p className="text-2xl font-bold text-secondary-900">{stats.pendingTasks}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-rose-500/10 to-pink-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl text-white shadow-lg shadow-rose-500/25">
                <HiUserRemove className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Active Offboardings</span>
            </div>
            <p className="text-2xl font-bold text-secondary-900">{stats.activeOffboardings}</p>
          </div>
        </div>

        <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-secondary-100 p-5 hover:shadow-md transition-shadow">
          <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-full blur-2xl" />
          <div className="relative">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl text-white shadow-lg shadow-emerald-500/25">
                <HiCheckCircle className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-secondary-500">Completed This Month</span>
            </div>
            <p className="text-2xl font-bold text-secondary-900">{stats.completedThisMonth}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 overflow-hidden">
        <div className="border-b border-secondary-100">
          <div className="flex">
            <button
              onClick={() => setActiveTab('onboarding')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                activeTab === 'onboarding'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              <HiUserAdd className="w-5 h-5" />
              Onboarding ({onboardings.length})
            </button>
            <button
              onClick={() => setActiveTab('offboarding')}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-all ${
                activeTab === 'offboarding'
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-secondary-500 hover:text-secondary-700'
              }`}
            >
              <HiUserRemove className="w-5 h-5" />
              Offboarding ({offboardings.length})
            </button>
            <div className="flex-1" />
            <button
              onClick={fetchData}
              className="p-4 text-secondary-500 hover:text-purple-600 hover:bg-purple-50 transition-all"
              title="Refresh"
            >
              <HiRefresh className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Onboarding Table */}
        {activeTab === 'onboarding' && (
          <div className="overflow-x-auto">
            {onboardings.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <HiUserAdd className="w-8 h-8 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">No Onboardings Yet</h3>
                <p className="text-secondary-500 mb-4">Start by creating your first onboarding process.</p>
                <button
                  onClick={() => {
                    resetForm();
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all"
                >
                  <HiPlus className="w-5 h-5" />
                  New Onboarding
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary-50">
                    <th className="text-left px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Start Date</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Buddy</th>
                    <th className="text-center px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Progress</th>
                    <th className="text-center px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {onboardings.map((entry) => {
                    const statusConfig = getStatusConfig(entry.status);
                    return (
                      <tr key={entry._id} className="hover:bg-secondary-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                              {getEmployeeInitial(entry.employeeId)}
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900">
                                {getEmployeeName(entry.employeeId)}
                              </p>
                              <p className="text-sm text-secondary-500">{getEmployeeEmail(entry.employeeId)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-secondary-600">
                            <HiCalendar className="w-4 h-4" />
                            {formatDate(entry.startDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-secondary-600">
                          {getBuddyName(entry.buddyId)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-secondary-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"
                                style={{ width: `${entry.overallProgress || 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-secondary-600">{entry.overallProgress || 0}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.icon}
                            {entry.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedEntry(entry);
                                setIsViewModalOpen(true);
                              }}
                              className="p-2 text-secondary-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <HiEye className="w-5 h-5" />
                            </button>
                            {entry.status !== 'completed' && entry.status !== 'cancelled' && (
                              <button
                                onClick={() => handleCompleteOnboarding(entry._id)}
                                className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Complete Onboarding"
                              >
                                <HiCheck className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Offboarding Table */}
        {activeTab === 'offboarding' && (
          <div className="overflow-x-auto">
            {offboardings.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-rose-100 to-pink-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <HiUserRemove className="w-8 h-8 text-rose-500" />
                </div>
                <h3 className="text-lg font-semibold text-secondary-900 mb-2">No Offboardings Yet</h3>
                <p className="text-secondary-500 mb-4">No employee offboardings in progress.</p>
                <button
                  onClick={() => {
                    resetForm();
                    setIsAddModalOpen(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-all"
                >
                  <HiPlus className="w-5 h-5" />
                  New Offboarding
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-secondary-50">
                    <th className="text-left px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Last Working Day</th>
                    <th className="text-center px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Progress</th>
                    <th className="text-center px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Status</th>
                    <th className="text-right px-6 py-3 text-xs font-bold text-secondary-600 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-100">
                  {offboardings.map((entry) => {
                    const statusConfig = getStatusConfig(entry.status);
                    return (
                      <tr key={entry._id} className="hover:bg-secondary-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                              {getEmployeeInitial(entry.employeeId)}
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900">
                                {getEmployeeName(entry.employeeId)}
                              </p>
                              <p className="text-sm text-secondary-500">{getEmployeeEmail(entry.employeeId)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 text-secondary-600">
                            <HiCalendar className="w-4 h-4" />
                            {formatDate(entry.lastWorkingDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-secondary-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-rose-500 to-pink-500 rounded-full"
                                style={{ width: `${entry.overallProgress || 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-secondary-600">{entry.overallProgress || 0}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.icon}
                            {entry.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedEntry(entry);
                                setIsViewModalOpen(true);
                              }}
                              className="p-2 text-secondary-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <HiEye className="w-5 h-5" />
                            </button>
                            {entry.status !== 'completed' && entry.status !== 'cancelled' && (
                              <button
                                onClick={() => handleCompleteOffboarding(entry._id)}
                                className="p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="Complete Offboarding"
                              >
                                <HiCheck className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className={`px-6 py-5 ${activeTab === 'onboarding' ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500' : 'bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  {activeTab === 'onboarding' ? <HiUserAdd className="w-6 h-6 text-white" /> : <HiUserRemove className="w-6 h-6 text-white" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {activeTab === 'onboarding' ? 'Create New Onboarding' : 'Create New Offboarding'}
                  </h2>
                  <p className="text-white/70 text-sm">
                    {activeTab === 'onboarding' ? 'Start onboarding process for a new employee' : 'Initiate offboarding for a departing employee'}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Employee</label>
                <select
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              {activeTab === 'onboarding' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Onboarding Template</label>
                    <select
                      value={formData.templateId}
                      onChange={(e) => setFormData({ ...formData, templateId: e.target.value })}
                      className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select Template</option>
                      {templates.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Start Date</label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Assign Buddy (Optional)</label>
                    <select
                      value={formData.buddyId}
                      onChange={(e) => setFormData({ ...formData, buddyId: e.target.value })}
                      className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="">Select Buddy</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.firstName} {emp.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Last Working Day</label>
                    <input
                      type="date"
                      value={formData.lastWorkingDay}
                      onChange={(e) => setFormData({ ...formData, lastWorkingDay: e.target.value })}
                      className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-secondary-700 mb-2">Reason</label>
                    <select
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full px-4 py-3 border border-secondary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
                    >
                      <option value="resignation">Resignation</option>
                      <option value="termination">Termination</option>
                      <option value="retirement">Retirement</option>
                      <option value="contract_end">Contract End</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </>
              )}
            </div>

            <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  resetForm();
                }}
                className="px-4 py-2.5 text-secondary-700 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={activeTab === 'onboarding' ? handleCreateOnboarding : handleCreateOffboarding}
                disabled={isSaving || !formData.employeeId || (activeTab === 'onboarding' ? (!formData.templateId || !formData.startDate) : !formData.lastWorkingDay)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 text-white rounded-xl transition-all font-medium disabled:opacity-50 ${
                  activeTab === 'onboarding'
                    ? 'bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600'
                    : 'bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600'
                }`}
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <HiPlus className="w-5 h-5" />
                )}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className={`px-6 py-5 ${activeTab === 'onboarding' ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500' : 'bg-gradient-to-r from-rose-500 via-pink-500 to-fuchsia-500'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <HiUser className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">
                      {getEmployeeName(selectedEntry.employeeId)}
                    </h2>
                    <p className="text-white/70 text-sm">{getEmployeeEmail(selectedEntry.employeeId)}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsViewModalOpen(false);
                    setSelectedEntry(null);
                  }}
                  className="p-2 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
                >
                  <HiX className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-secondary-50 rounded-xl p-4">
                  <p className="text-sm text-secondary-500 mb-1">Status</p>
                  <p className="font-medium text-secondary-900 capitalize">{selectedEntry.status.replace('_', ' ')}</p>
                </div>
                <div className="bg-secondary-50 rounded-xl p-4">
                  <p className="text-sm text-secondary-500 mb-1">Progress</p>
                  <p className="font-medium text-secondary-900">{(selectedEntry as any).overallProgress || 0}%</p>
                </div>
                {activeTab === 'onboarding' && (
                  <>
                    <div className="bg-secondary-50 rounded-xl p-4">
                      <p className="text-sm text-secondary-500 mb-1">Start Date</p>
                      <p className="font-medium text-secondary-900">{formatDate((selectedEntry as OnboardingEntry).startDate)}</p>
                    </div>
                    <div className="bg-secondary-50 rounded-xl p-4">
                      <p className="text-sm text-secondary-500 mb-1">Current Phase</p>
                      <p className="font-medium text-secondary-900 capitalize">{(selectedEntry as OnboardingEntry).currentPhase?.replace('_', ' ') || '-'}</p>
                    </div>
                  </>
                )}
                {activeTab === 'offboarding' && (
                  <div className="bg-secondary-50 rounded-xl p-4">
                    <p className="text-sm text-secondary-500 mb-1">Last Working Day</p>
                    <p className="font-medium text-secondary-900">{formatDate((selectedEntry as OffboardingEntry).lastWorkingDate)}</p>
                  </div>
                )}
              </div>

              {activeTab === 'onboarding' && (selectedEntry as OnboardingEntry).tasks?.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-secondary-900 mb-3">Tasks</h3>
                  <div className="space-y-2">
                    {(selectedEntry as OnboardingEntry).tasks.map((task) => (
                      <div key={task.taskId} className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                            task.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-secondary-200 text-secondary-500'
                          }`}>
                            {task.status === 'completed' ? <HiCheck className="w-4 h-4" /> : <HiClock className="w-4 h-4" />}
                          </div>
                          <span className="font-medium text-secondary-900">{task.title}</span>
                          {task.isMandatory && (
                            <span className="text-xs bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">Required</span>
                          )}
                        </div>
                        <span className={`text-sm capitalize ${
                          task.status === 'completed' ? 'text-emerald-600' : 'text-secondary-500'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-secondary-50 border-t border-secondary-200 flex justify-end">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedEntry(null);
                }}
                className="px-4 py-2.5 text-secondary-700 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50 transition-all font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
