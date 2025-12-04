import React, { useState } from 'react';
import { HiCog, HiOfficeBuilding, HiUsers, HiShieldCheck, HiBell, HiColorSwatch } from 'react-icons/hi';
import { useAppSelector } from '../hooks/useAppDispatch';

const Settings: React.FC = () => {
  const { tenant } = useAppSelector((state) => state.auth);
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'General', icon: HiCog },
    { id: 'organization', name: 'Organization', icon: HiOfficeBuilding },
    { id: 'users', name: 'Users & Roles', icon: HiUsers },
    { id: 'security', name: 'Security', icon: HiShieldCheck },
    { id: 'notifications', name: 'Notifications', icon: HiBell },
    { id: 'appearance', name: 'Appearance', icon: HiColorSwatch },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">Settings</h1>
        <p className="text-secondary-500">Manage your organization's settings and preferences</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="bg-white rounded-xl shadow-sm border border-secondary-200 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-secondary-600 hover:bg-secondary-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">General Settings</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    defaultValue={tenant?.name}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Organization Slug
                  </label>
                  <input
                    type="text"
                    defaultValue={tenant?.slug}
                    disabled
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg bg-secondary-50 text-secondary-500"
                  />
                  <p className="text-xs text-secondary-500 mt-1">
                    Slug cannot be changed after creation
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Timezone
                  </label>
                  <select className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>UTC</option>
                    <option>America/New_York</option>
                    <option>America/Los_Angeles</option>
                    <option>Europe/London</option>
                    <option>Asia/Kolkata</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Date Format
                  </label>
                  <select className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>MM/DD/YYYY</option>
                    <option>DD/MM/YYYY</option>
                    <option>YYYY-MM-DD</option>
                  </select>
                </div>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'organization' && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                Organization Details
              </h2>
              <div className="space-y-6">
                <div className="p-4 bg-secondary-50 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-secondary-900">Current Plan</h3>
                      <p className="text-sm text-secondary-500">
                        {tenant?.subscription?.plan || 'Free'} Plan
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm">
                      Upgrade Plan
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-secondary-500">Max Employees</p>
                      <p className="font-medium text-secondary-900">
                        {tenant?.subscription?.maxEmployees || 10}
                      </p>
                    </div>
                    <div>
                      <p className="text-secondary-500">Features</p>
                      <p className="font-medium text-secondary-900">
                        {tenant?.subscription?.features?.length || 0} enabled
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Industry
                  </label>
                  <select className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>Technology</option>
                    <option>Healthcare</option>
                    <option>Finance</option>
                    <option>Education</option>
                    <option>Manufacturing</option>
                    <option>Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">
                    Company Size
                  </label>
                  <select className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>1-10 employees</option>
                    <option>11-50 employees</option>
                    <option>51-200 employees</option>
                    <option>201-500 employees</option>
                    <option>500+ employees</option>
                  </select>
                </div>

                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">Security Settings</h2>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-secondary-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-secondary-500">
                      Require 2FA for all users in the organization
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-secondary-900">Session Timeout</h3>
                    <p className="text-sm text-secondary-500">
                      Automatically log out inactive users
                    </p>
                  </div>
                  <select className="px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 hour</option>
                    <option>4 hours</option>
                    <option>Never</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-secondary-900">Password Policy</h3>
                    <p className="text-sm text-secondary-500">
                      Require strong passwords for all users
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
              <h2 className="text-lg font-semibold text-secondary-900 mb-4">
                Notification Preferences
              </h2>
              <div className="space-y-4">
                {[
                  { label: 'Email Notifications', description: 'Receive email updates' },
                  { label: 'Leave Requests', description: 'Notify when leave is requested' },
                  { label: 'New Employees', description: 'Notify when employees join' },
                  { label: 'Attendance Alerts', description: 'Late arrival notifications' },
                  { label: 'Payroll Updates', description: 'Monthly payroll notifications' },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-secondary-50 rounded-lg"
                  >
                    <div>
                      <h3 className="font-medium text-secondary-900">{item.label}</h3>
                      <p className="text-sm text-secondary-500">{item.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked />
                      <div className="w-11 h-6 bg-secondary-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-secondary-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                ))}
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {(activeTab === 'users' || activeTab === 'appearance') && (
            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-12 text-center">
              <HiCog className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-secondary-900 mb-2">Coming Soon</h3>
              <p className="text-secondary-500">
                This feature is currently under development.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
