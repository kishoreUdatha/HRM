import React, { useEffect, useState } from 'react';
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiClock,
  HiStar,
  HiUserGroup,
  HiDownload,
  HiSearch,
  HiCheck,
  HiX,
} from 'react-icons/hi';
import api from '../services/api';
import type { Shift, Employee } from '../types';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ShiftEmployee {
  _id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email: string;
  designation: string;
  departmentId?: { _id: string; name: string };
  status: string;
}

const Shifts: React.FC = () => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [error, setError] = useState('');
  const [isSeeding, setIsSeeding] = useState(false);

  // Shift Allocation State
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [selectedShiftForAllocation, setSelectedShiftForAllocation] = useState<Shift | null>(null);
  const [shiftEmployees, setShiftEmployees] = useState<ShiftEmployee[]>([]);
  const [allEmployees, setAllEmployees] = useState<ShiftEmployee[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [allocationTab, setAllocationTab] = useState<'current' | 'assign'>('current');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    startTime: '09:00',
    endTime: '18:00',
    breakDuration: 60,
    allowedLateMinutes: 15,
    allowedEarlyLeaveMinutes: 15,
    overtimeThreshold: 30,
    weeklyOffDays: [0, 6] as number[],
    color: '#3B82F6',
    isActive: true,
  });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      const response = await api.get('/shifts');
      // Handle both response formats: { data: shifts[] } and { data: { shifts: [] } }
      const shiftsData = response.data.data?.shifts || response.data.data || [];
      setShifts(Array.isArray(shiftsData) ? shiftsData : []);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (shift?: Shift) => {
    if (shift) {
      setEditingShift(shift);
      setFormData({
        name: shift.name,
        code: shift.code,
        description: shift.description || '',
        startTime: shift.startTime,
        endTime: shift.endTime,
        breakDuration: shift.breakDuration,
        allowedLateMinutes: shift.allowedLateMinutes,
        allowedEarlyLeaveMinutes: shift.allowedEarlyLeaveMinutes,
        overtimeThreshold: shift.overtimeThreshold,
        weeklyOffDays: shift.weeklyOffDays,
        color: shift.color,
        isActive: shift.isActive,
      });
    } else {
      setEditingShift(null);
      setFormData({
        name: '',
        code: '',
        description: '',
        startTime: '09:00',
        endTime: '18:00',
        breakDuration: 60,
        allowedLateMinutes: 15,
        allowedEarlyLeaveMinutes: 15,
        overtimeThreshold: 30,
        weeklyOffDays: [0, 6],
        color: '#3B82F6',
        isActive: true,
      });
    }
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingShift(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Name and code are required');
      return;
    }

    try {
      if (editingShift) {
        await api.put(`/shifts/${editingShift._id}`, formData);
      } else {
        await api.post('/shifts', formData);
      }
      fetchShifts();
      closeModal();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save shift');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this shift?')) return;
    try {
      await api.delete(`/shifts/${id}`);
      fetchShifts();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete shift');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.post(`/shifts/${id}/set-default`);
      fetchShifts();
    } catch (error) {
      console.error('Failed to set default shift:', error);
    }
  };

  const handleSeedShifts = async () => {
    if (!window.confirm('This will create default shifts. Continue?')) return;
    setIsSeeding(true);
    try {
      await api.post('/shifts/seed');
      fetchShifts();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to seed shifts');
    } finally {
      setIsSeeding(false);
    }
  };

  const toggleWeeklyOff = (day: number) => {
    setFormData((prev) => ({
      ...prev,
      weeklyOffDays: prev.weeklyOffDays.includes(day)
        ? prev.weeklyOffDays.filter((d) => d !== day)
        : [...prev.weeklyOffDays, day].sort(),
    }));
  };

  // Shift Allocation Functions
  const openAllocationModal = async (shift: Shift) => {
    setSelectedShiftForAllocation(shift);
    setIsAllocationModalOpen(true);
    setAllocationTab('current');
    setSelectedEmployees([]);
    setEmployeeSearchTerm('');
    await fetchShiftEmployees(shift._id);
    await fetchAllEmployees();
  };

  const closeAllocationModal = () => {
    setIsAllocationModalOpen(false);
    setSelectedShiftForAllocation(null);
    setShiftEmployees([]);
    setSelectedEmployees([]);
    setEmployeeSearchTerm('');
  };

  const fetchShiftEmployees = async (shiftId: string) => {
    setIsLoadingEmployees(true);
    try {
      const response = await api.get(`/shifts/${shiftId}/employees`);
      setShiftEmployees(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch shift employees:', error);
      setShiftEmployees([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  };

  const fetchAllEmployees = async () => {
    try {
      const response = await api.get('/employees?limit=1000');
      setAllEmployees(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch all employees:', error);
      setAllEmployees([]);
    }
  };

  const toggleEmployeeSelection = (employeeId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employeeId)
        ? prev.filter((id) => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const selectAllFilteredEmployees = () => {
    const filtered = getUnassignedEmployees();
    const allIds = filtered.map((e) => e._id);
    setSelectedEmployees(allIds);
  };

  const clearSelection = () => {
    setSelectedEmployees([]);
  };

  const handleBulkAssign = async () => {
    if (!selectedShiftForAllocation || selectedEmployees.length === 0) return;

    try {
      await api.post('/shifts/bulk-assign', {
        shiftId: selectedShiftForAllocation._id,
        employeeIds: selectedEmployees,
      });
      await fetchShiftEmployees(selectedShiftForAllocation._id);
      await fetchShifts();
      setSelectedEmployees([]);
      setAllocationTab('current');
    } catch (error) {
      console.error('Failed to assign employees:', error);
      alert('Failed to assign employees to shift');
    }
  };

  const handleRemoveFromShift = async (employeeId: string) => {
    if (!window.confirm('Remove this employee from the shift?')) return;

    try {
      // Assign to null/no shift
      await api.put(`/employees/${employeeId}`, { shiftId: null });
      if (selectedShiftForAllocation) {
        await fetchShiftEmployees(selectedShiftForAllocation._id);
        await fetchShifts();
      }
    } catch (error) {
      console.error('Failed to remove employee from shift:', error);
    }
  };

  const getUnassignedEmployees = () => {
    const assignedIds = shiftEmployees.map((e) => e._id);
    return allEmployees.filter((e) => {
      // Not already in this shift
      if (assignedIds.includes(e._id)) return false;
      // Match search term
      if (employeeSearchTerm) {
        const search = employeeSearchTerm.toLowerCase();
        return (
          e.firstName?.toLowerCase().includes(search) ||
          e.lastName?.toLowerCase().includes(search) ||
          e.employeeCode?.toLowerCase().includes(search) ||
          e.email?.toLowerCase().includes(search)
        );
      }
      return true;
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-secondary-200 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-secondary-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Shift Management</h1>
          <p className="text-secondary-500">Configure work shifts for your organization</p>
        </div>
        <div className="flex items-center gap-3">
          {shifts.length === 0 && (
            <button
              onClick={handleSeedShifts}
              disabled={isSeeding}
              className="inline-flex items-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
            >
              <HiDownload className="w-5 h-5" />
              {isSeeding ? 'Creating...' : 'Load Default Shifts'}
            </button>
          )}
          <button
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <HiPlus className="w-5 h-5" />
            Add Shift
          </button>
        </div>
      </div>

      {/* Shifts Grid */}
      {shifts.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-12 text-center">
          <HiClock className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
          <p className="text-secondary-600 mb-4">No shifts configured</p>
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleSeedShifts}
              disabled={isSeeding}
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
            >
              <HiDownload className="w-5 h-5" />
              Load default shifts
            </button>
            <span className="text-secondary-400">or</span>
            <button
              onClick={() => openModal()}
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700"
            >
              <HiPlus className="w-5 h-5" />
              Create custom shift
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shifts.map((shift) => (
            <div
              key={shift._id}
              className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${shift.color}20` }}
                  >
                    <HiClock className="w-6 h-6" style={{ color: shift.color }} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-secondary-900">{shift.name}</h3>
                      {shift.isDefault && (
                        <HiStar className="w-4 h-4 text-yellow-500" title="Default Shift" />
                      )}
                    </div>
                    <p className="text-sm text-secondary-500">{shift.code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {!shift.isDefault && (
                    <button
                      onClick={() => handleSetDefault(shift._id)}
                      className="p-2 hover:bg-secondary-100 rounded-lg"
                      title="Set as Default"
                    >
                      <HiStar className="w-4 h-4 text-secondary-400" />
                    </button>
                  )}
                  <button
                    onClick={() => openModal(shift)}
                    className="p-2 hover:bg-secondary-100 rounded-lg"
                  >
                    <HiPencil className="w-4 h-4 text-secondary-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(shift._id)}
                    className="p-2 hover:bg-red-50 rounded-lg"
                  >
                    <HiTrash className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Time Info */}
              <div className="bg-secondary-50 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-secondary-600">Working Hours</span>
                  <span className="font-medium text-secondary-900">
                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-secondary-600">Break Duration</span>
                  <span className="font-medium text-secondary-900">{shift.breakDuration} mins</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-secondary-600">Total Hours</span>
                  <span className="font-medium text-secondary-900">{shift.workingHours} hrs</span>
                </div>
              </div>

              {/* Weekly Off Days */}
              <div className="mb-4">
                <p className="text-xs text-secondary-500 mb-2">Weekly Off</p>
                <div className="flex gap-1">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <span
                      key={day}
                      className={`px-2 py-1 text-xs rounded ${
                        shift.weeklyOffDays.includes(index)
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-secondary-200">
                <button
                  onClick={() => openAllocationModal(shift)}
                  className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700"
                >
                  <HiUserGroup className="w-4 h-4" />
                  <span>{shift.employeeCount || 0} employees</span>
                </button>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    shift.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {shift.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-secondary-200">
              <h2 className="text-xl font-bold text-secondary-900">
                {editingShift ? 'Edit Shift' : 'Add Shift'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Shift Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Morning Shift"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Code *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., MRN"
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
                  placeholder="Shift description..."
                />
              </div>

              {/* Time Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    End Time *
                  </label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Break Duration (mins)
                  </label>
                  <input
                    type="number"
                    value={formData.breakDuration}
                    onChange={(e) =>
                      setFormData({ ...formData, breakDuration: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                  />
                </div>
              </div>

              {/* Tolerance Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Late Tolerance (mins)
                  </label>
                  <input
                    type="number"
                    value={formData.allowedLateMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowedLateMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Early Leave Tolerance (mins)
                  </label>
                  <input
                    type="number"
                    value={formData.allowedEarlyLeaveMinutes}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        allowedEarlyLeaveMinutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Overtime After (mins)
                  </label>
                  <input
                    type="number"
                    value={formData.overtimeThreshold}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        overtimeThreshold: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    min="0"
                  />
                </div>
              </div>

              {/* Weekly Off Days */}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Weekly Off Days
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day, index) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleWeeklyOff(index)}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        formData.weeklyOffDays.includes(index)
                          ? 'bg-red-100 border-red-300 text-red-700'
                          : 'bg-white border-secondary-200 text-secondary-700 hover:bg-secondary-50'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-secondary-500 mt-1">
                  Click to toggle weekly off days (highlighted = off)
                </p>
              </div>

              {/* Color & Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-12 h-10 border border-secondary-200 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="flex-1 px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.isActive ? 'active' : 'inactive'}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.value === 'active' })
                    }
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-secondary-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingShift ? 'Update Shift' : 'Create Shift'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Shift Allocation Modal */}
      {isAllocationModalOpen && selectedShiftForAllocation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-secondary-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${selectedShiftForAllocation.color}20` }}
                >
                  <HiClock className="w-5 h-5" style={{ color: selectedShiftForAllocation.color }} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-secondary-900">
                    {selectedShiftForAllocation.name}
                  </h2>
                  <p className="text-sm text-secondary-500">
                    {formatTime(selectedShiftForAllocation.startTime)} - {formatTime(selectedShiftForAllocation.endTime)}
                  </p>
                </div>
              </div>
              <button
                onClick={closeAllocationModal}
                className="p-2 hover:bg-secondary-100 rounded-lg"
              >
                <HiX className="w-5 h-5 text-secondary-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-secondary-200">
              <button
                onClick={() => setAllocationTab('current')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  allocationTab === 'current'
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-secondary-600 hover:bg-secondary-50'
                }`}
              >
                Current Employees ({shiftEmployees.length})
              </button>
              <button
                onClick={() => setAllocationTab('assign')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                  allocationTab === 'assign'
                    ? 'text-primary-600 border-b-2 border-primary-600 bg-primary-50'
                    : 'text-secondary-600 hover:bg-secondary-50'
                }`}
              >
                Assign Employees
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {allocationTab === 'current' ? (
                /* Current Employees Tab */
                <div>
                  {isLoadingEmployees ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  ) : shiftEmployees.length === 0 ? (
                    <div className="text-center py-12">
                      <HiUserGroup className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                      <p className="text-secondary-600">No employees assigned to this shift</p>
                      <button
                        onClick={() => setAllocationTab('assign')}
                        className="mt-4 text-primary-600 hover:text-primary-700"
                      >
                        Assign employees now
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {shiftEmployees.map((employee) => (
                        <div
                          key={employee._id}
                          className="flex items-center justify-between p-3 bg-secondary-50 rounded-lg hover:bg-secondary-100"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-primary-700 font-medium text-sm">
                                {employee.firstName?.[0]}{employee.lastName?.[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="text-sm text-secondary-500">
                                {employee.employeeCode} • {employee.designation || 'N/A'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-secondary-500">
                              {employee.departmentId?.name || 'No Dept'}
                            </span>
                            <button
                              onClick={() => handleRemoveFromShift(employee._id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Remove from shift"
                            >
                              <HiX className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                /* Assign Employees Tab */
                <div>
                  {/* Search and Actions */}
                  <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="flex-1 relative">
                      <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
                      <input
                        type="text"
                        placeholder="Search employees..."
                        value={employeeSearchTerm}
                        onChange={(e) => setEmployeeSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={selectAllFilteredEmployees}
                        className="px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-100 rounded-lg"
                      >
                        Select All
                      </button>
                      <button
                        onClick={clearSelection}
                        className="px-3 py-2 text-sm text-secondary-700 hover:bg-secondary-100 rounded-lg"
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  {/* Selected Count */}
                  {selectedEmployees.length > 0 && (
                    <div className="mb-4 p-3 bg-primary-50 border border-primary-200 rounded-lg flex items-center justify-between">
                      <span className="text-sm text-primary-700">
                        {selectedEmployees.length} employee(s) selected
                      </span>
                      <button
                        onClick={handleBulkAssign}
                        className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                      >
                        Assign to Shift
                      </button>
                    </div>
                  )}

                  {/* Employee List */}
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {getUnassignedEmployees().length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-secondary-600">
                          {employeeSearchTerm
                            ? 'No employees match your search'
                            : 'All employees are already assigned to this shift'}
                        </p>
                      </div>
                    ) : (
                      getUnassignedEmployees().map((employee) => (
                        <div
                          key={employee._id}
                          onClick={() => toggleEmployeeSelection(employee._id)}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            selectedEmployees.includes(employee._id)
                              ? 'bg-primary-50 border-2 border-primary-300'
                              : 'bg-secondary-50 hover:bg-secondary-100 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                selectedEmployees.includes(employee._id)
                                  ? 'bg-primary-600 border-primary-600'
                                  : 'border-secondary-300'
                              }`}
                            >
                              {selectedEmployees.includes(employee._id) && (
                                <HiCheck className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-primary-700 font-medium text-sm">
                                {employee.firstName?.[0]}{employee.lastName?.[0]}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900">
                                {employee.firstName} {employee.lastName}
                              </p>
                              <p className="text-sm text-secondary-500">
                                {employee.employeeCode} • {employee.email}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-secondary-600">{employee.designation || 'N/A'}</p>
                            <p className="text-xs text-secondary-500">
                              {employee.departmentId?.name || 'No Department'}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-secondary-200 bg-secondary-50">
              <div className="flex items-center justify-between">
                <p className="text-sm text-secondary-600">
                  Total: {shiftEmployees.length} employee(s) in this shift
                </p>
                <button
                  onClick={closeAllocationModal}
                  className="px-4 py-2 text-secondary-700 hover:bg-secondary-200 rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shifts;
