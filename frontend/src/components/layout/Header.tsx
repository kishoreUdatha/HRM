import React, { useState, useRef, useEffect } from 'react';
import { HiMenu, HiBell, HiSearch, HiChevronDown, HiLogout, HiUser, HiCog } from 'react-icons/hi';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../hooks/useAppDispatch';
import { logout } from '../../features/auth/authSlice';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  const notifications = [
    { id: 1, title: 'New leave request', message: 'John Doe requested 3 days leave', time: '5m ago', unread: true },
    { id: 2, title: 'Payroll processed', message: 'November payroll has been processed', time: '1h ago', unread: true },
    { id: 3, title: 'New employee joined', message: 'Sarah Smith joined the team', time: '2h ago', unread: false },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-secondary-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-secondary-100"
          >
            <HiMenu className="w-6 h-6 text-secondary-600" />
          </button>

          {/* Search */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
              <input
                type="text"
                placeholder="Search employees, departments..."
                className="pl-10 pr-4 py-2 w-80 bg-secondary-50 border border-secondary-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="relative p-2 rounded-lg hover:bg-secondary-100"
            >
              <HiBell className="w-6 h-6 text-secondary-600" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-secondary-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-secondary-200">
                  <h3 className="font-semibold text-secondary-900">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 hover:bg-secondary-50 cursor-pointer ${
                        notification.unread ? 'bg-primary-50/50' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-2 h-2 mt-2 rounded-full ${
                            notification.unread ? 'bg-primary-500' : 'bg-transparent'
                          }`}
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-secondary-900">{notification.title}</p>
                          <p className="text-sm text-secondary-500">{notification.message}</p>
                          <p className="text-xs text-secondary-400 mt-1">{notification.time}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t border-secondary-200">
                  <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                    View all notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary-100"
            >
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-primary-700 font-medium text-sm">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-secondary-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-secondary-500 capitalize">{user?.role?.replace('_', ' ')}</p>
              </div>
              <HiChevronDown className="w-4 h-4 text-secondary-400 hidden md:block" />
            </button>

            {/* Profile Dropdown */}
            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-secondary-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-secondary-200">
                  <p className="text-sm font-medium text-secondary-900">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-sm text-secondary-500">{user?.email}</p>
                </div>
                <div className="py-1">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/profile');
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
                  >
                    <HiUser className="w-5 h-5 text-secondary-400" />
                    My Profile
                  </button>
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      navigate('/settings');
                    }}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
                  >
                    <HiCog className="w-5 h-5 text-secondary-400" />
                    Settings
                  </button>
                </div>
                <div className="border-t border-secondary-200 py-1">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <HiLogout className="w-5 h-5" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
