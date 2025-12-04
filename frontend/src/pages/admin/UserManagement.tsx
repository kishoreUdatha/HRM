import { useState, useEffect } from 'react';
import api from '../../services/api';

interface User {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  lastLogin?: string;
  createdAt: string;
}

interface UserStats {
  totalUsers: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
}

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'employee',
  });

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [searchQuery, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (roleFilter) params.append('role', roleFilter);
      if (statusFilter) params.append('status', statusFilter);

      const response = await api.get(`/auth/admin/users?${params}`);
      setUsers(response.data.data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/auth/admin/users/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/auth/admin/users', newUser);
      setShowCreateModal(false);
      setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'employee' });
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleStatusChange = async (userId: string, status: string) => {
    try {
      await api.put(`/auth/admin/users/${userId}/status`, { status });
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await api.put(`/auth/admin/users/${userId}/role`, { role });
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleBulkAction = async (action: string, value?: string) => {
    if (selectedUsers.length === 0) return;
    try {
      await api.post('/auth/admin/users/bulk', {
        userIds: selectedUsers,
        action,
        value,
      });
      setSelectedUsers([]);
      fetchUsers();
      fetchStats();
    } catch (error) {
      console.error('Failed to perform bulk action:', error);
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      tenant_admin: 'bg-purple-100 text-purple-800',
      hr: 'bg-blue-100 text-blue-800',
      manager: 'bg-green-100 text-green-800',
      employee: 'bg-gray-100 text-gray-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      suspended: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add User
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Users</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalUsers}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Active Users</div>
            <div className="text-2xl font-bold text-green-600">{stats.byStatus?.active || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Admins</div>
            <div className="text-2xl font-bold text-purple-600">{stats.byRole?.tenant_admin || 0}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">HR Managers</div>
            <div className="text-2xl font-bold text-blue-600">{stats.byRole?.hr || 0}</div>
          </div>
        </div>
      )}

      {/* Filters and Bulk Actions */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <input
            type="text"
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Roles</option>
            <option value="tenant_admin">Admin</option>
            <option value="hr">HR</option>
            <option value="manager">Manager</option>
            <option value="employee">Employee</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>

          {selectedUsers.length > 0 && (
            <div className="flex gap-2 ml-auto">
              <span className="text-sm text-gray-500 self-center">{selectedUsers.length} selected</span>
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('deactivate')}
                className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Deactivate
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={(e) =>
                      setSelectedUsers(e.target.checked ? users.map((u) => u._id) : [])
                    }
                    className="rounded"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Login</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={(e) =>
                          setSelectedUsers((prev) =>
                            e.target.checked
                              ? [...prev, user._id]
                              : prev.filter((id) => id !== user._id)
                          )
                        }
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-medium text-gray-600">
                          {user.firstName[0]}{user.lastName[0]}
                        </div>
                        <div className="ml-3">
                          <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user._id, e.target.value)}
                        className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${getRoleBadge(user.role)}`}
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="hr">HR</option>
                        <option value="tenant_admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(user.status)}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {user.status === 'active' ? (
                        <button
                          onClick={() => handleStatusChange(user._id, 'inactive')}
                          className="text-red-600 hover:text-red-900 mr-3"
                        >
                          Deactivate
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStatusChange(user._id, 'active')}
                          className="text-green-600 hover:text-green-900 mr-3"
                        >
                          Activate
                        </button>
                      )}
                      <button className="text-blue-600 hover:text-blue-900">Reset Password</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold mb-4">Add New User</h2>
            <form onSubmit={handleCreateUser}>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      required
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="hr">HR</option>
                    <option value="tenant_admin">Admin</option>
                  </select>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
