import { useState, useEffect } from 'react';
import api from '../../services/api';

interface AuditLog {
  _id: string;
  userName: string;
  userEmail: string;
  action: string;
  category: string;
  resource: string;
  status: string;
  ipAddress?: string;
  createdAt: string;
  details: Record<string, unknown>;
}

interface AuditStats {
  totalLogs: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  topUsers: { userId: string; userName: string; count: number }[];
  dailyActivity: { date: string; count: number }[];
}

const AuditLogs = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    startDate: '',
    endDate: '',
  });

  const categories = [
    'auth', 'user', 'employee', 'attendance', 'leave', 'payroll',
    'settings', 'document', 'recruitment', 'performance', 'training', 'system'
  ];

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [filters]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await api.get(`/auth/admin/audit-logs?${params}`);
      setLogs(response.data.data.logs || []);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/auth/admin/audit-logs/stats');
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleExport = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams();
      params.append('format', format);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.category) params.append('category', filters.category);

      const response = await api.get(`/auth/admin/audit-logs/export?${params}`, {
        responseType: format === 'csv' ? 'blob' : 'json',
      });

      if (format === 'csv') {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit_logs.csv';
        a.click();
      } else {
        const blob = new Blob([JSON.stringify(response.data.data.logs, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit_logs.json';
        a.click();
      }
    } catch (error) {
      console.error('Failed to export:', error);
    }
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      auth: '🔐', user: '👤', employee: '👥', attendance: '📅',
      leave: '🏖️', payroll: '💰', settings: '⚙️', document: '📄',
      recruitment: '🎯', performance: '⭐', training: '📚', system: '🖥️',
    };
    return icons[category] || '📋';
  };

  const getStatusColor = (status: string) => {
    return status === 'success' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('csv')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Export JSON
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Total Events (30 days)</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totalLogs}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Success Rate</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalLogs > 0
                ? ((stats.byStatus?.success || 0) / stats.totalLogs * 100).toFixed(1)
                : 0}%
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Most Active Category</div>
            <div className="text-2xl font-bold text-blue-600 capitalize">
              {Object.entries(stats.byCategory || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Failed Events</div>
            <div className="text-2xl font-bold text-red-600">{stats.byStatus?.failure || 0}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat} className="capitalize">{cat}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Start Date"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="End Date"
          />
          <button
            onClick={() => setFilters({ category: '', status: '', startDate: '', endDate: '' })}
            className="px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resource</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No audit logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{log.userName}</div>
                      <div className="text-sm text-gray-500">{log.userEmail}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {log.action.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-1">
                        <span>{getCategoryIcon(log.category)}</span>
                        <span className="text-sm text-gray-600 capitalize">{log.category}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{log.resource}</td>
                    <td className="px-6 py-4">
                      <span className={`font-medium ${getStatusColor(log.status)}`}>
                        {log.status === 'success' ? '✓' : '✗'} {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Audit Log Details</h2>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500">Timestamp</label>
                  <p className="font-medium">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Status</label>
                  <p className={`font-medium ${getStatusColor(selectedLog.status)}`}>
                    {selectedLog.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">User</label>
                  <p className="font-medium">{selectedLog.userName}</p>
                  <p className="text-sm text-gray-500">{selectedLog.userEmail}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">IP Address</label>
                  <p className="font-medium">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Action</label>
                  <p className="font-medium">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500">Category</label>
                  <p className="font-medium capitalize">{selectedLog.category}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm text-gray-500">Resource</label>
                  <p className="font-medium">{selectedLog.resource}</p>
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-500">Details</label>
                <pre className="mt-1 p-4 bg-gray-50 rounded-lg text-sm overflow-x-auto">
                  {JSON.stringify(selectedLog.details, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
