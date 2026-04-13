import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  HiSearch,
  HiFilter,
  HiPlus,
  HiDotsVertical,
  HiEye,
  HiPencil,
  HiTrash,
  HiCheckCircle,
  HiClock,
  HiBan,
  HiRefresh,
  HiChevronLeft,
  HiChevronRight,
  HiDownload,
  HiUserGroup,
  HiSortAscending,
  HiSortDescending,
  HiSelector,
  HiCalendar,
  HiX,
  HiDocumentDownload,
  HiSparkles,
} from 'react-icons/hi';
import { toast } from 'react-hot-toast';
import api from '../../services/api';

interface Tenant {
  _id: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'cancelled' | 'inactive';
  subscription: {
    plan: string;
    startDate: string;
    endDate: string;
    amount: number;
    billingCycle: string;
  };
  settings: {
    employeeLimit: number;
  };
  employeeCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

type SortField = 'name' | 'createdAt' | 'status' | 'plan' | 'employeeCount';
type SortOrder = 'asc' | 'desc';

const TenantManagement: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [dateFromFilter, setDateFromFilter] = useState<string>('');
  const [dateToFilter, setDateToFilter] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    plan: 'starter',
    adminEmail: '',
    adminPassword: '',
    adminFirstName: '',
    adminLastName: '',
  });
  const [isCreatingTenant, setIsCreatingTenant] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editTenantData, setEditTenantData] = useState({
    name: '',
    slug: '',
    status: '',
    plan: '',
  });
  const [isUpdatingTenant, setIsUpdatingTenant] = useState(false);

  // Debounced search
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    fetchTenants();
  }, [pagination.page, statusFilter, planFilter, dateFromFilter, dateToFilter, sortField, sortOrder, debouncedSearchTerm]);

  const fetchTenants = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortField,
        sortOrder,
      });

      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (planFilter !== 'all') params.append('plan', planFilter);
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (dateFromFilter) params.append('dateFrom', dateFromFilter);
      if (dateToFilter) params.append('dateTo', dateToFilter);

      const response = await api.get(`/tenants/admin/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        setTenants(response.data.data);
        if (response.data.pagination) {
          setPagination(response.data.pagination);
        }
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      // Fallback to regular endpoint if admin/list doesn't exist
      try {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
        });
        if (statusFilter !== 'all') params.append('status', statusFilter);
        if (planFilter !== 'all') params.append('plan', planFilter);
        if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);

        const response = await api.get(`/tenants?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.data.success) {
          let data = response.data.data || [];

          // Client-side sorting
          data = sortTenantsLocally(data, sortField, sortOrder);

          // Client-side date filtering
          if (dateFromFilter || dateToFilter) {
            data = data.filter((tenant: Tenant) => {
              const createdAt = new Date(tenant.createdAt);
              if (dateFromFilter && createdAt < new Date(dateFromFilter)) return false;
              if (dateToFilter && createdAt > new Date(dateToFilter + 'T23:59:59')) return false;
              return true;
            });
          }

          setTenants(data);
          if (response.data.pagination) {
            setPagination(response.data.pagination);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        toast.error('Failed to fetch tenants');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const sortTenantsLocally = (data: Tenant[], field: SortField, order: SortOrder) => {
    return [...data].sort((a, b) => {
      let aVal: any, bVal: any;

      switch (field) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'createdAt':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'status':
          aVal = a.status;
          bVal = b.status;
          break;
        case 'plan':
          aVal = a.subscription?.plan || '';
          bVal = b.subscription?.plan || '';
          break;
        case 'employeeCount':
          aVal = a.employeeCount || 0;
          bVal = b.employeeCount || 0;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return order === 'asc' ? -1 : 1;
      if (aVal > bVal) return order === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <HiSelector className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? (
      <HiSortAscending className="w-4 h-4 text-purple-600" />
    ) : (
      <HiSortDescending className="w-4 h-4 text-purple-600" />
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleStatusChange = async (tenantId: string, newStatus: string) => {
    const token = localStorage.getItem('superAdminAccessToken');

    try {
      await api.put(
        `/tenants/admin/${tenantId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(`Tenant status updated to ${newStatus}`);
      fetchTenants();
    } catch (error) {
      console.error('Failed to update tenant status:', error);
      toast.error('Failed to update tenant status');
    }
    setActiveMenu(null);
  };

  const handleDeleteTenant = async (tenantId: string, tenantName: string) => {
    if (!confirm(`Are you sure you want to delete "${tenantName}"? This action cannot be undone.`)) {
      return;
    }

    const token = localStorage.getItem('superAdminAccessToken');

    try {
      await api.delete(`/tenants/admin/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success('Tenant deleted successfully');
      fetchTenants();
    } catch (error) {
      console.error('Failed to delete tenant:', error);
      toast.error('Failed to delete tenant');
    }
    setActiveMenu(null);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = localStorage.getItem('superAdminAccessToken');

    // Validate admin user fields
    if (!newTenant.adminEmail || !newTenant.adminPassword || !newTenant.adminFirstName || !newTenant.adminLastName) {
      toast.error('All admin user fields are required');
      return;
    }

    if (newTenant.adminPassword.length < 6) {
      toast.error('Admin password must be at least 6 characters');
      return;
    }

    setIsCreatingTenant(true);

    try {
      // Use the combined endpoint to create tenant and admin user together
      const response = await api.post('/tenants/admin/create-with-admin', {
        name: newTenant.name,
        slug: newTenant.slug || undefined,
        plan: newTenant.plan,
        adminEmail: newTenant.adminEmail,
        adminPassword: newTenant.adminPassword,
        adminFirstName: newTenant.adminFirstName,
        adminLastName: newTenant.adminLastName,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data.success) {
        if (response.data.warning) {
          toast.error(response.data.message);
        } else {
          toast.success('Tenant and admin user created successfully!');
        }
        setShowCreateModal(false);
        setNewTenant({
          name: '',
          slug: '',
          plan: 'starter',
          adminEmail: '',
          adminPassword: '',
          adminFirstName: '',
          adminLastName: '',
        });
        fetchTenants();
      } else {
        toast.error(response.data.message || 'Failed to create tenant');
      }
    } catch (error: any) {
      console.error('Failed to create tenant:', error);
      toast.error(error.response?.data?.message || 'Failed to create tenant');
    } finally {
      setIsCreatingTenant(false);
    }
  };

  const openEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditTenantData({
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status,
      plan: tenant.subscription?.plan || 'free',
    });
    setShowEditModal(true);
    setActiveMenu(null);
  };

  const handleEditTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    const token = localStorage.getItem('superAdminAccessToken');
    setIsUpdatingTenant(true);

    try {
      // Update tenant basic info
      await api.put(
        `/tenants/admin/${editingTenant._id}/update`,
        {
          name: editTenantData.name,
          status: editTenantData.status,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update subscription plan if changed
      if (editTenantData.plan !== editingTenant.subscription?.plan) {
        await api.put(
          `/tenants/current/subscription`,
          { plan: editTenantData.plan },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'x-tenant-id': editingTenant._id,
            },
          }
        );
      }

      toast.success('Tenant updated successfully');
      setShowEditModal(false);
      setEditingTenant(null);
      fetchTenants();
    } catch (error: any) {
      console.error('Failed to update tenant:', error);
      toast.error(error.response?.data?.message || 'Failed to update tenant');
    } finally {
      setIsUpdatingTenant(false);
    }
  };

  const clearFilters = () => {
    setStatusFilter('all');
    setPlanFilter('all');
    setDateFromFilter('');
    setDateToFilter('');
    setSearchTerm('');
    setSortField('createdAt');
    setSortOrder('desc');
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const hasActiveFilters = statusFilter !== 'all' || planFilter !== 'all' || dateFromFilter || dateToFilter || searchTerm;

  // Export functionality
  const exportToCSV = useCallback(() => {
    const headers = ['Name', 'Slug', 'Plan', 'Status', 'Billing Cycle', 'Amount', 'Employees', 'Created At'];

    const csvData = tenants.map(tenant => {
      return [
        tenant.name,
        tenant.slug,
        tenant.subscription?.plan || 'free',
        tenant.status,
        tenant.subscription?.billingCycle || 'N/A',
        tenant.subscription?.amount || 0,
        tenant.employeeCount || 0,
        new Date(tenant.createdAt).toLocaleDateString(),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    downloadFile(csvContent, 'tenants-export.csv', 'text/csv');
  }, [tenants]);

  const exportToExcel = useCallback(async () => {
    setIsExporting(true);
    try {
      // Create a simple Excel-compatible XML format
      const headers = ['Name', 'Slug', 'Plan', 'Status', 'Billing Cycle', 'Amount (INR)', 'Employees', 'Created At'];

      let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xmlContent += '<?mso-application progid="Excel.Sheet"?>\n';
      xmlContent += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">\n';
      xmlContent += '<Worksheet ss:Name="Tenants">\n<Table>\n';

      // Header row
      xmlContent += '<Row>\n';
      headers.forEach(header => {
        xmlContent += `<Cell><Data ss:Type="String">${header}</Data></Cell>\n`;
      });
      xmlContent += '</Row>\n';

      // Data rows
      tenants.forEach(tenant => {
        xmlContent += '<Row>\n';
        xmlContent += `<Cell><Data ss:Type="String">${tenant.name}</Data></Cell>\n`;
        xmlContent += `<Cell><Data ss:Type="String">${tenant.slug}</Data></Cell>\n`;
        xmlContent += `<Cell><Data ss:Type="String">${tenant.subscription?.plan || 'free'}</Data></Cell>\n`;
        xmlContent += `<Cell><Data ss:Type="String">${tenant.status}</Data></Cell>\n`;
        xmlContent += `<Cell><Data ss:Type="String">${tenant.subscription?.billingCycle || 'N/A'}</Data></Cell>\n`;
        xmlContent += `<Cell><Data ss:Type="Number">${tenant.subscription?.amount || 0}</Data></Cell>\n`;
        xmlContent += `<Cell><Data ss:Type="Number">${tenant.employeeCount || 0}</Data></Cell>\n`;
        xmlContent += `<Cell><Data ss:Type="String">${new Date(tenant.createdAt).toLocaleDateString()}</Data></Cell>\n`;
        xmlContent += '</Row>\n';
      });

      xmlContent += '</Table>\n</Worksheet>\n</Workbook>';

      downloadFile(xmlContent, 'tenants-export.xls', 'application/vnd.ms-excel');
      toast.success('Excel file exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export Excel file');
    } finally {
      setIsExporting(false);
      setShowExportModal(false);
    }
  }, [tenants]);

  const exportToJSON = useCallback(() => {
    const jsonData = tenants.map(tenant => ({
      name: tenant.name,
      slug: tenant.slug,
      plan: tenant.subscription?.plan || 'free',
      status: tenant.status,
      billingCycle: tenant.subscription?.billingCycle,
      amount: tenant.subscription?.amount,
      employeeCount: tenant.employeeCount || 0,
      createdAt: tenant.createdAt,
    }));

    downloadFile(JSON.stringify(jsonData, null, 2), 'tenants-export.json', 'application/json');
  }, [tenants]);

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported to ${filename}`);
  };

  const getStatusBadge = (tenant: Tenant) => {
    const status = tenant.status;

    const styles = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-700',
      inactive: 'bg-gray-100 text-gray-600',
    };

    const icons = {
      active: <HiCheckCircle className="w-3 h-3" />,
      suspended: <HiBan className="w-3 h-3" />,
      cancelled: <HiBan className="w-3 h-3" />,
      inactive: <HiBan className="w-3 h-3" />,
    };

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${
          styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {icons[status as keyof typeof icons]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getPlanBadge = (plan: string) => {
    const styles: Record<string, string> = {
      free: 'bg-gray-100 text-gray-700',
      starter: 'bg-blue-100 text-blue-700',
      professional: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-orange-100 text-orange-700',
    };

    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${
          styles[plan] || 'bg-gray-100 text-gray-700'
        }`}
      >
        {plan.charAt(0).toUpperCase() + plan.slice(1)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
          <p className="text-gray-500 mt-1">Manage all organizations on the platform</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700"
        >
          <HiPlus className="w-4 h-4" />
          Add Tenant
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or slug..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <HiX className="w-4 h-4" />
                </button>
              )}
            </div>
          </form>

          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium ${
                showFilters || hasActiveFilters
                  ? 'border-purple-500 text-purple-600 bg-purple-50'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <HiFilter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">!</span>
              )}
            </button>
            <button
              onClick={fetchTenants}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <HiRefresh className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <HiDownload className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                <select
                  value={planFilter}
                  onChange={(e) => {
                    setPlanFilter(e.target.value);
                    setPagination((prev) => ({ ...prev, page: 1 }));
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">All Plans</option>
                  <option value="free">Free</option>
                  <option value="starter">Starter</option>
                  <option value="professional">Professional</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created From</label>
                <div className="relative">
                  <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateFromFilter}
                    onChange={(e) => {
                      setDateFromFilter(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Created To</label>
                <div className="relative">
                  <HiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="date"
                    value={dateToFilter}
                    onChange={(e) => {
                      setDateToFilter(e.target.value);
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              {hasActiveFilters && (
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                  >
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>
          Showing {tenants.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0} to{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} tenants
        </span>
        <span className="text-gray-400">
          Sorted by {sortField.replace(/([A-Z])/g, ' $1').toLowerCase()} ({sortOrder === 'asc' ? 'ascending' : 'descending'})
        </span>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        ) : tenants.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <HiUserGroup className="w-12 h-12 mb-2" />
            <p>No tenants found</p>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="mt-2 text-purple-600 hover:text-purple-700 text-sm"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th
                    onClick={() => handleSort('name')}
                    className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3 cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      Organization
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('plan')}
                    className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3 cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      Plan
                      {getSortIcon('plan')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3 cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('employeeCount')}
                    className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3 cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      Employees
                      {getSortIcon('employeeCount')}
                    </div>
                  </th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3">
                    MRR
                  </th>
                  <th
                    onClick={() => handleSort('createdAt')}
                    className="text-left text-xs font-medium text-gray-500 uppercase px-6 py-3 cursor-pointer hover:bg-gray-100"
                  >
                    <div className="flex items-center gap-1">
                      Created
                      {getSortIcon('createdAt')}
                    </div>
                  </th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tenants.map((tenant) => (
                  <tr key={tenant._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/super-admin/tenants/${tenant._id}`}
                        className="font-medium text-gray-900 hover:text-purple-600"
                      >
                        {tenant.name}
                      </Link>
                      <p className="text-gray-500 text-sm">{tenant.slug}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        {getPlanBadge(tenant.subscription?.plan || 'free')}
                        <span className="text-xs text-gray-500">
                          {tenant.subscription?.billingCycle || 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(tenant)}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tenant.employeeCount || 0} / {tenant.settings?.employeeLimit || tenant.subscription?.plan === 'enterprise' ? '∞' : PLAN_LIMITS[tenant.subscription?.plan as keyof typeof PLAN_LIMITS]?.maxEmployees || 10}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {tenant.subscription?.amount ? (
                        <span className="font-medium">
                          ₹{tenant.subscription.billingCycle === 'yearly'
                            ? Math.round(tenant.subscription.amount / 12).toLocaleString()
                            : tenant.subscription.amount.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMenu(activeMenu === tenant._id ? null : tenant._id)
                          }
                          className="p-2 hover:bg-gray-100 rounded-lg"
                        >
                          <HiDotsVertical className="w-5 h-5 text-gray-400" />
                        </button>

                        {activeMenu === tenant._id && (
                          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-100 z-10">
                            <div className="py-1">
                              <Link
                                to={`/super-admin/tenants/${tenant._id}`}
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <HiEye className="w-4 h-4" />
                                View Details
                              </Link>
                              <button
                                onClick={() => openEditModal(tenant)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                <HiPencil className="w-4 h-4" />
                                Edit Tenant
                              </button>
                              <hr className="my-1" />
                              {tenant.status === 'suspended' ? (
                                <button
                                  onClick={() => handleStatusChange(tenant._id, 'active')}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-green-600 hover:bg-gray-50"
                                >
                                  <HiCheckCircle className="w-4 h-4" />
                                  Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleStatusChange(tenant._id, 'suspended')}
                                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-600 hover:bg-gray-50"
                                >
                                  <HiBan className="w-4 h-4" />
                                  Suspend
                                </button>
                              )}
                              <hr className="my-1" />
                              <button
                                onClick={() => handleDeleteTenant(tenant._id, tenant.name)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                              >
                                <HiTrash className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Rows per page:</span>
              <select
                value={pagination.limit}
                onChange={(e) => setPagination((prev) => ({ ...prev, limit: parseInt(e.target.value), page: 1 }))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))}
                disabled={pagination.page === 1}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                title="First page"
              >
                <HiChevronLeft className="w-5 h-5" />
                <HiChevronLeft className="w-5 h-5 -ml-3" />
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                title="Previous page"
              >
                <HiChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                title="Next page"
              >
                <HiChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.pages }))}
                disabled={pagination.page === pagination.pages}
                className="p-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                title="Last page"
              >
                <HiChevronRight className="w-5 h-5" />
                <HiChevronRight className="w-5 h-5 -ml-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Tenant Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-xl font-bold text-gray-900">Create New Tenant</h2>
              <p className="text-sm text-gray-500 mt-1">Create a new organization with an admin user</p>
            </div>
            <form onSubmit={handleCreateTenant}>
              <div className="p-6 space-y-6">
                {/* Organization Details Section */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Organization Details</h3>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organization Name *
                    </label>
                    <input
                      type="text"
                      value={newTenant.name}
                      onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Acme Corporation"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Slug (URL identifier)
                    </label>
                    <input
                      type="text"
                      value={newTenant.slug}
                      onChange={(e) =>
                        setNewTenant({
                          ...newTenant,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        })
                      }
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="acme-corp"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Only lowercase letters, numbers, and hyphens
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                    <select
                      value={newTenant.plan}
                      onChange={(e) => setNewTenant({ ...newTenant, plan: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="free">Free (10 employees)</option>
                      <option value="starter">Starter</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                </div>

                {/* Admin User Section */}
                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Admin User Credentials</h3>
                  <p className="text-xs text-gray-500 -mt-2">This user will be the primary administrator for the organization</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name *
                      </label>
                      <input
                        type="text"
                        value={newTenant.adminFirstName}
                        onChange={(e) => setNewTenant({ ...newTenant, adminFirstName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="John"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name *
                      </label>
                      <input
                        type="text"
                        value={newTenant.adminLastName}
                        onChange={(e) => setNewTenant({ ...newTenant, adminLastName: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        placeholder="Doe"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Admin Email *
                    </label>
                    <input
                      type="email"
                      value={newTenant.adminEmail}
                      onChange={(e) => setNewTenant({ ...newTenant, adminEmail: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="admin@company.com"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This email will be used to login to the tenant
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={newTenant.adminPassword}
                      onChange={(e) => setNewTenant({ ...newTenant, adminPassword: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Enter a strong password"
                      minLength={8}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum 8 characters
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 p-6 border-t border-gray-100 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={isCreatingTenant}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTenant}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreatingTenant ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Tenant'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {showEditModal && editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Edit Tenant</h2>
              <p className="text-sm text-gray-500 mt-1">Update tenant information</p>
            </div>
            <form onSubmit={handleEditTenant}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization Name *
                  </label>
                  <input
                    type="text"
                    value={editTenantData.name}
                    onChange={(e) => setEditTenantData({ ...editTenantData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slug (URL identifier)
                  </label>
                  <input
                    type="text"
                    value={editTenantData.slug}
                    disabled
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Slug cannot be changed after creation</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editTenantData.status}
                    onChange={(e) => setEditTenantData({ ...editTenantData, status: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subscription Plan</label>
                  <select
                    value={editTenantData.plan}
                    onChange={(e) => setEditTenantData({ ...editTenantData, plan: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="free">Free (10 employees)</option>
                    <option value="starter">Starter (50 employees)</option>
                    <option value="professional">Professional (200 employees)</option>
                    <option value="enterprise">Enterprise (Unlimited)</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 p-6 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingTenant(null);
                  }}
                  disabled={isUpdatingTenant}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTenant}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdatingTenant ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Tenant'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm mx-4">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Export Tenants</h2>
              <p className="text-sm text-gray-500 mt-1">
                Export {tenants.length} tenants to your preferred format
              </p>
            </div>
            <div className="p-6 space-y-3">
              <button
                onClick={() => { exportToCSV(); setShowExportModal(false); }}
                disabled={isExporting}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <HiDocumentDownload className="w-6 h-6 text-green-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">CSV</p>
                  <p className="text-sm text-gray-500">Comma-separated values</p>
                </div>
              </button>
              <button
                onClick={exportToExcel}
                disabled={isExporting}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {isExporting ? (
                  <div className="w-6 h-6 border-2 border-green-200 border-t-green-600 rounded-full animate-spin" />
                ) : (
                  <HiDocumentDownload className="w-6 h-6 text-green-600" />
                )}
                <div className="text-left">
                  <p className="font-medium text-gray-900">Excel</p>
                  <p className="text-sm text-gray-500">Microsoft Excel format</p>
                </div>
              </button>
              <button
                onClick={() => { exportToJSON(); setShowExportModal(false); }}
                disabled={isExporting}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <HiDocumentDownload className="w-6 h-6 text-blue-600" />
                <div className="text-left">
                  <p className="font-medium text-gray-900">JSON</p>
                  <p className="text-sm text-gray-500">JavaScript Object Notation</p>
                </div>
              </button>
            </div>
            <div className="p-6 border-t border-gray-100">
              <button
                onClick={() => setShowExportModal(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const PLAN_LIMITS = {
  free: { maxEmployees: 10, maxAdmins: 1 },
  starter: { maxEmployees: 50, maxAdmins: 3 },
  professional: { maxEmployees: 200, maxAdmins: 10 },
  enterprise: { maxEmployees: 10000, maxAdmins: 100 },
};

export default TenantManagement;
