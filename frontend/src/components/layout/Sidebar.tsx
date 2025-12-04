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
  roles?: string[];
}

const navigation: NavItem[] = [
  { name: 'Dashboard', path: '/', icon: HiHome },
  { name: 'Employees', path: '/employees', icon: HiUsers },
  { name: 'Departments', path: '/departments', icon: HiUserGroup },
  { name: 'Shifts', path: '/shifts', icon: HiClock, roles: ['admin', 'hr_manager', 'tenant_admin', 'hr'] },
  { name: 'Org Chart', path: '/org-chart', icon: HiOfficeBuilding },
  { name: 'Attendance', path: '/attendance', icon: HiCalendar },
  { name: 'Leave Management', path: '/leaves', icon: HiCalendar },
  { name: 'Payroll', path: '/payroll', icon: HiCurrencyDollar, roles: ['admin', 'hr_manager', 'tenant_admin', 'hr'] },
  { name: 'Timesheets', path: '/timesheets', icon: HiClock },
  { name: 'Recruitment', path: '/recruitment', icon: HiBriefcase, roles: ['admin', 'hr_manager', 'tenant_admin', 'hr'] },
  { name: 'Onboarding', path: '/onboarding', icon: HiUserAdd },
  { name: 'Performance', path: '/performance', icon: HiStar },
  { name: 'Training', path: '/training', icon: HiAcademicCap },
  { name: 'Benefits', path: '/benefits', icon: HiHeart },
  { name: 'Expenses', path: '/expenses', icon: HiCreditCard },
  { name: 'Engagement', path: '/engagement', icon: HiHeart },
  { name: 'Assets', path: '/assets', icon: HiCube },
  { name: 'Grievances', path: '/grievances', icon: HiExclamationCircle },
  { name: 'Compliance', path: '/compliance', icon: HiClipboardCheck },
  { name: 'Documents', path: '/documents', icon: HiDocumentText },
  { name: 'Chat', path: '/chat', icon: HiChat },
  { name: 'Analytics', path: '/analytics', icon: HiTrendingUp, roles: ['admin', 'hr_manager', 'tenant_admin', 'hr'] },
  { name: 'Workforce', path: '/workforce', icon: HiCollection, roles: ['admin', 'hr_manager', 'tenant_admin', 'hr'] },
  { name: 'Reports', path: '/reports', icon: HiChartBar, roles: ['admin', 'hr_manager', 'tenant_admin', 'hr'] },
  { name: 'Settings', path: '/settings', icon: HiCog, roles: ['admin', 'tenant_admin'] },
];

const adminNavigation: NavItem[] = [
  { name: 'Admin Dashboard', path: '/admin', icon: HiShieldCheck, roles: ['admin', 'tenant_admin'] },
  { name: 'User Management', path: '/admin/users', icon: HiUsers, roles: ['admin', 'tenant_admin'] },
  { name: 'Role Management', path: '/admin/roles', icon: HiClipboardList, roles: ['admin', 'tenant_admin'] },
  { name: 'Audit Logs', path: '/admin/audit-logs', icon: HiDocumentText, roles: ['admin', 'tenant_admin'] },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, tenant } = useAppSelector((state) => state.auth);

  const filteredNavigation = navigation.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  const filteredAdminNavigation = adminNavigation.filter((item) => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
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
