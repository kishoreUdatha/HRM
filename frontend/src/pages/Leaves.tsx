import React, { useState, useEffect } from 'react';
import { HiCalendar, HiCheck, HiX, HiClock, HiPlus } from 'react-icons/hi';
import api from '../services/api';
import { useAppSelector } from '../hooks/useAppDispatch';

interface LeaveRequest {
  _id: string;
  employee: {
    _id: string;
    firstName: string;
    lastName: string;
    department?: { name: string };
  };
  leaveType: 'annual' | 'sick' | 'personal' | 'maternity' | 'paternity' | 'unpaid';
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
}

const Leaves: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const { user } = useAppSelector((state) => state.auth);
  const isManager = user?.role === 'admin' || user?.role === 'hr_manager';

  const [formData, setFormData] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  useEffect(() => {
    fetchLeaves();
  }, [filter]);

  const fetchLeaves = async () => {
    try {
      const params = filter !== 'all' ? `?status=${filter}` : '';
      const response = await api.get(`/leaves${params}`);
      setLeaves(response.data.data.leaves || []);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      setLeaves([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/leaves', formData);
      setIsModalOpen(false);
      setFormData({ leaveType: 'annual', startDate: '', endDate: '', reason: '' });
      fetchLeaves();
    } catch (error) {
      console.error('Failed to submit leave request:', error);
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    try {
      await api.patch(`/leaves/${id}/${action}`);
      fetchLeaves();
    } catch (error) {
      console.error(`Failed to ${action} leave:`, error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      approved: { bg: 'bg-green-100', text: 'text-green-700' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-600' },
    };
    const style = styles[status] || styles.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        {status}
      </span>
    );
  };

  const getLeaveTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      annual: 'bg-blue-100 text-blue-700',
      sick: 'bg-red-100 text-red-700',
      personal: 'bg-purple-100 text-purple-700',
      maternity: 'bg-pink-100 text-pink-700',
      paternity: 'bg-cyan-100 text-cyan-700',
      unpaid: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[type] || colors.unpaid}`}>
        {type}
      </span>
    );
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
          <h1 className="text-2xl font-bold text-secondary-900">Leave Management</h1>
          <p className="text-secondary-500">Manage leave requests and approvals</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <HiPlus className="w-5 h-5" />
          Request Leave
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2">
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              filter === status
                ? 'bg-primary-600 text-white'
                : 'bg-white text-secondary-600 border border-secondary-200 hover:bg-secondary-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Leave Requests Table */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Type
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Duration
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Days
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Status
                </th>
                {isManager && (
                  <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 5} className="px-6 py-12 text-center">
                    <HiCalendar className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                    <p className="text-secondary-500">No leave requests found</p>
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave._id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-secondary-900">
                          {leave.employee.firstName} {leave.employee.lastName}
                        </p>
                        {leave.employee.department && (
                          <p className="text-sm text-secondary-500">
                            {leave.employee.department.name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getLeaveTypeBadge(leave.leaveType)}</td>
                    <td className="px-6 py-4 text-secondary-600">
                      {new Date(leave.startDate).toLocaleDateString()} -{' '}
                      {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-secondary-600">{leave.days}</td>
                    <td className="px-6 py-4">{getStatusBadge(leave.status)}</td>
                    {isManager && (
                      <td className="px-6 py-4 text-right">
                        {leave.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleAction(leave._id, 'approve')}
                              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                              title="Approve"
                            >
                              <HiCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction(leave._id, 'reject')}
                              className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                              title="Reject"
                            >
                              <HiX className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Request Leave Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-secondary-900 mb-4">Request Leave</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Leave Type
                </label>
                <select
                  value={formData.leaveType}
                  onChange={(e) => setFormData({ ...formData, leaveType: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="annual">Annual Leave</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Leave</option>
                  <option value="maternity">Maternity Leave</option>
                  <option value="paternity">Paternity Leave</option>
                  <option value="unpaid">Unpaid Leave</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Reason for leave..."
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
