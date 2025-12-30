import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HiHome,
  HiUsers,
  HiUserGroup,
  HiCalendar,
  HiClock,
  HiCurrencyDollar,
  HiCog,
  HiChartBar,
  HiDocumentText,
  HiX,
  HiBriefcase,
  HiStar,
  HiAcademicCap,
  HiOfficeBuilding,
  HiShieldCheck,
  HiClipboardList,
  HiChat,
  HiTrendingUp,
  HiCreditCard,
  HiClipboardCheck,
  HiHeart,
  HiCube,
  HiExclamationCircle,
  HiUserAdd,
  HiCollection,
} from 'react-icons/hi';
import { useAppSelector } from '../../hooks/useAppDispatch';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  permissions?: string[]; // Required permissions (any of these)
  roles?: string[]; // Fallback role check
}

// Helper function to check if user has required permission
const hasPermission = (userPermissions: string[], requiredPermissions?: string[]): boolean => {
  if (!requiredPermissions || requiredPermissions.length === 0) return true;
  if (userPermissions.includes('*')) return true; // Full access
  return requiredPermissions.some(perm => userPermissions.includes(perm));
};

const navigation: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: HiHome }, // Everyone can see dashboard
  { name: 'Employees', path: '/employees', icon: HiUsers, permissions: ['employees:read'] },
  { name: 'Departments', path: '/departments', icon: HiUserGroup, permissions: ['employees:read'] },
  { name: 'Shifts', path: '/shifts', icon: HiClock, permissions: ['attendance:write', 'employees:write'] },
  { name: 'Org Chart', path: '/org-chart', icon: HiOfficeBuilding, permissions: ['employees:read'] },
  { name: 'Attendance', path: '/attendance', icon: HiCalendar, permissions: ['attendance:read', 'attendance:checkin'] },
  { name: 'Leave Management', path: '/leaves', icon: HiCalendar, permissions: ['leaves:read'] },
  { name: 'Leave Types', path: '/leave-types', icon: HiClipboardList, permissions: ['leaves:write', 'leaves:approve'] },
  { name: 'Leave Balances', path: '/leave-balances', icon: HiCollection, permissions: ['leaves:approve', 'employees:read'] },
  { name: 'Payroll', path: '/payroll', icon: HiCurrencyDollar, permissions: ['payroll:read'] },
  { name: 'Salary Structures', path: '/payroll/salary-structures', icon: HiCurrencyDollar, permissions: ['payroll:write'] },
  { name: 'Timesheets', path: '/timesheets', icon: HiClock, permissions: ['attendance:read'] },
  { name: 'Recruitment', path: '/recruitment', icon: HiBriefcase, permissions: ['recruitment:read'] },
  { name: 'Onboarding', path: '/onboarding', icon: HiUserAdd, permissions: ['employees:write', 'recruitment:write'] },
  { name: 'Performance', path: '/performance', icon: HiStar, permissions: ['employees:read'] },
  { name: 'Training', path: '/training', icon: HiAcademicCap, permissions: ['employees:read'] },
  { name: 'Benefits', path: '/benefits', icon: HiHeart, permissions: ['payroll:read', 'employees:read'] },
  { name: 'Expenses', path: '/expenses', icon: HiCreditCard, permissions: ['payroll:read'] },
  { name: 'Engagement', path: '/engagement', icon: HiHeart, permissions: ['employees:read'] },
  { name: 'Assets', path: '/assets', icon: HiCube, permissions: ['employees:read'] },
  { name: 'Grievances', path: '/grievances', icon: HiExclamationCircle, permissions: ['employees:read'] },
  { name: 'Compliance', path: '/compliance', icon: HiClipboardCheck, permissions: ['employees:read', 'reports:read'] },
  { name: 'Documents', path: '/documents', icon: HiDocumentText, permissions: ['profile:read'] }, // Employees can access their own docs
  { name: 'Chat', path: '/chat', icon: HiChat }, // Everyone can use chat
  { name: 'Analytics', path: '/analytics', icon: HiTrendingUp, permissions: ['reports:read'] },
  { name: 'Workforce', path: '/workforce', icon: HiCollection, permissions: ['reports:read', 'employees:read'] },
  { name: 'Reports', path: '/reports', icon: HiChartBar, permissions: ['reports:read'] },
  { name: 'Settings', path: '/settings', icon: HiCog, permissions: ['settings:read', 'settings:write'] },
];

const adminNavigation: NavItem[] = [
  { name: 'Admin Dashboard', path: '/admin', icon: HiShieldCheck, permissions: ['users:read', 'users:write'] },
  { name: 'User Management', path: '/admin/users', icon: HiUsers, permissions: ['users:read', 'users:write'] },
  { name: 'Role Management', path: '/admin/roles', icon: HiClipboardList, permissions: ['users:write'] },
  { name: 'Audit Logs', path: '/admin/audit-logs', icon: HiDocumentText, permissions: ['users:read'] },
  { name: 'Billing', path: '/billing', icon: HiCreditCard, permissions: ['settings:write'] },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, tenant } = useAppSelector((state) => state.auth);

  // Get user permissions, default to empty array if not set
  const userPermissions = user?.permissions || [];

  const filteredNavigation = navigation.filter((item) => {
    if (!user) return false;
    return hasPermission(userPermissions, item.permissions);
  });

  const filteredAdminNavigation = adminNavigation.filter((item) => {
    if (!user) return false;
    return hasPermission(userPermissions, item.permissions);
  });

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-secondary-200 transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:z-auto ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-secondary-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">H</span>
            </div>
            <span className="font-bold text-xl text-secondary-900">HRM</span>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1 rounded-lg hover:bg-secondary-100"
          >
            <HiX className="w-6 h-6 text-secondary-500" />
          </button>
        </div>

        {/* Tenant Info */}
        {tenant && (
          <div className="px-4 py-3 border-b border-secondary-200 bg-secondary-50">
            <p className="text-xs text-secondary-500">Organization</p>
            <p className="font-medium text-secondary-900 truncate">{tenant.name}</p>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredNavigation.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${
                    isActive ? 'text-primary-600' : 'text-secondary-400'
                  }`}
                />
                {item.name}
              </NavLink>
            );
          })}

          {/* Admin Section */}
          {filteredAdminNavigation.length > 0 && (
            <>
              <div className="pt-4 mt-4 border-t border-secondary-200">
                <p className="px-3 mb-2 text-xs font-semibold text-secondary-400 uppercase tracking-wider">
                  Administration
                </p>
              </div>
              {filteredAdminNavigation.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-secondary-600 hover:bg-secondary-100 hover:text-secondary-900'
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 ${
                        isActive ? 'text-primary-600' : 'text-secondary-400'
                      }`}
                    />
                    {item.name}
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        {/* Subscription Badge */}
        {tenant && (
          <div className="px-4 py-3 border-t border-secondary-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary-500">Plan</span>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  tenant.subscription?.plan === 'enterprise'
                    ? 'bg-purple-100 text-purple-700'
                    : tenant.subscription?.plan === 'professional'
                    ? 'bg-blue-100 text-blue-700'
                    : tenant.subscription?.plan === 'starter'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-secondary-100 text-secondary-600'
                }`}
              >
                {tenant.subscription?.plan || 'Free'}
              </span>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
