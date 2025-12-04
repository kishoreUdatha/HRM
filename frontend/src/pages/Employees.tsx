import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { HiPlus, HiSearch, HiFilter, HiDotsVertical, HiPencil, HiTrash, HiEye, HiCloudUpload } from 'react-icons/hi';
import api from '../services/api';
import type { Employee } from '../types';
import BulkUploadModal from '../components/employees/BulkUploadModal';

const Employees: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [departments, setDepartments] = useState<{ _id: string; name: string }[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [pagination.page, selectedDepartment]);

  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (searchTerm) params.append('search', searchTerm);
      if (selectedDepartment) params.append('department', selectedDepartment);

      const response = await api.get(`/employees?${params}`);
      // API returns { success, data: [], pagination: {} }
      setEmployees(response.data.data || []);
      setPagination((prev) => ({
        ...prev,
        total: response.data.pagination?.total || 0,
        pages: response.data.pagination?.totalPages || 0,
      }));
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      // API returns { success, data: [] }
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchEmployees();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await api.delete(`/employees/${id}`);
      fetchEmployees();
    } catch (error) {
      console.error('Failed to delete employee:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
      on_leave: 'bg-yellow-100 text-yellow-700',
      terminated: 'bg-red-100 text-red-700',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || styles.inactive}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-secondary-200 rounded w-1/4" />
        <div className="h-64 bg-secondary-200 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Employees</h1>
          <p className="text-secondary-500">Manage your organization's employees</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBulkUploadOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
          >
            <HiCloudUpload className="w-5 h-5" />
            Bulk Upload
          </button>
          <Link
            to="/employees/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <HiPlus className="w-5 h-5" />
            Add Employee
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <HiFilter className="text-secondary-400 w-5 h-5" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-secondary-100 text-secondary-700 rounded-lg hover:bg-secondary-200 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Employee
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Department
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Position
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Join Date
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {employees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-secondary-500">No employees found</p>
                    <Link
                      to="/employees/new"
                      className="inline-flex items-center gap-2 mt-4 text-primary-600 hover:text-primary-700"
                    >
                      <HiPlus className="w-5 h-5" />
                      Add your first employee
                    </Link>
                  </td>
                </tr>
              ) : (
                employees.map((employee) => (
                  <tr key={employee._id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-medium">
                            {employee.firstName[0]}
                            {employee.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-secondary-900">
                            {employee.firstName} {employee.lastName}
                          </p>
                          <p className="text-sm text-secondary-500">
                            {employee.employeeCode && (
                              <span className="font-mono text-primary-600 mr-2">{employee.employeeCode}</span>
                            )}
                            {employee.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-secondary-600">
                      {typeof employee.departmentId === 'object' && employee.departmentId
                        ? (employee.departmentId as { name: string }).name
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-secondary-600">{employee.designation || '-'}</td>
                    <td className="px-6 py-4">{getStatusBadge(employee.status)}</td>
                    <td className="px-6 py-4 text-secondary-600">
                      {employee.joiningDate
                        ? new Date(employee.joiningDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="relative">
                        <button
                          onClick={() => setActiveMenu(activeMenu === employee._id ? null : employee._id)}
                          className="p-2 hover:bg-secondary-100 rounded-lg"
                        >
                          <HiDotsVertical className="w-5 h-5 text-secondary-400" />
                        </button>
                        {activeMenu === employee._id && (
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-secondary-200 z-10">
                            <Link
                              to={`/employees/${employee._id}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
                            >
                              <HiEye className="w-4 h-4" />
                              View Details
                            </Link>
                            <Link
                              to={`/employees/${employee._id}`}
                              className="flex items-center gap-2 px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50"
                            >
                              <HiPencil className="w-4 h-4" />
                              Edit
                            </Link>
                            <button
                              onClick={() => handleDelete(employee._id!)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <HiTrash className="w-4 h-4" />
                              Delete
                            </button>
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
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-secondary-200">
            <p className="text-sm text-secondary-500">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} employees
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm border border-secondary-200 rounded-lg hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                disabled={pagination.page === pagination.pages}
                className="px-3 py-1 text-sm border border-secondary-200 rounded-lg hover:bg-secondary-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={isBulkUploadOpen}
        onClose={() => setIsBulkUploadOpen(false)}
        onSuccess={() => {
          fetchEmployees();
          fetchDepartments();
        }}
      />
    </div>
  );
};

export default Employees;
