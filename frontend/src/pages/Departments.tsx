import React, { useEffect, useState } from 'react';
import { HiPlus, HiPencil, HiTrash, HiUserGroup, HiSearch, HiFilter } from 'react-icons/hi';
import api from '../services/api';

interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  headOfDepartment?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  employeeCount?: number;
  isActive: boolean;
}

const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [filteredDepartments, setFilteredDepartments] = useState<Department[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Filter departments when search or status filter changes
  useEffect(() => {
    let filtered = departments;

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (dept) =>
          dept.name.toLowerCase().includes(search) ||
          dept.code.toLowerCase().includes(search) ||
          dept.description?.toLowerCase().includes(search)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((dept) =>
        statusFilter === 'active' ? dept.isActive : !dept.isActive
      );
    }

    setFilteredDepartments(filtered);
  }, [departments, searchTerm, statusFilter]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      // API returns { success, data: [] } - data is directly an array
      const data = response.data.data || [];
      setDepartments(data);
      setFilteredDepartments(data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (department?: Department) => {
    if (department) {
      setEditingDepartment(department);
      setFormData({
        name: department.name,
        code: department.code,
        description: department.description || '',
      });
    } else {
      setEditingDepartment(null);
      setFormData({ name: '', code: '', description: '' });
    }
    setError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
    setFormData({ name: '', code: '', description: '' });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Name and code are required');
      return;
    }

    try {
      if (editingDepartment) {
        await api.put(`/departments/${editingDepartment._id}`, formData);
      } else {
        await api.post('/departments', formData);
      }
      fetchDepartments();
      closeModal();
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to save department');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await api.delete(`/departments/${id}`);
      fetchDepartments();
    } catch (error) {
      console.error('Failed to delete department:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-secondary-200 rounded w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-secondary-200 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Departments</h1>
          <p className="text-secondary-500">Manage your organization's departments</p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <HiPlus className="w-5 h-5" />
          Add Department
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search departments by name, code, or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <HiFilter className="text-secondary-400 w-5 h-5" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        {(searchTerm || statusFilter !== 'all') && (
          <div className="mt-3 flex items-center gap-2 text-sm text-secondary-600">
            <span>Showing {filteredDepartments.length} of {departments.length} departments</span>
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
              }}
              className="text-primary-600 hover:text-primary-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Departments List */}
      <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-secondary-50 border-b border-secondary-200">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Department
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Code
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Description
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Employees
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Head
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200">
              {filteredDepartments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <HiUserGroup className="w-12 h-12 text-secondary-400 mx-auto mb-4" />
                    <p className="text-secondary-500">
                      {departments.length === 0 ? 'No departments found' : 'No departments match your filters'}
                    </p>
                    {departments.length === 0 && (
                      <button
                        onClick={() => openModal()}
                        className="inline-flex items-center gap-2 mt-4 text-primary-600 hover:text-primary-700"
                      >
                        <HiPlus className="w-5 h-5" />
                        Create your first department
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredDepartments.map((dept) => (
                  <tr key={dept._id} className="hover:bg-secondary-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                          <HiUserGroup className="w-5 h-5 text-primary-600" />
                        </div>
                        <span className="font-medium text-secondary-900">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-secondary-100 text-secondary-700 rounded text-sm font-mono">
                        {dept.code}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-secondary-600 max-w-xs truncate">
                      {dept.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-secondary-900">{dept.employeeCount || 0}</span>
                    </td>
                    <td className="px-6 py-4 text-secondary-600">
                      {dept.headOfDepartment
                        ? `${dept.headOfDepartment.firstName} ${dept.headOfDepartment.lastName}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          dept.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openModal(dept)}
                          className="p-2 hover:bg-secondary-100 rounded-lg"
                          title="Edit"
                        >
                          <HiPencil className="w-4 h-4 text-secondary-500" />
                        </button>
                        <button
                          onClick={() => handleDelete(dept._id)}
                          className="p-2 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <HiTrash className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h2 className="text-xl font-bold text-secondary-900 mb-4">
              {editingDepartment ? 'Edit Department' : 'Add Department'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Engineering"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., ENG"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Department description..."
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-secondary-700 hover:bg-secondary-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                >
                  {editingDepartment ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Departments;
