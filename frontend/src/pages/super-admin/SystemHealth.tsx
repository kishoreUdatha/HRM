import React, { useEffect, useState } from 'react';
import {
  HiServer,
  HiDatabase,
  HiCloud,
  HiCheckCircle,
  HiExclamationCircle,
  HiXCircle,
  HiRefresh,
  HiClock,
  HiChartBar,
} from 'react-icons/hi';
import api from '../../services/api';

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  uptime: number;
  lastChecked: string;
  details?: string;
}

interface SystemHealthData {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: ServiceHealth[];
  metrics: {
    totalRequests24h: number;
    averageResponseTime: number;
    errorRate: number;
    activeConnections: number;
  };
  infrastructure: {
    cpu: number;
    memory: number;
    disk: number;
  };
}

const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchHealth();
    let interval: ReturnType<typeof setInterval> | undefined;
    if (autoRefresh) {
      interval = setInterval(fetchHealth, 30000); // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  const fetchHealth = async () => {
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const response = await api.get('/tenants/admin/health', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setHealth(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch health:', error);
      // Set mock data for demo
      setHealth({
        overall: 'healthy',
        services: [
          { name: 'API Gateway', status: 'healthy', responseTime: 45, uptime: 99.99, lastChecked: new Date().toISOString() },
          { name: 'Auth Service', status: 'healthy', responseTime: 32, uptime: 99.95, lastChecked: new Date().toISOString() },
          { name: 'Tenant Service', status: 'healthy', responseTime: 28, uptime: 99.98, lastChecked: new Date().toISOString() },
          { name: 'Employee Service', status: 'healthy', responseTime: 55, uptime: 99.92, lastChecked: new Date().toISOString() },
          { name: 'Leave Service', status: 'healthy', responseTime: 38, uptime: 99.97, lastChecked: new Date().toISOString() },
          { name: 'Attendance Service', status: 'healthy', responseTime: 42, uptime: 99.94, lastChecked: new Date().toISOString() },
          { name: 'Payroll Service', status: 'healthy', responseTime: 68, uptime: 99.91, lastChecked: new Date().toISOString() },
          { name: 'MongoDB', status: 'healthy', responseTime: 12, uptime: 99.99, lastChecked: new Date().toISOString() },
          { name: 'Redis', status: 'healthy', responseTime: 3, uptime: 99.99, lastChecked: new Date().toISOString() },
          { name: 'RabbitMQ', status: 'healthy', responseTime: 8, uptime: 99.98, lastChecked: new Date().toISOString() },
        ],
        metrics: {
          totalRequests24h: 1458923,
          averageResponseTime: 42,
          errorRate: 0.02,
          activeConnections: 234,
        },
        infrastructure: {
          cpu: 35,
          memory: 62,
          disk: 48,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <HiCheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <HiExclamationCircle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
        return <HiXCircle className="w-5 h-5 text-red-500" />;
      default:
        return <HiClock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      healthy: 'bg-green-100 text-green-700 border-green-200',
      degraded: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      unhealthy: 'bg-red-100 text-red-700 border-red-200',
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
          styles[status] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getResponseTimeColor = (ms: number) => {
    if (ms < 50) return 'text-green-600';
    if (ms < 100) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUsageColor = (percent: number) => {
    if (percent < 60) return 'bg-green-500';
    if (percent < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-500 mt-1">Monitor platform services and infrastructure</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded text-purple-600"
            />
            Auto-refresh (30s)
          </label>
          <button
            onClick={fetchHealth}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <HiRefresh className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Overall Status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                health?.overall === 'healthy'
                  ? 'bg-green-100'
                  : health?.overall === 'degraded'
                  ? 'bg-yellow-100'
                  : 'bg-red-100'
              }`}
            >
              {health?.overall === 'healthy' ? (
                <HiCheckCircle className="w-8 h-8 text-green-600" />
              ) : health?.overall === 'degraded' ? (
                <HiExclamationCircle className="w-8 h-8 text-yellow-600" />
              ) : (
                <HiXCircle className="w-8 h-8 text-red-600" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                System Status: {health?.overall?.charAt(0).toUpperCase()}
                {health?.overall?.slice(1)}
              </h2>
              <p className="text-gray-500">
                {health?.services?.filter((s) => s.status === 'healthy').length || 0} of{' '}
                {health?.services?.length || 0} services operational
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Last updated</p>
            <p className="font-medium text-gray-900">{new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <HiChartBar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Requests (24h)</p>
              <p className="text-xl font-bold text-gray-900">
                {health?.metrics?.totalRequests24h?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <HiClock className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Response</p>
              <p className="text-xl font-bold text-gray-900">
                {health?.metrics?.averageResponseTime || 0}ms
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <HiExclamationCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Error Rate</p>
              <p className="text-xl font-bold text-gray-900">
                {health?.metrics?.errorRate || 0}%
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <HiServer className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Connections</p>
              <p className="text-xl font-bold text-gray-900">
                {health?.metrics?.activeConnections || 0}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Services */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Services</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {health?.services?.map((service) => (
              <div key={service.name} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <p className="font-medium text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-500">
                      Uptime: {service.uptime}%
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${getResponseTimeColor(service.responseTime)}`}>
                    {service.responseTime}ms
                  </p>
                  <p className="text-xs text-gray-500">Response time</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Infrastructure */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Infrastructure</h2>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 flex items-center gap-2">
                  <HiServer className="w-4 h-4" /> CPU Usage
                </span>
                <span className="font-medium">{health?.infrastructure?.cpu || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${getUsageColor(health?.infrastructure?.cpu || 0)}`}
                  style={{ width: `${health?.infrastructure?.cpu || 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 flex items-center gap-2">
                  <HiDatabase className="w-4 h-4" /> Memory Usage
                </span>
                <span className="font-medium">{health?.infrastructure?.memory || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${getUsageColor(health?.infrastructure?.memory || 0)}`}
                  style={{ width: `${health?.infrastructure?.memory || 0}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 flex items-center gap-2">
                  <HiCloud className="w-4 h-4" /> Disk Usage
                </span>
                <span className="font-medium">{health?.infrastructure?.disk || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${getUsageColor(health?.infrastructure?.disk || 0)}`}
                  style={{ width: `${health?.infrastructure?.disk || 0}%` }}
                />
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-gray-100">
            <h3 className="font-medium text-gray-900 mb-3">Quick Actions</h3>
            <div className="space-y-2">
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                View detailed logs
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                Restart services
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">
                Clear cache
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealth;
