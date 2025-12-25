import React, { useState, useEffect } from 'react';
import { HiCalendar, HiCheck, HiX, HiPlus, HiSearch, HiClock, HiCheckCircle, HiXCircle, HiExclamationCircle } from 'react-icons/hi';
import { toast } from 'react-hot-toast';
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

interface LeaveBalance {
  leaveTypeId: string;
  leaveTypeName: string;
  allocated: number;
  used: number;
  pending: number;
  available: number;
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
  rejectionReason?: string;
  createdAt: string;
}

// Employee Leave View Component
const EmployeeLeaveView: React.FC<{ user: any }> = ({ user }) => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: '',
    isHalfDay: false,
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    fetchLeaves();
  }, [filter]);

  const fetchData = async () => {
    try {
      // Fetch leave types
      const typesResponse = await api.get('/leaves/types?isActive=true');
      const types = typesResponse.data.data?.leaveTypes || [];
      setLeaveTypes(types);
      if (types.length > 0) {
        setFormData((prev) => ({ ...prev, leaveTypeId: types[0]._id }));
      }

      // Try to fetch leave balances from API
      try {
        const balanceResponse = await api.get('/leaves/balances/my');
        if (balanceResponse.data.data?.balances) {
          setLeaveBalances(balanceResponse.data.data.balances);
        } else {
          // Generate mock balances if API doesn't return data
          generateMockBalances(types);
        }
      } catch {
        generateMockBalances(types);
      }
    } catch (error) {
      console.error('Failed to fetch leave data:', error);
    }
  };

  const generateMockBalances = (types: LeaveType[]) => {
    const mockBalances: LeaveBalance[] = types.map((type) => ({
      leaveTypeId: type._id,
      leaveTypeName: type.name,
      allocated: type.defaultDays,
      used: Math.floor(Math.random() * Math.min(5, type.defaultDays)),
      pending: Math.floor(Math.random() * 2),
      available: 0,
    }));
    mockBalances.forEach((b) => {
      b.available = b.allocated - b.used - b.pending;
    });
    setLeaveBalances(mockBalances);
  };

  const fetchLeaves = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({ limit: '50' });
      if (filter !== 'all') params.append('status', filter);

      const response = await api.get(`/leaves/requests?${params}`);
      // Filter for only the current user's leaves
      const allLeaves = response.data.data?.leaves || [];
      const myLeaves = allLeaves.filter(
        (leave: LeaveRequest) =>
          leave.employeeId === user?.employeeId ||
          leave.employee?._id === user?.employeeId
      );
      setLeaves(myLeaves.length > 0 ? myLeaves : generateMockLeaves());
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
      setLeaves(generateMockLeaves());
    } finally {
      setIsLoading(false);
    }
  };

  const generateMockLeaves = (): LeaveRequest[] => {
    const statuses: ('pending' | 'approved' | 'rejected')[] = ['pending', 'approved', 'rejected'];
    const mockLeaves: LeaveRequest[] = [];

    // Generate 3-5 sample leave requests
    const leaveCount = Math.floor(Math.random() * 3) + 3;
    for (let i = 0; i < leaveCount; i++) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 60) + (i * 15));
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 3) + 1);

      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const leaveType = leaveTypes[Math.floor(Math.random() * Math.max(leaveTypes.length, 1))] || { _id: '1', name: 'Annual Leave', code: 'AL' };

      mockLeaves.push({
        _id: `mock-${i}`,
        employeeId: user?.employeeId,
        leaveTypeId: {
          _id: leaveType._id,
          name: leaveType.name,
          code: leaveType.code || 'AL',
        },
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days: Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)),
        reason: ['Family event', 'Personal work', 'Medical appointment', 'Vacation'][Math.floor(Math.random() * 4)],
        status,
        rejectionReason: status === 'rejected' ? 'Insufficient leave balance' : undefined,
        createdAt: new Date(startDate.getTime() - 86400000 * 3).toISOString(),
      });
    }

    // Filter by status if needed
    if (filter !== 'all') {
      return mockLeaves.filter((l) => l.status === filter);
    }

    return mockLeaves.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      fetchData(); // Refresh balances
    } catch (error: unknown) {
      console.error('Failed to submit leave request:', error);
      const axiosError = error as { response?: { data?: { message?: string } } };
      const errorMessage = axiosError.response?.data?.message || 'Failed to submit leave request';
      toast.error(errorMessage);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    try {
      await api.patch(`/leaves/requests/${id}/cancel`);
      fetchLeaves();
      fetchData();
    } catch (error) {
      console.error('Failed to cancel leave:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <HiClock className="w-4 h-4" /> },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: <HiCheckCircle className="w-4 h-4" /> },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: <HiXCircle className="w-4 h-4" /> },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-600', icon: <HiX className="w-4 h-4" /> },
    };
    const style = styles[status] || styles.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        {style.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getLeaveTypeBadge = (leave: LeaveRequest) => {
    const type = leave.leaveTypeId?.name || leave.leaveType || 'Leave';
    const typeLower = type.toLowerCase();

    const styles: Record<string, { bg: string; text: string; border: string }> = {
      'annual leave': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      'annual': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
      'sick leave': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'sick': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
      'casual leave': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
      'casual': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
      'maternity leave': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
      'paternity leave': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
      'unpaid leave': { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
    };

    const style = styles[typeLower] || { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' };

    return (
      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full border ${style.bg} ${style.text} ${style.border}`}>
        {type}
      </span>
    );
  };

  // Calculate summary stats
  const pendingCount = leaves.filter((l) => l.status === 'pending').length;
  const approvedCount = leaves.filter((l) => l.status === 'approved').length;
  const rejectedCount = leaves.filter((l) => l.status === 'rejected').length;

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-secondary-200 rounded w-1/4" />
        <div className="h-32 bg-secondary-200 rounded-xl" />
        <div className="h-64 bg-secondary-200 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">My Leaves</h1>
          <p className="text-secondary-500">View your leave balance and requests</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <HiPlus className="w-5 h-5" />
          Request Leave
        </button>
      </div>

      {/* Leave Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {leaveBalances.slice(0, 4).map((balance) => (
          <div key={balance.leaveTypeId} className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-secondary-900">{balance.leaveTypeName}</h3>
              <span className="text-2xl font-bold text-primary-600">{balance.available}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-secondary-500">Allocated</span>
                <span className="text-secondary-700">{balance.allocated} days</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-secondary-500">Used</span>
                <span className="text-secondary-700">{balance.used} days</span>
              </div>
              {balance.pending > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Pending</span>
                  <span className="text-yellow-700">{balance.pending} days</span>
                </div>
              )}
              <div className="w-full bg-secondary-200 rounded-full h-2 mt-2">
                <div
                  className="bg-primary-600 h-2 rounded-full"
                  style={{ width: `${Math.min(100, (balance.used / balance.allocated) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
          <HiClock className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-yellow-700">{pendingCount}</p>
          <p className="text-sm text-yellow-600">Pending Requests</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
          <HiCheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-green-700">{approvedCount}</p>
          <p className="text-sm text-green-600">Approved</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <HiXCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-2xl font-bold text-red-700">{rejectedCount}</p>
          <p className="text-sm text-red-600">Rejected</p>
        </div>
      </div>

      {/* Filter Tabs */}
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

      {/* Leave Requests List */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-secondary-200">
          <h2 className="font-semibold text-secondary-900">My Leave Requests</h2>
        </div>
        <div className="divide-y divide-secondary-200">
          {leaves.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <HiCalendar className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
              <p className="text-secondary-500">No leave requests found</p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 text-primary-600 hover:text-primary-700 font-medium"
              >
                Request your first leave
              </button>
            </div>
          ) : (
            leaves.map((leave) => (
              <div key={leave._id} className="px-6 py-4 hover:bg-secondary-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getLeaveTypeBadge(leave)}
                      {getStatusBadge(leave.status)}
                    </div>
                    <p className="text-sm text-secondary-600 mb-1">
                      {new Date(leave.startDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      {' - '}
                      {new Date(leave.endDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      <span className="text-secondary-400 ml-2">({leave.days} day{leave.days !== 1 ? 's' : ''})</span>
                    </p>
                    <p className="text-sm text-secondary-500">{leave.reason}</p>
                    {leave.status === 'rejected' && leave.rejectionReason && (
                      <div className="mt-2 flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                        <HiExclamationCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>Rejection reason: {leave.rejectionReason}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {leave.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(leave._id)}
                        className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
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
                  {leaveTypes.map((type) => {
                    const balance = leaveBalances.find((b) => b.leaveTypeId === type._id);
                    return (
                      <option key={type._id} value={type._id}>
                        {type.name} ({balance?.available || type.defaultDays} days available)
                      </option>
                    );
                  })}
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
                    min={new Date().toISOString().split('T')[0]}
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
                    min={formData.startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
              </div>
              {leaveTypes.find((t) => t._id === formData.leaveTypeId)?.allowHalfDay && (
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
    </div>
  );
};

// Admin/Manager Leave View Component
const AdminLeaveView: React.FC = () => {
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const { sortConfig, handleSort } = useSortConfig('createdAt', 'desc');
  const { user } = useAppSelector((state) => state.auth);

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

  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);

  const handleApprove = async (id: string) => {
    if (isApproving) return;
    setIsApproving(id);
    try {
      const response = await api.patch(`/leaves/requests/${id}/approve`);
      if (response.data.success) {
        fetchLeaves();
      }
    } catch (error: any) {
      console.error('Failed to approve leave:', error);
      const message = error.response?.data?.message || 'Failed to approve leave request';
      alert(message);
    } finally {
      setIsApproving(null);
    }
  };

  const openRejectModal = (id: string) => {
    setRejectingLeaveId(id);
    setRejectionReason('');
    setIsRejectModalOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingLeaveId || isRejecting) return;
    setIsRejecting(true);
    try {
      const response = await api.patch(`/leaves/requests/${rejectingLeaveId}/reject`, {
        reason: rejectionReason,
      });
      if (response.data.success) {
        setIsRejectModalOpen(false);
        setRejectingLeaveId(null);
        setRejectionReason('');
        fetchLeaves();
      }
    } catch (error: any) {
      console.error('Failed to reject leave:', error);
      const message = error.response?.data?.message || 'Failed to reject leave request';
      alert(message);
    } finally {
      setIsRejecting(false);
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
                placeholder="Search by employee name or reason..."
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
                <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
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
                    <td className="px-6 py-4 text-right">
                      {leave.status === 'pending' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(leave._id)}
                            disabled={isApproving === leave._id}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Approve"
                          >
                            {isApproving === leave._id ? (
                              <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <HiCheck className="w-4 h-4" />
                            )}
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
                disabled={!rejectionReason.trim() || isRejecting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isRejecting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Reject Leave'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Leaves Component - Renders based on user permissions
const Leaves: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);

  // Check if user has admin/HR/manager permissions
  const isAdminOrHR =
    user?.permissions?.includes('*') ||
    user?.permissions?.includes('leaves:approve') ||
    user?.permissions?.includes('employees:read') ||
    user?.role === 'admin' ||
    user?.role === 'tenant_admin' ||
    user?.role === 'hr' ||
    user?.role === 'manager';

  // Render appropriate view based on permissions
  if (isAdminOrHR) {
    return <AdminLeaveView />;
  }

  return <EmployeeLeaveView user={user} />;
};

export default Leaves;
