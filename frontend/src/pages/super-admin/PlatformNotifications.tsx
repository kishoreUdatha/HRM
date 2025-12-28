import React, { useEffect, useState } from 'react';
import {
  HiPlus,
  HiBell,
  HiPaperAirplane,
  HiPencil,
  HiTrash,
  HiClock,
  HiCheckCircle,
  HiExclamationCircle,
  HiInformationCircle,
  HiX,
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'maintenance' | 'feature' | 'billing';
  targetAudience: 'all' | 'plan_specific' | 'tenant_specific';
  targetPlans?: string[];
  targetTenants?: string[];
  status: 'draft' | 'scheduled' | 'sent' | 'expired' | 'cancelled';
  scheduledAt?: string;
  sentAt?: string;
  expiresAt?: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dismissible?: boolean;
  actionUrl?: string;
  actionLabel?: string;
  createdAt: string;
}

interface FormData {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'maintenance' | 'feature' | 'billing';
  targetAudience: 'all' | 'plan_specific' | 'tenant_specific';
  targetPlans: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledAt: string;
  dismissible: boolean;
  actionUrl: string;
  actionLabel: string;
}

const PlatformNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingNotification, setEditingNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState<FormData>({
    title: '',
    message: '',
    type: 'info',
    targetAudience: 'all',
    targetPlans: [],
    priority: 'normal',
    scheduledAt: '',
    dismissible: true,
    actionUrl: '',
    actionLabel: '',
  });

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const response = await api.get('/tenants/admin/notifications', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setNotifications(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      await api.post('/tenants/admin/notifications', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Notification created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchNotifications();
    } catch (error) {
      console.error('Failed to create notification:', error);
      toast.error('Failed to create notification');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNotification) return;

    const token = localStorage.getItem('superAdminAccessToken');

    try {
      await api.put(`/tenants/admin/notifications/${editingNotification._id}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Notification updated successfully');
      setEditingNotification(null);
      resetForm();
      fetchNotifications();
    } catch (error) {
      console.error('Failed to update notification:', error);
      toast.error('Failed to update notification');
    }
  };

  const handleSend = async (id: string) => {
    if (!confirm('Are you sure you want to send this notification now?')) return;

    const token = localStorage.getItem('superAdminAccessToken');

    try {
      await api.post(`/tenants/admin/notifications/${id}/send`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Notification sent successfully');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to send notification:', error);
      toast.error('Failed to send notification');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notification?')) return;

    const token = localStorage.getItem('superAdminAccessToken');

    try {
      await api.delete(`/tenants/admin/notifications/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Notification deleted successfully');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to delete notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      type: 'info',
      targetAudience: 'all',
      targetPlans: [],
      priority: 'normal',
      scheduledAt: '',
      dismissible: true,
      actionUrl: '',
      actionLabel: '',
    });
  };

  const openEditModal = (notification: Notification) => {
    setEditingNotification(notification);
    setFormData({
      title: notification.title,
      message: notification.message,
      type: notification.type,
      targetAudience: notification.targetAudience,
      targetPlans: notification.targetPlans || [],
      priority: notification.priority,
      scheduledAt: notification.scheduledAt || '',
      dismissible: notification.dismissible ?? true,
      actionUrl: notification.actionUrl || '',
      actionLabel: notification.actionLabel || '',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <HiExclamationCircle className="w-5 h-5 text-yellow-500" />;
      case 'maintenance':
        return <HiClock className="w-5 h-5 text-red-500" />;
      case 'feature':
        return <HiCheckCircle className="w-5 h-5 text-green-500" />;
      default:
        return <HiInformationCircle className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      scheduled: 'bg-yellow-100 text-yellow-700',
      sent: 'bg-green-100 text-green-700',
      expired: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const styles: Record<string, string> = {
      low: 'bg-gray-100 text-gray-600',
      normal: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[priority] || 'bg-gray-100 text-gray-600'}`}>
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Notifications</h1>
          <p className="text-gray-500 mt-1">Send announcements to tenants</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
        >
          <HiPlus className="w-4 h-4" />
          Create Notification
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <HiBell className="w-12 h-12 mb-2" />
            <p>No notifications yet</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-4 text-purple-600 hover:underline"
            >
              Create your first notification
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((notification) => (
              <div key={notification._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">{getTypeIcon(notification.type)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                        {getStatusBadge(notification.status)}
                        {getPriorityBadge(notification.priority)}
                      </div>
                      <p className="text-gray-600 mt-1 text-sm">{notification.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Target: {notification.targetAudience}</span>
                        {notification.scheduledAt && (
                          <span>
                            Scheduled: {new Date(notification.scheduledAt).toLocaleString()}
                          </span>
                        )}
                        {notification.sentAt && (
                          <span>Sent: {new Date(notification.sentAt).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {notification.status === 'draft' && (
                      <>
                        <button
                          onClick={() => handleSend(notification._id)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Send now"
                        >
                          <HiPaperAirplane className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(notification)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                          title="Edit"
                        >
                          <HiPencil className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => handleDelete(notification._id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <HiTrash className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateModal || editingNotification) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">
                {editingNotification ? 'Edit Notification' : 'Create Notification'}
              </h2>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingNotification(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <HiX className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={editingNotification ? handleUpdate : handleCreate}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as FormData['type'] })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="info">Information</option>
                      <option value="warning">Warning</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="feature">New Feature</option>
                      <option value="billing">Billing</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value as FormData['priority'] })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="low">Low</option>
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={formData.targetAudience}
                    onChange={(e) =>
                      setFormData({ ...formData, targetAudience: e.target.value as FormData['targetAudience'] })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">All Tenants</option>
                    <option value="plan_specific">Specific Plans</option>
                    <option value="tenant_specific">Specific Tenants</option>
                  </select>
                </div>
                {formData.targetAudience === 'plan_specific' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Plans
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {['free', 'starter', 'professional', 'enterprise'].map((plan) => (
                        <label key={plan} className="inline-flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={formData.targetPlans.includes(plan)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  targetPlans: [...formData.targetPlans, plan],
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  targetPlans: formData.targetPlans.filter((p) => p !== plan),
                                });
                              }
                            }}
                            className="rounded text-purple-600"
                          />
                          <span className="capitalize">{plan}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Schedule (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.scheduledAt}
                    onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Action URL (optional)
                    </label>
                    <input
                      type="url"
                      value={formData.actionUrl}
                      onChange={(e) => setFormData({ ...formData, actionUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Action Label (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.actionLabel}
                      onChange={(e) => setFormData({ ...formData, actionLabel: e.target.value })}
                      placeholder="Learn More"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="dismissible"
                    checked={formData.dismissible}
                    onChange={(e) => setFormData({ ...formData, dismissible: e.target.checked })}
                    className="rounded text-purple-600"
                  />
                  <label htmlFor="dismissible" className="text-sm text-gray-700">
                    Allow users to dismiss this notification
                  </label>
                </div>
              </div>
              <div className="flex gap-3 p-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingNotification(null);
                    resetForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                >
                  {editingNotification ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlatformNotifications;
