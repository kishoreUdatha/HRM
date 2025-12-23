import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface Role {
  id: string;
  name: string;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

const RoleManagement = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [editedPermissions, setEditedPermissions] = useState<string[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // Permission categories - these define all available permissions
  const permissionCategories: { category: string; permissions: Permission[] }[] = [
    {
      category: 'Employees',
      permissions: [
        { id: 'employees:read', name: 'View Employees', description: 'View employee directory and profiles', category: 'Employees' },
        { id: 'employees:write', name: 'Create/Edit Employees', description: 'Add and modify employee information', category: 'Employees' },
        { id: 'employees:delete', name: 'Delete Employees', description: 'Remove employees from the system', category: 'Employees' },
      ],
    },
    {
      category: 'Attendance',
      permissions: [
        { id: 'attendance:read', name: 'View Attendance', description: 'View attendance records', category: 'Attendance' },
        { id: 'attendance:write', name: 'Manage Attendance', description: 'Edit and correct attendance records', category: 'Attendance' },
        { id: 'attendance:checkin', name: 'Check In/Out', description: 'Mark attendance check-in and check-out', category: 'Attendance' },
      ],
    },
    {
      category: 'Leave Management',
      permissions: [
        { id: 'leaves:read', name: 'View Leaves', description: 'View leave requests and balances', category: 'Leave Management' },
        { id: 'leaves:write', name: 'Manage Leaves', description: 'Create and edit leave requests', category: 'Leave Management' },
        { id: 'leaves:approve', name: 'Approve Leaves', description: 'Approve or reject leave requests', category: 'Leave Management' },
      ],
    },
    {
      category: 'Payroll',
      permissions: [
        { id: 'payroll:read', name: 'View Payroll', description: 'View payroll information', category: 'Payroll' },
        { id: 'payroll:write', name: 'Manage Payroll', description: 'Process and manage payroll', category: 'Payroll' },
      ],
    },
    {
      category: 'Recruitment',
      permissions: [
        { id: 'recruitment:read', name: 'View Recruitment', description: 'View job postings and applications', category: 'Recruitment' },
        { id: 'recruitment:write', name: 'Manage Recruitment', description: 'Create jobs, manage applications', category: 'Recruitment' },
      ],
    },
    {
      category: 'Reports',
      permissions: [
        { id: 'reports:read', name: 'View Reports', description: 'Access organizational reports', category: 'Reports' },
        { id: 'reports:export', name: 'Export Reports', description: 'Export reports to various formats', category: 'Reports' },
      ],
    },
    {
      category: 'Users & Settings',
      permissions: [
        { id: 'users:read', name: 'View Users', description: 'View user accounts', category: 'Users & Settings' },
        { id: 'users:write', name: 'Manage Users', description: 'Create, edit users', category: 'Users & Settings' },
        { id: 'users:delete', name: 'Delete Users', description: 'Remove user accounts', category: 'Users & Settings' },
        { id: 'settings:read', name: 'View Settings', description: 'View organization settings', category: 'Users & Settings' },
        { id: 'settings:write', name: 'Manage Settings', description: 'Modify organization settings', category: 'Users & Settings' },
      ],
    },
  ];

  // Default role configurations
  const defaultRoles: Role[] = [
    {
      id: 'tenant_admin',
      name: 'tenant_admin',
      displayName: 'Administrator',
      description: 'Full access to all features and settings',
      permissions: ['*'],
      isSystem: true,
      userCount: 0,
    },
    {
      id: 'hr',
      name: 'hr',
      displayName: 'HR Manager',
      description: 'Manage employees, recruitment, attendance, and leaves',
      permissions: [
        'employees:read', 'employees:write', 'employees:delete',
        'attendance:read', 'attendance:write',
        'leaves:read', 'leaves:write', 'leaves:approve',
        'payroll:read', 'payroll:write',
        'recruitment:read', 'recruitment:write',
        'reports:read', 'reports:export',
        'users:read',
      ],
      isSystem: true,
      userCount: 0,
    },
    {
      id: 'manager',
      name: 'manager',
      displayName: 'Manager',
      description: 'Manage team members, approve leaves, view reports',
      permissions: [
        'employees:read',
        'attendance:read', 'attendance:write',
        'leaves:read', 'leaves:approve',
        'reports:read',
      ],
      isSystem: true,
      userCount: 0,
    },
    {
      id: 'employee',
      name: 'employee',
      displayName: 'Employee',
      description: 'Basic access to personal information and self-service features',
      permissions: [
        'attendance:read', 'attendance:checkin',
        'leaves:read', 'leaves:write',
      ],
      isSystem: true,
      userCount: 0,
    },
  ];

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      // Try to fetch roles from backend
      const response = await api.get('/auth/admin/roles');
      if (response.data.success && response.data.data?.length > 0) {
        setRoles(response.data.data);
      } else {
        // Use default roles if none exist
        setRoles(defaultRoles);
      }
    } catch (error) {
      console.log('Using default roles');
      // Fetch user counts for default roles
      try {
        const usersResponse = await api.get('/auth/admin/users/stats');
        if (usersResponse.data.success) {
          const byRole = usersResponse.data.data.byRole || {};
          setRoles(defaultRoles.map(role => ({
            ...role,
            userCount: byRole[role.name] || 0
          })));
        } else {
          setRoles(defaultRoles);
        }
      } catch {
        setRoles(defaultRoles);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setEditedPermissions([...role.permissions]);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setEditingRole(null);
    setEditedPermissions([]);
    setIsEditing(false);
  };

  const handlePermissionToggle = (permissionId: string) => {
    if (editedPermissions.includes('*')) {
      // If role has full access, don't allow toggling individual permissions
      return;
    }

    setEditedPermissions(prev =>
      prev.includes(permissionId)
        ? prev.filter(p => p !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSelectAllInCategory = (category: { category: string; permissions: Permission[] }) => {
    const categoryPermissionIds = category.permissions.map(p => p.id);
    const allSelected = categoryPermissionIds.every(id => editedPermissions.includes(id));

    if (allSelected) {
      // Deselect all in category
      setEditedPermissions(prev => prev.filter(p => !categoryPermissionIds.includes(p)));
    } else {
      // Select all in category
      setEditedPermissions(prev => [...new Set([...prev, ...categoryPermissionIds])]);
    }
  };

  const handleSavePermissions = async () => {
    if (!editingRole) return;

    setIsSaving(true);
    try {
      await api.put(`/auth/admin/roles/${editingRole.name}/permissions`, {
        permissions: editedPermissions,
      });

      // Update local state
      setRoles(prev => prev.map(role =>
        role.name === editingRole.name
          ? { ...role, permissions: editedPermissions }
          : role
      ));

      if (selectedRole?.name === editingRole.name) {
        setSelectedRole({ ...selectedRole, permissions: editedPermissions });
      }

      toast.success(`Permissions updated for ${editingRole.displayName}`);
      handleCancelEdit();
    } catch (error: any) {
      console.error('Failed to save permissions:', error);
      toast.error(error.response?.data?.message || 'Failed to save permissions');
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleBadgeColor = (roleName: string) => {
    const colors: Record<string, string> = {
      tenant_admin: 'bg-purple-100 text-purple-800 border-purple-200',
      hr: 'bg-blue-100 text-blue-800 border-blue-200',
      manager: 'bg-green-100 text-green-800 border-green-200',
      employee: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[roleName] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getRoleIcon = (roleName: string) => {
    const icons: Record<string, string> = {
      tenant_admin: '👑',
      hr: '🎯',
      manager: '👔',
      employee: '👤',
    };
    return icons[roleName] || '👤';
  };

  const hasPermission = (permissions: string[], permissionId: string) => {
    return permissions.includes('*') || permissions.includes(permissionId);
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Role Management</h1>
          <p className="text-gray-500">Manage roles and permissions for your organization</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Roles</h2>
            </div>
            <div className="divide-y divide-gray-200">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => {
                    setSelectedRole(role);
                    if (isEditing) handleCancelEdit();
                  }}
                  className={`w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedRole?.id === role.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getRoleIcon(role.name)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{role.displayName}</span>
                        {role.isSystem && (
                          <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-500 rounded">
                            System
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-1">{role.description}</p>
                      <p className="text-xs text-gray-400 mt-1">{role.userCount} users</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Role Details / Edit Panel */}
        <div className="lg:col-span-2">
          {selectedRole ? (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{getRoleIcon(selectedRole.name)}</span>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">{selectedRole.displayName}</h2>
                    <p className="text-sm text-gray-500">{selectedRole.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(selectedRole.name)}`}>
                    {selectedRole.userCount} users
                  </span>
                  {!isEditing && selectedRole.name !== 'tenant_admin' && (
                    <button
                      onClick={() => handleEditRole(selectedRole)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                    >
                      Edit Permissions
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {selectedRole.permissions.includes('*') ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🔑</span>
                      <div>
                        <p className="font-medium text-purple-900">Full Access</p>
                        <p className="text-sm text-purple-700">This role has access to all features and settings. Permissions cannot be modified.</p>
                      </div>
                    </div>
                  </div>
                ) : isEditing && editingRole?.name === selectedRole.name ? (
                  /* Edit Mode */
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Edit Permissions</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCancelEdit}
                          disabled={isSaving}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSavePermissions}
                          disabled={isSaving}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSaving ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save Changes'
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {permissionCategories.map((category) => {
                        const categoryPermissionIds = category.permissions.map(p => p.id);
                        const selectedCount = categoryPermissionIds.filter(id => editedPermissions.includes(id)).length;
                        const allSelected = selectedCount === category.permissions.length;

                        return (
                          <div key={category.category} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-semibold text-gray-900">{category.category}</h4>
                              <button
                                onClick={() => handleSelectAllInCategory(category)}
                                className="text-sm text-blue-600 hover:text-blue-700"
                              >
                                {allSelected ? 'Deselect All' : 'Select All'}
                              </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {category.permissions.map((permission) => (
                                <label
                                  key={permission.id}
                                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors ${
                                    editedPermissions.includes(permission.id)
                                      ? 'bg-blue-50 border-blue-300'
                                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={editedPermissions.includes(permission.id)}
                                    onChange={() => handlePermissionToggle(permission.id)}
                                    className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                                  />
                                  <div>
                                    <span className="font-medium text-gray-900 text-sm">{permission.name}</span>
                                    <p className="text-xs text-gray-500">{permission.description}</p>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Permissions</h3>
                    <div className="space-y-4">
                      {permissionCategories.map((category) => {
                        const categoryPermissions = category.permissions.filter(
                          (p) => hasPermission(selectedRole.permissions, p.id)
                        );

                        return (
                          <div key={category.category} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-700">{category.category}</h4>
                              <span className="text-xs text-gray-500">
                                {categoryPermissions.length}/{category.permissions.length} permissions
                              </span>
                            </div>
                            {categoryPermissions.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {categoryPermissions.map((permission) => (
                                  <div
                                    key={permission.id}
                                    className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded"
                                  >
                                    <span className="text-green-600">✓</span>
                                    <span className="text-sm text-green-800">{permission.name}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-400 italic">No permissions in this category</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">👈</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Role</h3>
              <p className="text-gray-500">Click on a role to view and edit its permissions</p>
            </div>
          )}
        </div>
      </div>

      {/* Role Permission Matrix */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Permission Matrix</h2>
          <p className="text-sm text-gray-500">Overview of permissions across all roles</p>
        </div>
        <div className="p-6 overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 pr-4 text-sm font-medium text-gray-500">Permission</th>
                {roles.map((role) => (
                  <th key={role.id} className="text-center py-3 px-4 text-sm font-medium text-gray-500 whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xl">{getRoleIcon(role.name)}</span>
                      <span>{role.displayName}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionCategories.map((category) => (
                <>
                  <tr key={`${category.category}-header`} className="bg-gray-50">
                    <td colSpan={roles.length + 1} className="py-2 px-4 font-semibold text-gray-700 text-sm">
                      {category.category}
                    </td>
                  </tr>
                  {category.permissions.map((permission) => (
                    <tr key={permission.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 pr-4 text-sm text-gray-700">{permission.name}</td>
                      {roles.map((role) => (
                        <td key={`${role.id}-${permission.id}`} className="text-center py-2 px-4">
                          {hasPermission(role.permissions, permission.id) ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-green-100 text-green-600 rounded-full text-xs">✓</span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 text-gray-400 rounded-full text-xs">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
