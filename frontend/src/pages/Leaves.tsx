import React, { useState, useEffect } from 'react';
import { HiCalendar, HiCheck, HiX, HiPlus, HiSearch } from 'react-icons/hi';
import api from '../services/api';
import { useAppSelector } from '../hooks/useAppDispatch';
import SortableTableHeader, { useSortConfig } from '../components/common/SortableTableHeader';

interface LeaveType {
  _id: string;
  name: string;
  code: string;
  defaultDays: number;
  isPaid: boolean;
  allowHalfDay: boolean;
  isActive: boolean;
}

interface LeaveRequest {
  _id: string;
  employeeId?: string;
  employee?: {
    _id: string;
    firstName: string;
    lastName: string;
    department?: { name: string };
  };
  leaveTypeId?: {
    _id: string;
    name: string;
    code: string;
  };
  leaveType?: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  createdAt: string;
}

const Leaves: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const { sortConfig, handleSort } = useSortConfig('createdAt', 'desc');
  const { user } = useAppSelector((state) => state.auth);
  // Show actions for admin, hr, manager, or tenant_admin roles
  const isManager = ['admin', 'hr', 'manager', 'tenant_admin', 'hr_manager', 'super_admin'].includes(user?.role || '');

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
  });

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [filter, pagination.page, pagination.limit, sortConfig]);

  const fetchLeaveTypes = async () => {
    try {
      const response = await api.get('/leaves/types?isActive=true');
      const types = response.data.data?.leaveTypes || [];
      setLeaveTypes(types);
      if (types.length > 0 && !formData.leaveTypeId) {
        setFormData((prev) => ({ ...prev, leaveTypeId: types[0]._id }));
      }
    } catch (error) {
      console.error('Failed to fetch leave types:', error);
    }
  };

  const fetchLeaves = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (filter !== 'all') params.append('status', filter);
      if (searchTerm) params.append('search', searchTerm);
      if (sortConfig.key) {
        params.append('sortBy', sortConfig.key);
        params.append('sortOrder', sortConfig.order || 'desc');
      }

      const response = await api.get(`/leaves/requests?${params}`);
      setLeaves(response.data.data?.leaves || []);
      if (response.data.data?.pagination) {
        setPagination((prev) => ({
          ...prev,
          total: response.data.data.pagination.total || 0,
          pages: response.data.data.pagination.pages || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      setLeaves([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchLeaves();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/leaves/requests', formData);
      setIsModalOpen(false);
      setFormData({
        leaveTypeId: leaveTypes[0]?._id || '',
        startDate: '',
        endDate: '',
        reason: '',
        isHalfDay: false,
      });
      fetchLeaves();
    } catch (error: unknown) {
      console.error('Failed to submit leave request:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      if (axiosError.response?.data?.message) {
        alert(axiosError.response.data.message);
      }
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await api.patch(`/leaves/requests/${id}/approve`);
      fetchLeaves();
    } catch (error) {
      console.error('Failed to approve leave:', error);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingLeaveId(id);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingLeaveId) return;
    try {
      await api.patch(`/leaves/requests/${rejectingLeaveId}/reject`, {
        reason: rejectionReason,
      });
      setIsRejectModalOpen(false);
      setRejectingLeaveId(null);
      setRejectionReason('');
      fetchLeaves();
    } catch (error) {
      console.error('Failed to reject leave:', error);
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

  const getLeaveTypeBadge = (leave: LeaveRequest) => {
    const type = leave.leaveTypeId?.name || leave.leaveType || 'unknown';
    const typeLower = type.toLowerCase();

    // Colorful badges with icons for each leave type
    const styles: Record<string, { bg: string; text: string; border: string; icon: string }> = {
      'annual leave': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '🌴' },
      'annual': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', icon: '🌴' },
      'sick leave': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '🏥' },
      'sick': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', icon: '🏥' },
      'casual leave': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: '☕' },
      'casual': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', icon: '☕' },
      'maternity leave': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: '👶' },
      'maternity': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', icon: '👶' },
      'paternity leave': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: '👨‍👧' },
      'paternity': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', icon: '👨‍👧' },
      'unpaid leave': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: '📋' },
      'unpaid': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: '📋' },
      'personal': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', icon: '🏠' },
      'compensatory': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '⏰' },
      'bereavement': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', icon: '🕯️' },
    };

    const style = styles[typeLower] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200', icon: '📅' };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${style.bg} ${style.text} ${style.border}`}>
        <span>{style.icon}</span>
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

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="flex-1 relative">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors"
            >
              Search
            </button>
          </form>
          <div className="flex items-center gap-2">
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                onClick={() => {
                  setFilter(status);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
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
        </div>
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
                <SortableTableHeader
                  label="Type"
                  sortKey="leaveTypeId"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Start Date"
                  sortKey="startDate"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Days"
                  sortKey="days"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Status"
                  sortKey="status"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
                <SortableTableHeader
                  label="Requested"
                  sortKey="createdAt"
                  currentSort={sortConfig}
                  onSort={handleSort}
                />
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
                  <td colSpan={isManager ? 7 : 6} className="px-6 py-12 text-center">
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
                          {leave.employee?.firstName || 'N/A'} {leave.employee?.lastName || ''}
                        </p>
                        {leave.employee?.department && (
                          <p className="text-sm text-secondary-500">
                            {leave.employee.department.name}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getLeaveTypeBadge(leave)}</td>
                    <td className="px-6 py-4 text-secondary-600">
                      {new Date(leave.startDate).toLocaleDateString()} -{' '}
                      {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-secondary-600">{leave.days}</td>
                    <td className="px-6 py-4">{getStatusBadge(leave.status)}</td>
                    <td className="px-6 py-4 text-secondary-600">
                      {new Date(leave.createdAt).toLocaleDateString()}
                    </td>
                    {isManager && (
                      <td className="px-6 py-4 text-right">
                        {leave.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleApprove(leave._id)}
                              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                              title="Approve"
                            >
                              <HiCheck className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openRejectModal(leave._id)}
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

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-secondary-200">
          <div className="flex items-center gap-4">
            <p className="text-sm text-secondary-500">
              Showing {pagination.total > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} requests
            </p>
            <div className="flex items-center gap-2">
              <label className="text-sm text-secondary-500">Rows per page:</label>
              <select
                value={pagination.limit}
                onChange={(e) => setPagination((prev) => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                className="px-2 py-1 text-sm border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={40}>40</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1 text-sm border border-secondary-200 rounded-lg hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-secondary-600">
              Page {pagination.page} of {pagination.pages || 1}
            </span>
            <button
              onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages || pagination.pages === 0}
              className="px-3 py-1 text-sm border border-secondary-200 rounded-lg hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
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
                  value={formData.leaveTypeId}
                  onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select leave type...</option>
                  {leaveTypes.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.name} ({type.defaultDays} days)
                    </option>
                  ))}
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
              {leaveTypes.find(t => t._id === formData.leaveTypeId)?.allowHalfDay && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isHalfDay}
                    onChange={(e) => setFormData({ ...formData, isHalfDay: e.target.checked })}
                    className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm text-secondary-700">Half Day Leave</span>
                </label>
              )}
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

      {/* Rejection Reason Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-secondary-900 mb-4">Reject Leave Request</h2>
            <p className="text-secondary-600 mb-4">
              Please provide a reason for rejecting this leave request.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Enter reason for rejection..."
                required
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectingLeaveId(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaves;
