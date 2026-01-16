import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  HiHome,
  HiOfficeBuilding,
  HiChartBar,
  HiCreditCard,
  HiBell,
  HiCog,
  HiStatusOnline,
  HiLogout,
  HiMenu,
  HiX,
  HiShieldCheck,
  HiUsers,
  HiCurrencyRupee,
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';

interface NavItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navigation: NavItem[] = [
  { name: 'Dashboard', path: '/super-admin/dashboard', icon: HiHome },
  { name: 'Tenants', path: '/super-admin/tenants', icon: HiOfficeBuilding },
  { name: 'Analytics', path: '/super-admin/analytics', icon: HiChartBar },
  { name: 'Plans', path: '/super-admin/plans', icon: HiCurrencyRupee },
  { name: 'Billing', path: '/super-admin/billing', icon: HiCreditCard },
  { name: 'Notifications', path: '/super-admin/notifications', icon: HiBell },
  { name: 'Settings', path: '/super-admin/settings', icon: HiCog },
  { name: 'System Health', path: '/super-admin/health', icon: HiStatusOnline },
];

const SuperAdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('superAdminUser');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('superAdminAccessToken');
    localStorage.removeItem('superAdminRefreshToken');
    localStorage.removeItem('superAdminRole');
    localStorage.removeItem('superAdminUser');
    toast.success('Logged out successfully');
    navigate('/super-admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-900 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 bg-gray-800">
          <div className="flex items-center gap-2">
            <HiShieldCheck className="w-8 h-8 text-purple-500" />
            <span className="text-white font-bold text-lg">Super Admin</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <HiX className="w-6 h-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4 space-y-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
          {user && (
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
                <HiUsers className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg text-sm transition-colors"
          >
            <HiLogout className="w-5 h-5" />
            Sign Out
          </button>
          <Link
            to="/login"
            className="w-full flex items-center gap-2 px-3 py-2 mt-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg text-xs transition-colors"
          >
            Back to Tenant App
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <HiMenu className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-4">
              <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Platform Admin
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button className="relative p-2 text-gray-500 hover:text-gray-700">
                <HiBell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default SuperAdminLayout;
