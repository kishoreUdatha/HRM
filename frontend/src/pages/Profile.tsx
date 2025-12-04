import React, { useState } from 'react';
import { HiUser, HiMail, HiPhone, HiLockClosed, HiCamera } from 'react-icons/hi';
import { useAppSelector } from '../hooks/useAppDispatch';
import api from '../services/api';

const Profile: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.put('/auth/profile', formData);
      setMessage({ type: 'success', text: 'Profile updated successfully' });
      setIsEditing(false);
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to update profile',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }
    setIsSaving(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });
      setMessage({ type: 'success', text: 'Password changed successfully' });
      setIsChangingPassword(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.response?.data?.message || 'Failed to change password',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-secondary-900">My Profile</h1>
        <p className="text-secondary-500">Manage your account settings</p>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-700'
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-primary-500 to-primary-700" />

        {/* Avatar & Info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12">
            <div className="relative">
              <div className="w-24 h-24 bg-white rounded-xl shadow-lg flex items-center justify-center border-4 border-white">
                <span className="text-3xl font-bold text-primary-600">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </span>
              </div>
              <button className="absolute bottom-0 right-0 p-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors">
                <HiCamera className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 sm:pb-2">
              <h2 className="text-xl font-bold text-secondary-900">
                {user?.firstName} {user?.lastName}
              </h2>
              <p className="text-secondary-500 capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              {isEditing ? 'Cancel' : 'Edit Profile'}
            </button>
          </div>
        </div>
      </div>

      {/* Profile Form */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-4">Personal Information</h3>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                <HiUser className="inline w-4 h-4 mr-1" />
                First Name
              </label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-secondary-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                <HiUser className="inline w-4 h-4 mr-1" />
                Last Name
              </label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-secondary-50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                <HiMail className="inline w-4 h-4 mr-1" />
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg bg-secondary-50 text-secondary-500"
              />
              <p className="text-xs text-secondary-500 mt-1">Email cannot be changed</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                <HiPhone className="inline w-4 h-4 mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-secondary-50"
                placeholder="+1 234 567 8900"
              />
            </div>
          </div>
          {isEditing && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Change Password */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-secondary-900">
            <HiLockClosed className="inline w-5 h-5 mr-2" />
            Change Password
          </h3>
          <button
            onClick={() => setIsChangingPassword(!isChangingPassword)}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            {isChangingPassword ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {isChangingPassword && (
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {isSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        )}

        {!isChangingPassword && (
          <p className="text-sm text-secondary-500">
            It's a good idea to use a strong password that you don't use elsewhere.
          </p>
        )}
      </div>
    </div>
  );
};

export default Profile;
