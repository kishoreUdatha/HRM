import { useState } from 'react';

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
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Predefined roles (system roles cannot be deleted)
  const roles: Role[] = [
    {
      id: '1',
      name: 'tenant_admin',
      displayName: 'Administrator',
      description: 'Full access to all features and settings',
      permissions: ['all'],
      isSystem: true,
      userCount: 2,
    },
    {
      id: '2',
      name: 'hr',
      displayName: 'HR Manager',
      description: 'Manage employees, recruitment, attendance, and leaves',
      permissions: [
        'employees.view', 'employees.create', 'employees.edit', 'employees.delete',
        'attendance.view', 'attendance.manage',
        'leaves.view', 'leaves.approve',
        'recruitment.view', 'recruitment.manage',
        'reports.view',
      ],
      isSystem: true,
      userCount: 3,
    },
    {
      id: '3',
      name: 'manager',
      displayName: 'Manager',
      description: 'Manage team members, approve leaves, view reports',
      permissions: [
        'employees.view',
        'attendance.view', 'attendance.manage_team',
        'leaves.view', 'leaves.approve_team',
        'performance.view', 'performance.manage_team',
        'reports.view_team',
      ],
      isSystem: true,
      userCount: 8,
    },
    {
      id: '4',
      name: 'employee',
      displayName: 'Employee',
      description: 'Basic access to personal information and self-service features',
      permissions: [
        'profile.view', 'profile.edit',
        'attendance.view_own', 'attendance.checkin',
        'leaves.view_own', 'leaves.request',
        'documents.view_own',
        'training.view', 'training.enroll',
      ],
      isSystem: true,
      userCount: 45,
    },
  ];

  // Permission categories
  const permissionCategories: { category: string; permissions: Permission[] }[] = [
    {
      category: 'Employees',
      permissions: [
        { id: 'employees.view', name: 'View Employees', description: 'View employee directory and profiles', category: 'Employees' },
        { id: 'employees.create', name: 'Create Employees', description: 'Add new employees to the system', category: 'Employees' },
        { id: 'employees.edit', name: 'Edit Employees', description: 'Modify employee information', category: 'Employees' },
        { id: 'employees.delete', name: 'Delete Employees', description: 'Remove employees from the system', category: 'Employees' },
      ],
    },
    {
      category: 'Attendance',
      permissions: [
        { id: 'attendance.view', name: 'View All Attendance', description: 'View attendance records for all employees', category: 'Attendance' },
        { id: 'attendance.view_own', name: 'View Own Attendance', description: 'View personal attendance records', category: 'Attendance' },
        { id: 'attendance.checkin', name: 'Check In/Out', description: 'Mark attendance check-in and check-out', category: 'Attendance' },
        { id: 'attendance.manage', name: 'Manage Attendance', description: 'Edit and correct attendance records', category: 'Attendance' },
        { id: 'attendance.manage_team', name: 'Manage Team Attendance', description: 'Manage attendance for team members', category: 'Attendance' },
      ],
    },
    {
      category: 'Leave Management',
      permissions: [
        { id: 'leaves.view', name: 'View All Leaves', description: 'View all leave requests and balances', category: 'Leave Management' },
        { id: 'leaves.view_own', name: 'View Own Leaves', description: 'View personal leave balance and history', category: 'Leave Management' },
        { id: 'leaves.request', name: 'Request Leave', description: 'Submit leave requests', category: 'Leave Management' },
        { id: 'leaves.approve', name: 'Approve All Leaves', description: 'Approve or reject any leave request', category: 'Leave Management' },
        { id: 'leaves.approve_team', name: 'Approve Team Leaves', description: 'Approve or reject team leave requests', category: 'Leave Management' },
      ],
    },
    {
      category: 'Recruitment',
      permissions: [
        { id: 'recruitment.view', name: 'View Recruitment', description: 'View job postings and applications', category: 'Recruitment' },
        { id: 'recruitment.manage', name: 'Manage Recruitment', description: 'Create jobs, manage applications, schedule interviews', category: 'Recruitment' },
      ],
    },
    {
      category: 'Performance',
      permissions: [
        { id: 'performance.view', name: 'View All Performance', description: 'View performance reviews for all employees', category: 'Performance' },
        { id: 'performance.view_own', name: 'View Own Performance', description: 'View personal performance reviews', category: 'Performance' },
        { id: 'performance.manage', name: 'Manage Performance', description: 'Create and manage performance reviews', category: 'Performance' },
        { id: 'performance.manage_team', name: 'Manage Team Performance', description: 'Conduct performance reviews for team members', category: 'Performance' },
      ],
    },
    {
      category: 'Reports',
      permissions: [
        { id: 'reports.view', name: 'View All Reports', description: 'Access all organizational reports', category: 'Reports' },
        { id: 'reports.view_team', name: 'View Team Reports', description: 'Access reports for team members', category: 'Reports' },
        { id: 'reports.export', name: 'Export Reports', description: 'Export reports to various formats', category: 'Reports' },
      ],
    },
    {
      category: 'Settings',
      permissions: [
        { id: 'settings.view', name: 'View Settings', description: 'View organization settings', category: 'Settings' },
        { id: 'settings.manage', name: 'Manage Settings', description: 'Modify organization settings', category: 'Settings' },
        { id: 'users.manage', name: 'Manage Users', description: 'Create, edit, and delete users', category: 'Settings' },
        { id: 'roles.manage', name: 'Manage Roles', description: 'Create and modify role permissions', category: 'Settings' },
      ],
    },
  ];

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
                  onClick={() => setSelectedRole(role)}
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

        {/* Role Details */}
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
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getRoleBadgeColor(selectedRole.name)}`}>
                  {selectedRole.userCount} users
                </span>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissions</h3>

                {selectedRole.permissions.includes('all') ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">🔑</span>
                      <div>
                        <p className="font-medium text-purple-900">Full Access</p>
                        <p className="text-sm text-purple-700">This role has access to all features and settings</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {permissionCategories.map((category) => {
                      const categoryPermissions = category.permissions.filter(
                        (p) => selectedRole.permissions.includes(p.id)
                      );

                      if (categoryPermissions.length === 0) return null;

                      return (
                        <div key={category.category}>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">{category.category}</h4>
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
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Role Comparison */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Permission Summary</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 pr-4 text-sm font-medium text-gray-500">Category</th>
                          {roles.map((role) => (
                            <th key={role.id} className="text-center py-2 px-2 text-sm font-medium text-gray-500">
                              {getRoleIcon(role.name)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {permissionCategories.map((category) => (
                          <tr key={category.category} className="border-b border-gray-100">
                            <td className="py-2 pr-4 text-sm text-gray-700">{category.category}</td>
                            {roles.map((role) => {
                              const hasFullAccess = role.permissions.includes('all');
                              const hasPartialAccess = !hasFullAccess && category.permissions.some(
                                (p) => role.permissions.includes(p.id)
                              );
                              const hasFullCategoryAccess = !hasFullAccess && category.permissions.every(
                                (p) => role.permissions.includes(p.id)
                              );

                              return (
                                <td key={role.id} className="text-center py-2 px-2">
                                  {hasFullAccess || hasFullCategoryAccess ? (
                                    <span className="text-green-600">●</span>
                                  ) : hasPartialAccess ? (
                                    <span className="text-yellow-500">◐</span>
                                  ) : (
                                    <span className="text-gray-300">○</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span><span className="text-green-600">●</span> Full Access</span>
                    <span><span className="text-yellow-500">◐</span> Partial Access</span>
                    <span><span className="text-gray-300">○</span> No Access</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-6xl mb-4">👈</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Role</h3>
              <p className="text-gray-500">Click on a role to view its permissions and details</p>
            </div>
          )}
        </div>
      </div>

      {/* Permission Overview */}
      <div className="mt-8 bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">All Permissions</h2>
          <p className="text-sm text-gray-500">Complete list of available permissions in the system</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {permissionCategories.map((category) => (
              <div key={category.category} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">{category.category}</h3>
                <ul className="space-y-2">
                  {category.permissions.map((permission) => (
                    <li key={permission.id} className="text-sm">
                      <span className="font-medium text-gray-700">{permission.name}</span>
                      <p className="text-gray-500 text-xs">{permission.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
