import React, { useState, useEffect } from 'react';
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiCheck,
  HiX,
  HiRefresh,
  HiCalendar,
} from 'react-icons/hi';
import api from '../services/api';

interface LeaveType {
  _id: string;
  name: string;
  code: string;
  description?: string;
  defaultDays: number;
  maxDays: number;
  carryForward: boolean;
  maxCarryForwardDays: number;
  isPaid: boolean;
  requiresApproval: boolean;
  minDaysNotice: number;
  allowHalfDay: boolean;
  allowNegativeBalance: boolean;
  applicableGender?: 'male' | 'female' | 'all';
  isActive: boolean;
}

const initialFormData: Omit<LeaveType, '_id'> = {
  name: '',
  code: '',
  description: '',
  defaultDays: 0,
  maxDays: 30,
  carryForward: false,
  maxCarryForwardDays: 0,
  isPaid: true,
  requiresApproval: true,
  minDaysNotice: 1,
  allowHalfDay: true,
  allowNegativeBalance: false,
  applicableGender: 'all',
  isActive: true,
};

const LeaveTypes: React.FC = () => {
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<LeaveType, '_id'>>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const fetchLeaveTypes = async () => {
    try {
      const response = await api.get('/leaves/types');
      setLeaveTypes(response.data.data?.leaveTypes || []);
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        await api.put(`/leaves/types/${editingId}`, formData);
      } else {
        await api.post('/leaves/types', formData);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(initialFormData);
      fetchLeaveTypes();
    } catch (error) {
      console.error('Failed to save leave type:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (leaveType: LeaveType) => {
    setEditingId(leaveType._id);
    setFormData({
      name: leaveType.name,
      code: leaveType.code,
      description: leaveType.description || '',
      defaultDays: leaveType.defaultDays,
      maxDays: leaveType.maxDays,
      carryForward: leaveType.carryForward,
      maxCarryForwardDays: leaveType.maxCarryForwardDays,
      isPaid: leaveType.isPaid,
      requiresApproval: leaveType.requiresApproval,
      minDaysNotice: leaveType.minDaysNotice,
      allowHalfDay: leaveType.allowHalfDay,
      allowNegativeBalance: leaveType.allowNegativeBalance,
      applicableGender: leaveType.applicableGender || 'all',
      isActive: leaveType.isActive,
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/leaves/types/${id}`);
      setDeleteConfirmId(null);
      fetchLeaveTypes();
    } catch (error) {
      console.error('Failed to delete leave type:', error);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await api.post('/leaves/types/seed');
      fetchLeaveTypes();
    } catch (error) {
      console.error('Failed to seed default leave types:', error);
    }
  };

  const openCreateModal = () => {
    setEditingId(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  };

  const getLeaveTypeColor = (code: string) => {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
      AL: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      SL: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      CL: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
      ML: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
      PL: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      UL: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
      CO: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    };
    return colors[code] || { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' };
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-secondary-200 rounded w-1/4" />
        <div className="h-64 bg-secondary-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Leave Types</h1>
          <p className="text-secondary-500">Configure leave types and policies</p>
        </div>
        <div className="flex gap-2">
          {leaveTypes.length === 0 && (
            <button
              onClick={handleSeedDefaults}
              className="inline-flex items-center gap-2 px-4 py-2 border border-secondary-300 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-colors"
            >
              <HiRefresh className="w-5 h-5" />
              Seed Defaults
            </button>
          )}
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <HiPlus className="w-5 h-5" />
            Add Leave Type
          </button>
        </div>
      </div>

      {/* Leave Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {leaveTypes.length === 0 ? (
          <div className="col-span-full bg-white rounded-xl shadow-sm border border-secondary-200 p-12 text-center">
            <HiCalendar className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-secondary-900 mb-2">No Leave Types</h3>
            <p className="text-secondary-500 mb-4">
              Get started by adding leave types or seeding default ones.
            </p>
          </div>
        ) : (
          leaveTypes.map((leaveType) => {
            const colorStyle = getLeaveTypeColor(leaveType.code);
            return (
              <div
                key={leaveType._id}
                className={`bg-white rounded-xl shadow-sm border ${
                  leaveType.isActive ? 'border-secondary-200' : 'border-secondary-300 opacity-60'
                } overflow-hidden`}
              >
                <div className={`p-4 border-b ${colorStyle.bg} ${colorStyle.border}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-3 py-1 text-sm font-bold rounded-full ${colorStyle.bg} ${colorStyle.text} border ${colorStyle.border}`}
                      >
                        {leaveType.code}
                      </span>
                      <h3 className={`font-semibold ${colorStyle.text}`}>{leaveType.name}</h3>
                    </div>
                    {!leaveType.isActive && (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {leaveType.description && (
                    <p className="text-sm text-secondary-500">{leaveType.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-secondary-500">Default Days</p>
                      <p className="font-semibold text-secondary-900">{leaveType.defaultDays}</p>
                    </div>
                    <div>
                      <p className="text-secondary-500">Max Days</p>
                      <p className="font-semibold text-secondary-900">{leaveType.maxDays}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {leaveType.isPaid && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        Paid
                      </span>
                    )}
                    {leaveType.carryForward && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                        Carry Forward ({leaveType.maxCarryForwardDays}d)
                      </span>
                    )}
                    {leaveType.allowHalfDay && (
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
                        Half Day
                      </span>
                    )}
                    {leaveType.requiresApproval && (
                      <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                        Approval Required
                      </span>
                    )}
                    {leaveType.applicableGender !== 'all' && (
                      <span className="px-2 py-1 text-xs font-medium bg-pink-100 text-pink-700 rounded-full">
                        {leaveType.applicableGender === 'female' ? 'Female Only' : 'Male Only'}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-secondary-100">
                    <button
                      onClick={() => handleEdit(leaveType)}
                      className="p-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <HiPencil className="w-4 h-4" />
                    </button>
                    {deleteConfirmId === leaveType._id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(leaveType._id)}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Confirm Delete"
                        >
                          <HiCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(null)}
                          className="p-2 text-secondary-600 hover:bg-secondary-100 rounded-lg transition-colors"
                          title="Cancel"
                        >
                          <HiX className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirmId(leaveType._id)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <HiTrash className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-secondary-200">
              <h2 className="text-xl font-bold text-secondary-900">
                {editingId ? 'Edit Leave Type' : 'Add Leave Type'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Annual Leave"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., AL"
                    maxLength={5}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Brief description of this leave type..."
                />
              </div>

              {/* Days Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Default Days <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={formData.defaultDays}
                    onChange={(e) => setFormData({ ...formData, defaultDays: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min={0}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Max Days
                  </label>
                  <input
                    type="number"
                    value={formData.maxDays}
                    onChange={(e) => setFormData({ ...formData, maxDays: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min={0}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Min Notice Days
                  </label>
                  <input
                    type="number"
                    value={formData.minDaysNotice}
                    onChange={(e) => setFormData({ ...formData, minDaysNotice: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min={0}
                  />
                </div>
              </div>

              {/* Toggle Options */}
              <div className="space-y-4">
                <h3 className="font-medium text-secondary-900">Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-3 border border-secondary-200 rounded-lg cursor-pointer hover:bg-secondary-50">
                    <input
                      type="checkbox"
                      checked={formData.isPaid}
                      onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-secondary-900">Paid Leave</p>
                      <p className="text-sm text-secondary-500">Employee gets paid during leave</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-secondary-200 rounded-lg cursor-pointer hover:bg-secondary-50">
                    <input
                      type="checkbox"
                      checked={formData.requiresApproval}
                      onChange={(e) => setFormData({ ...formData, requiresApproval: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-secondary-900">Requires Approval</p>
                      <p className="text-sm text-secondary-500">Manager must approve requests</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-secondary-200 rounded-lg cursor-pointer hover:bg-secondary-50">
                    <input
                      type="checkbox"
                      checked={formData.allowHalfDay}
                      onChange={(e) => setFormData({ ...formData, allowHalfDay: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-secondary-900">Allow Half Day</p>
                      <p className="text-sm text-secondary-500">Can apply for half-day leave</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-secondary-200 rounded-lg cursor-pointer hover:bg-secondary-50">
                    <input
                      type="checkbox"
                      checked={formData.allowNegativeBalance}
                      onChange={(e) => setFormData({ ...formData, allowNegativeBalance: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-secondary-900">Allow Negative Balance</p>
                      <p className="text-sm text-secondary-500">Can go into negative balance</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-secondary-200 rounded-lg cursor-pointer hover:bg-secondary-50">
                    <input
                      type="checkbox"
                      checked={formData.carryForward}
                      onChange={(e) => setFormData({ ...formData, carryForward: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-secondary-900">Carry Forward</p>
                      <p className="text-sm text-secondary-500">Unused days carry to next year</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-secondary-200 rounded-lg cursor-pointer hover:bg-secondary-50">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-secondary-900">Active</p>
                      <p className="text-sm text-secondary-500">Available for leave requests</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Carry Forward Days */}
              {formData.carryForward && (
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Max Carry Forward Days
                  </label>
                  <input
                    type="number"
                    value={formData.maxCarryForwardDays}
                    onChange={(e) => setFormData({ ...formData, maxCarryForwardDays: Number(e.target.value) })}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min={0}
                  />
                </div>
              )}

              {/* Applicable Gender */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Applicable Gender
                </label>
                <select
                  value={formData.applicableGender}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      applicableGender: e.target.value as 'male' | 'female' | 'all',
                    })
                  }
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Employees</option>
                  <option value="male">Male Only</option>
                  <option value="female">Female Only</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-secondary-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingId(null);
                  }}
                  className="px-4 py-2 text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveTypes;
