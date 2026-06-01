import React, { useEffect, useState, useCallback } from 'react';
import {
  HiSearch,
  HiFilter,
  HiPlus,
  HiDotsVertical,
  HiEye,
  HiTrash,
  HiCheckCircle,
  HiXCircle,
  HiRefresh,
  HiChevronLeft,
  HiChevronRight,
  HiKey,
  HiClipboardCopy,
  HiX,
  HiExclamation,
  HiChartBar,
  HiCog,
  HiShieldCheck,
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface APIKey {
  _id: string;
  tenantId: string;
  tenantName?: string;
  name: string;
  description?: string;
  prefix: string;
  permissions: string[];
  rateLimit: { requests: number; window: number };
  ipWhitelist?: string[];
  expiresAt?: string;
  environment: 'production' | 'staging' | 'development';
  lastUsed?: string;
  usageCount: number;
  isActive: boolean;
  createdByRole: string;
  revokedAt?: string;
  revokedReason?: string;
  createdAt: string;
}

interface Tenant {
  _id: string;
  name: string;
  slug: string;
}

interface TenantAPIConfig {
  tenantId: string;
  tenantName: string;
  allowedScopes: string[];
  maxKeys: number;
  maxRequestsPerDay: number;
  isAPIAccessEnabled: boolean;
  enabledEnvironments: string[];
  notes?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const PERMISSION_SCOPES = [
  { value: '*', label: 'Full Access', description: 'Complete access to all resources' },
  { value: 'employees:read', label: 'Employees (Read)', description: 'Read employee data' },
  { value: 'employees:write', label: 'Employees (Write)', description: 'Create/update employees' },
  { value: 'attendance:read', label: 'Attendance (Read)', description: 'Read attendance records' },
  { value: 'attendance:write', label: 'Attendance (Write)', description: 'Mark attendance' },
  { value: 'leaves:read', label: 'Leaves (Read)', description: 'Read leave requests/balances' },
  { value: 'leaves:write', label: 'Leaves (Write)', description: 'Create leave requests' },
  { value: 'payroll:read', label: 'Payroll (Read)', description: 'Read payroll/payslips' },
  { value: 'timesheets:read', label: 'Timesheets (Read)', description: 'Read timesheets' },
  { value: 'timesheets:write', label: 'Timesheets (Write)', description: 'Submit timesheets' },
  { value: 'reports:read', label: 'Reports (Read)', description: 'Access reports' },
];

const APIKeyManagement: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [tenantFilter, setTenantFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [environmentFilter, setEnvironmentFilter] = useState<string>('all');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [createdKey, setCreatedKey] = useState<string>('');
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [revokingKey, setRevokingKey] = useState<APIKey | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [selectedKeyUsage, setSelectedKeyUsage] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configuringTenant, setConfiguringTenant] = useState<Tenant | null>(null);
  const [tenantConfig, setTenantConfig] = useState<TenantAPIConfig>({
    tenantId: '',
    tenantName: '',
    allowedScopes: [],
    maxKeys: 5,
    maxRequestsPerDay: 10000,
    isAPIAccessEnabled: false,
    enabledEnvironments: ['production'],
    notes: '',
  });
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configuredTenants, setConfiguredTenants] = useState<TenantAPIConfig[]>([]);

  const [newKey, setNewKey] = useState({
    tenantId: '',
    name: '',
    description: '',
    permissions: ['*'] as string[],
    rateLimit: { requests: 1000, window: 3600 },
    environment: 'production',
    expiresAt: '',
  });

  useEffect(() => {
    fetchAPIKeys();
    fetchTenants();
    fetchConfiguredTenants();
  }, [pagination.page, tenantFilter, statusFilter, environmentFilter]);

  const fetchAPIKeys = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (tenantFilter !== 'all') params.append('tenantId', tenantFilter);
      if (statusFilter !== 'all') params.append('isActive', statusFilter === 'active' ? 'true' : 'false');
      if (environmentFilter !== 'all') params.append('environment', environmentFilter);

      const response = await api.get(`/integrations/admin/api-keys?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setApiKeys(response.data.data);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      }
    } catch (error: any) {
      console.error('Failed to fetch API keys:', error);
      toast.error(error.response?.data?.message || 'Failed to fetch API keys');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTenants = async () => {
    const token = localStorage.getItem('superAdminAccessToken');
    try {
      const response = await api.get('/tenants/admin/list?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setTenants(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    }
  };

  const fetchConfiguredTenants = async () => {
    const token = localStorage.getItem('superAdminAccessToken');
    try {
      const response = await api.get('/integrations/admin/tenant-configs?limit=100', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setConfiguredTenants(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch tenant configs:', error);
    }
  };

  const handleConfigureTenant = async (tenant: Tenant) => {
    setConfiguringTenant(tenant);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const response = await api.get(`/integrations/admin/tenant-config/${tenant._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setTenantConfig({
          ...response.data.data,
          tenantName: tenant.name,
        });
      }
    } catch (error) {
      setTenantConfig({
        tenantId: tenant._id,
        tenantName: tenant.name,
        allowedScopes: [],
        maxKeys: 5,
        maxRequestsPerDay: 10000,
        isAPIAccessEnabled: false,
        enabledEnvironments: ['production'],
        notes: '',
      });
    }
    setShowConfigModal(true);
  };

  const handleSaveConfig = async () => {
    if (!configuringTenant) return;

    setIsSavingConfig(true);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const response = await api.put(
        `/integrations/admin/tenant-config/${configuringTenant._id}`,
        {
          ...tenantConfig,
          tenantName: configuringTenant.name,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success('Tenant API configuration saved successfully');
        setShowConfigModal(false);
        setConfiguringTenant(null);
        fetchConfiguredTenants();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save configuration');
    } finally {
      setIsSavingConfig(false);
    }
  };

  const isTenantConfigured = (tenantId: string) => {
    const config = configuredTenants.find(c => c.tenantId === tenantId);
    return config?.isAPIAccessEnabled ?? false;
  };

  const handleCreateKey = async () => {
    if (!newKey.tenantId || !newKey.name) {
      toast.error('Please select a tenant and provide a name');
      return;
    }

    setIsCreating(true);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const payload = {
        ...newKey,
        expiresAt: newKey.expiresAt || undefined,
      };

      const response = await api.post('/integrations/admin/api-keys', payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setCreatedKey(response.data.data.key);
        setShowCreateModal(false);
        setShowKeyModal(true);
        toast.success('API key created successfully');
        fetchAPIKeys();
        resetNewKeyForm();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create API key');
    } finally {
      setIsCreating(false);
    }
  };

  const handleRevokeKey = async () => {
    if (!revokingKey) return;

    setIsRevoking(true);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const response = await api.delete(`/integrations/admin/api-keys/${revokingKey._id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { reason: revokeReason || 'Revoked by super admin' },
      });

      if (response.data.success) {
        toast.success('API key revoked successfully');
        setShowRevokeModal(false);
        setRevokingKey(null);
        setRevokeReason('');
        fetchAPIKeys();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to revoke API key');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleViewUsage = async (key: APIKey) => {
    const token = localStorage.getItem('superAdminAccessToken');
    try {
      const response = await api.get(`/integrations/admin/api-keys/${key._id}/usage`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setSelectedKeyUsage({ key, usage: response.data.data });
        setShowUsageModal(true);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch usage data');
    }
  };

  const resetNewKeyForm = () => {
    setNewKey({
      tenantId: '',
      name: '',
      description: '',
      permissions: ['*'],
      rateLimit: { requests: 1000, window: 3600 },
      environment: 'production',
      expiresAt: '',
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getTenantName = (tenantId: string) => {
    const tenant = tenants.find(t => t._id === tenantId);
    return tenant?.name || tenantId;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredKeys = apiKeys.filter(key =>
    key.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    key.prefix.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">API Key Management</h1>
        <p className="text-gray-600 mt-1">Manage B2B API keys for tenant integrations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <HiKey className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total Keys</p>
              <p className="text-2xl font-semibold">{pagination.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <HiCheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Active Keys</p>
              <p className="text-2xl font-semibold">{apiKeys.filter(k => k.isActive).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-lg">
              <HiXCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Revoked Keys</p>
              <p className="text-2xl font-semibold">{apiKeys.filter(k => !k.isActive).length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <HiChartBar className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-500">Total API Calls</p>
              <p className="text-2xl font-semibold">{apiKeys.reduce((sum, k) => sum + k.usageCount, 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant API Configuration Section */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <HiShieldCheck className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Tenant API Permissions</h2>
                <p className="text-sm text-gray-500">Configure API access permissions for each tenant before creating API keys</p>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tenants.slice(0, 6).map((tenant) => {
              const isConfigured = isTenantConfigured(tenant._id);
              const config = configuredTenants.find(c => c.tenantId === tenant._id);
              return (
                <div
                  key={tenant._id}
                  className={`border rounded-lg p-4 ${isConfigured ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{tenant.name}</h3>
                    {isConfigured ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                        <HiCheckCircle className="mr-1 h-3 w-3" />
                        Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Not Configured
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mb-3">{tenant.slug}</p>
                  {isConfigured && config && (
                    <div className="text-xs text-gray-600 mb-3">
                      <span className="font-medium">{config.allowedScopes?.length || 0}</span> scopes |
                      <span className="font-medium ml-1">{config.maxKeys || 5}</span> max keys
                    </div>
                  )}
                  <button
                    onClick={() => handleConfigureTenant(tenant)}
                    className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                      isConfigured
                        ? 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    <HiCog className="h-4 w-4" />
                    {isConfigured ? 'Edit Config' : 'Configure'}
                  </button>
                </div>
              );
            })}
          </div>
          {tenants.length > 6 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">
                Showing 6 of {tenants.length} tenants. Use the tenant dropdown below to configure others.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search by name or prefix..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 border rounded-lg ${showFilters ? 'bg-purple-50 border-purple-500 text-purple-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            >
              <HiFilter className="h-5 w-5" />
              Filters
            </button>
            <button
              onClick={fetchAPIKeys}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <HiRefresh className="h-5 w-5" />
              Refresh
            </button>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <HiPlus className="h-5 w-5" />
            Create API Key
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="px-4 pb-4 border-t border-gray-200 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant</label>
                <select
                  value={tenantFilter}
                  onChange={(e) => setTenantFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Tenants</option>
                  {tenants.map((tenant) => (
                    <option key={tenant._id} value={tenant._id}>{tenant.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="revoked">Revoked</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                <select
                  value={environmentFilter}
                  onChange={(e) => setEnvironmentFilter(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Environments</option>
                  <option value="production">Production</option>
                  <option value="staging">Staging</option>
                  <option value="development">Development</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* API Keys Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name / Key</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tenant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    </div>
                    <p className="mt-2 text-gray-500">Loading API keys...</p>
                  </td>
                </tr>
              ) : filteredKeys.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <HiKey className="mx-auto h-12 w-12 text-gray-400" />
                    <p className="mt-2 text-gray-500">No API keys found</p>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="mt-4 text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Create your first API key
                    </button>
                  </td>
                </tr>
              ) : (
                filteredKeys.map((key) => (
                  <tr key={key._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="font-medium text-gray-900">{key.name}</div>
                        <div className="text-sm text-gray-500 font-mono">{key.prefix}...</div>
                        {key.description && (
                          <div className="text-xs text-gray-400 mt-1">{key.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{getTenantName(key.tenantId)}</div>
                      <div className="text-xs text-gray-500">{key.environment}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {key.permissions.slice(0, 3).map((perm, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            {perm === '*' ? 'Full Access' : perm}
                          </span>
                        ))}
                        {key.permissions.length > 3 && (
                          <span className="text-xs text-gray-500">+{key.permissions.length - 3} more</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{key.usageCount.toLocaleString()} calls</div>
                      <div className="text-xs text-gray-500">
                        {key.lastUsed ? `Last: ${formatDate(key.lastUsed)}` : 'Never used'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {key.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <HiCheckCircle className="mr-1 h-4 w-4" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <HiXCircle className="mr-1 h-4 w-4" />
                          Revoked
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(key.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === key._id ? null : key._id)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <HiDotsVertical className="h-5 w-5 text-gray-400" />
                        </button>
                        {activeMenu === key._id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                            <button
                              onClick={() => {
                                handleViewUsage(key);
                                setActiveMenu(null);
                              }}
                              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <HiChartBar className="mr-3 h-4 w-4" />
                              View Usage
                            </button>
                            {key.isActive && (
                              <button
                                onClick={() => {
                                  setRevokingKey(key);
                                  setShowRevokeModal(true);
                                  setActiveMenu(null);
                                }}
                                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                              >
                                <HiTrash className="mr-3 h-4 w-4" />
                                Revoke Key
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} keys
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <HiChevronLeft className="h-5 w-5" />
              </button>
              <span className="px-4 py-2 text-sm">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              >
                <HiChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create API Key Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Create API Key</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                <HiX className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant *</label>
                <select
                  value={newKey.tenantId}
                  onChange={(e) => setNewKey({ ...newKey, tenantId: e.target.value, permissions: [] })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select a tenant</option>
                  {tenants.map((tenant) => {
                    const isConfigured = isTenantConfigured(tenant._id);
                    return (
                      <option key={tenant._id} value={tenant._id}>
                        {tenant.name} ({tenant.slug}) {isConfigured ? '✓' : '- Not Configured'}
                      </option>
                    );
                  })}
                </select>
                {newKey.tenantId && !isTenantConfigured(newKey.tenantId) && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-2 text-yellow-800">
                      <HiExclamation className="h-5 w-5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium">API access not configured</p>
                        <p className="text-xs mt-1">Please configure API permissions for this tenant first.</p>
                        <button
                          onClick={() => {
                            const tenant = tenants.find(t => t._id === newKey.tenantId);
                            if (tenant) {
                              setShowCreateModal(false);
                              handleConfigureTenant(tenant);
                            }
                          }}
                          className="mt-2 text-xs font-medium text-yellow-700 underline hover:no-underline"
                        >
                          Configure Now
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Key Name *</label>
                <input
                  type="text"
                  value={newKey.name}
                  onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                  placeholder="e.g., Production Integration Key"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={newKey.description}
                  onChange={(e) => setNewKey({ ...newKey, description: e.target.value })}
                  placeholder="Optional description for this API key"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Permissions</label>
                {(() => {
                  const tenantConf = configuredTenants.find(c => c.tenantId === newKey.tenantId);
                  const allowedScopes = tenantConf?.allowedScopes || [];
                  const filteredScopes = newKey.tenantId && allowedScopes.length > 0
                    ? PERMISSION_SCOPES.filter(s => allowedScopes.includes(s.value) || (allowedScopes.includes('*') && s.value === '*'))
                    : PERMISSION_SCOPES;

                  return (
                    <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
                      {filteredScopes.length === 0 ? (
                        <p className="text-sm text-gray-500 py-2">No scopes configured for this tenant.</p>
                      ) : (
                        filteredScopes.map((scope) => (
                          <label key={scope.value} className="flex items-start gap-3 py-2 hover:bg-gray-50 px-2 rounded cursor-pointer">
                            <input
                              type="checkbox"
                              checked={newKey.permissions.includes(scope.value)}
                              onChange={(e) => {
                                if (scope.value === '*') {
                                  setNewKey({ ...newKey, permissions: e.target.checked ? ['*'] : [] });
                                } else {
                                  const newPerms = e.target.checked
                                    ? [...newKey.permissions.filter(p => p !== '*'), scope.value]
                                    : newKey.permissions.filter(p => p !== scope.value);
                                  setNewKey({ ...newKey, permissions: newPerms });
                                }
                              }}
                              className="mt-1 h-4 w-4 text-purple-600 rounded"
                            />
                            <div>
                              <div className="font-medium text-gray-900">{scope.label}</div>
                              <div className="text-xs text-gray-500">{scope.description}</div>
                            </div>
                          </label>
                        ))
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate Limit (requests/hour)</label>
                  <input
                    type="number"
                    value={newKey.rateLimit.requests}
                    onChange={(e) => setNewKey({ ...newKey, rateLimit: { ...newKey.rateLimit, requests: parseInt(e.target.value) } })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                  <select
                    value={newKey.environment}
                    onChange={(e) => setNewKey({ ...newKey, environment: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date (optional)</label>
                <input
                  type="datetime-local"
                  value={newKey.expiresAt}
                  onChange={(e) => setNewKey({ ...newKey, expiresAt: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                disabled={isCreating}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isCreating ? 'Creating...' : 'Create API Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show Created Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">API Key Created</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <HiExclamation className="h-6 w-6 text-yellow-600 flex-shrink-0" />
                <p className="text-sm text-yellow-800">
                  Make sure to copy your API key now. You won't be able to see it again!
                </p>
              </div>
              <div className="bg-gray-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <code className="text-sm font-mono break-all">{createdKey}</code>
                  <button
                    onClick={() => copyToClipboard(createdKey)}
                    className="ml-3 p-2 text-purple-600 hover:bg-purple-100 rounded-lg flex-shrink-0"
                  >
                    <HiClipboardCopy className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => {
                  setShowKeyModal(false);
                  setCreatedKey('');
                }}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation Modal */}
      {showRevokeModal && revokingKey && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Revoke API Key</h2>
            </div>
            <div className="p-6">
              <p className="text-gray-600 mb-4">
                Are you sure you want to revoke the API key <strong>{revokingKey.name}</strong>?
                This action cannot be undone.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                  placeholder="Enter reason for revocation"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRevokeModal(false);
                  setRevokingKey(null);
                  setRevokeReason('');
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeKey}
                disabled={isRevoking}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isRevoking ? 'Revoking...' : 'Revoke Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Usage Stats Modal */}
      {showUsageModal && selectedKeyUsage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">API Key Usage: {selectedKeyUsage.key.name}</h2>
              <button onClick={() => setShowUsageModal(false)} className="text-gray-400 hover:text-gray-600">
                <HiX className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedKeyUsage.usage.stats?.totalRequests || 0}</p>
                  <p className="text-sm text-gray-500">Total Requests</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedKeyUsage.usage.stats?.successCount || 0}</p>
                  <p className="text-sm text-gray-500">Successful</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{selectedKeyUsage.usage.stats?.errorCount || 0}</p>
                  <p className="text-sm text-gray-500">Errors</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-600">{Math.round(selectedKeyUsage.usage.stats?.avgResponseTime || 0)}ms</p>
                  <p className="text-sm text-gray-500">Avg Response</p>
                </div>
              </div>

              {selectedKeyUsage.usage.endpointBreakdown?.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Top Endpoints</h3>
                  <div className="space-y-2">
                    {selectedKeyUsage.usage.endpointBreakdown.map((ep: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-mono text-sm text-gray-600">{ep._id?.method}</span>
                          <span className="ml-2 text-gray-900">{ep._id?.endpoint}</span>
                        </div>
                        <span className="text-gray-600">{ep.count} calls</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tenant Configuration Modal */}
      {showConfigModal && configuringTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Configure API Access</h2>
                <p className="text-sm text-gray-500 mt-1">{configuringTenant.name} ({configuringTenant.slug})</p>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-gray-400 hover:text-gray-600">
                <HiX className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Enable API Access Toggle */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900">Enable API Access</h3>
                  <p className="text-sm text-gray-500">Allow this tenant to use B2B API keys</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tenantConfig.isAPIAccessEnabled}
                    onChange={(e) => setTenantConfig({ ...tenantConfig, isAPIAccessEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Allowed Permission Scopes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowed Permission Scopes</label>
                <p className="text-xs text-gray-500 mb-3">Select which data modules this tenant can access via API keys</p>
                <div className="border border-gray-300 rounded-lg p-3 max-h-64 overflow-y-auto">
                  {PERMISSION_SCOPES.map((scope) => (
                    <label key={scope.value} className="flex items-start gap-3 py-2 hover:bg-gray-50 px-2 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tenantConfig.allowedScopes.includes(scope.value)}
                        onChange={(e) => {
                          if (scope.value === '*') {
                            setTenantConfig({
                              ...tenantConfig,
                              allowedScopes: e.target.checked ? ['*'] : []
                            });
                          } else {
                            const newScopes = e.target.checked
                              ? [...tenantConfig.allowedScopes.filter(s => s !== '*'), scope.value]
                              : tenantConfig.allowedScopes.filter(s => s !== scope.value);
                            setTenantConfig({ ...tenantConfig, allowedScopes: newScopes });
                          }
                        }}
                        className="mt-1 h-4 w-4 text-purple-600 rounded"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{scope.label}</div>
                        <div className="text-xs text-gray-500">{scope.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Limits */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max API Keys</label>
                  <input
                    type="number"
                    value={tenantConfig.maxKeys}
                    onChange={(e) => setTenantConfig({ ...tenantConfig, maxKeys: parseInt(e.target.value) || 5 })}
                    min={1}
                    max={20}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Requests/Day</label>
                  <input
                    type="number"
                    value={tenantConfig.maxRequestsPerDay}
                    onChange={(e) => setTenantConfig({ ...tenantConfig, maxRequestsPerDay: parseInt(e.target.value) || 10000 })}
                    min={100}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Enabled Environments */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Enabled Environments</label>
                <div className="flex gap-4">
                  {(['production', 'staging', 'development'] as const).map((env) => (
                    <label key={env} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={tenantConfig.enabledEnvironments.includes(env)}
                        onChange={(e) => {
                          const newEnvs = e.target.checked
                            ? [...tenantConfig.enabledEnvironments, env]
                            : tenantConfig.enabledEnvironments.filter(e => e !== env);
                          setTenantConfig({ ...tenantConfig, enabledEnvironments: newEnvs });
                        }}
                        className="h-4 w-4 text-purple-600 rounded"
                      />
                      <span className="capitalize">{env}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={tenantConfig.notes || ''}
                  onChange={(e) => setTenantConfig({ ...tenantConfig, notes: e.target.value })}
                  placeholder="Optional notes about this tenant's API access"
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={isSavingConfig}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {isSavingConfig ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close menu */}
      {activeMenu && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
};

export default APIKeyManagement;
