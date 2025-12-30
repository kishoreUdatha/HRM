import React, { useState, useEffect } from 'react';
import {
  HiCurrencyDollar,
  HiPlus,
  HiPencil,
  HiTrash,
  HiCheck,
  HiX,
  HiChevronDown,
  HiChevronUp,
  HiRefresh,
  HiDocumentText,
  HiUserGroup,
} from 'react-icons/hi';
import api from '../services/api';

interface SalaryComponent {
  name: string;
  code: string;
  type: 'earning' | 'deduction';
  calculationType: 'fixed' | 'percentage';
  value: number;
  percentageOf?: 'basic' | 'gross';
  isTaxable: boolean;
  isActive: boolean;
}

interface SalaryStructure {
  _id: string;
  name: string;
  code: string;
  description?: string;
  components: SalaryComponent[];
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  email: string;
}

const SalaryStructures: React.FC = () => {
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [editingStructure, setEditingStructure] = useState<SalaryStructure | null>(null);
  const [selectedStructureId, setSelectedStructureId] = useState<string>('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    isDefault: false,
    components: [] as SalaryComponent[],
  });

  const [assignData, setAssignData] = useState({
    employeeId: '',
    salaryStructureId: '',
    baseSalary: 0,
    effectiveFrom: new Date().toISOString().split('T')[0],
  });

  const [newComponent, setNewComponent] = useState<SalaryComponent>({
    name: '',
    code: '',
    type: 'earning',
    calculationType: 'percentage',
    value: 0,
    percentageOf: 'basic',
    isTaxable: true,
    isActive: true,
  });

  useEffect(() => {
    fetchStructures();
    fetchEmployees();
  }, []);

  const fetchStructures = async () => {
    try {
      const response = await api.get('/payroll/salary-structures');
      setStructures(response.data.data?.salaryStructures || response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch salary structures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const handleSeedDefault = async () => {
    try {
      await api.post('/payroll/salary-structures/seed');
      fetchStructures();
    } catch (error) {
      console.error('Failed to seed default structure:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStructure) {
        await api.put(`/payroll/salary-structures/${editingStructure._id}`, formData);
      } else {
        await api.post('/payroll/salary-structures', formData);
      }
      setIsModalOpen(false);
      resetForm();
      fetchStructures();
    } catch (error) {
      console.error('Failed to save salary structure:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary structure?')) return;
    try {
      await api.delete(`/payroll/salary-structures/${id}`);
      fetchStructures();
    } catch (error) {
      console.error('Failed to delete salary structure:', error);
    }
  };

  const handleAssignSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/payroll/employee-salary', assignData);
      setIsAssignModalOpen(false);
      setAssignData({
        employeeId: '',
        salaryStructureId: '',
        baseSalary: 0,
        effectiveFrom: new Date().toISOString().split('T')[0],
      });
      alert('Salary assigned successfully!');
    } catch (error) {
      console.error('Failed to assign salary:', error);
      alert('Failed to assign salary');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      isDefault: false,
      components: [],
    });
    setEditingStructure(null);
  };

  const openEditModal = (structure: SalaryStructure) => {
    setEditingStructure(structure);
    setFormData({
      name: structure.name,
      code: structure.code,
      description: structure.description || '',
      isDefault: structure.isDefault,
      components: structure.components,
    });
    setIsModalOpen(true);
  };

  const openAssignModal = (structureId: string) => {
    setSelectedStructureId(structureId);
    setAssignData(prev => ({ ...prev, salaryStructureId: structureId }));
    setIsAssignModalOpen(true);
  };

  const addComponent = () => {
    if (!newComponent.name || !newComponent.code) return;
    setFormData(prev => ({
      ...prev,
      components: [...prev.components, { ...newComponent }],
    }));
    setNewComponent({
      name: '',
      code: '',
      type: 'earning',
      calculationType: 'percentage',
      value: 0,
      percentageOf: 'basic',
      isTaxable: true,
      isActive: true,
    });
  };

  const removeComponent = (index: number) => {
    setFormData(prev => ({
      ...prev,
      components: prev.components.filter((_, i) => i !== index),
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <HiCurrencyDollar className="w-6 h-6 text-violet-200" />
              <span className="text-sm font-medium text-white/80">Payroll Settings</span>
            </div>
            <h1 className="text-3xl font-bold mb-1">Salary Structures</h1>
            <p className="text-white/70">Manage salary components and structures</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleSeedDefault}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 text-white rounded-xl font-medium hover:bg-white/30 transition-all"
            >
              <HiRefresh className="w-5 h-5" />
              Seed Default
            </button>
            <button
              onClick={() => { resetForm(); setIsModalOpen(true); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-violet-600 rounded-xl font-semibold hover:bg-white/90 transition-all shadow-lg"
            >
              <HiPlus className="w-5 h-5" />
              New Structure
            </button>
          </div>
        </div>
      </div>

      {/* Structures List */}
      <div className="space-y-4">
        {structures.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-secondary-100 p-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <HiDocumentText className="w-8 h-8 text-violet-500" />
            </div>
            <h3 className="text-lg font-semibold text-secondary-900 mb-2">No Salary Structures</h3>
            <p className="text-secondary-500 mb-4">Create your first salary structure or seed the default one</p>
            <button
              onClick={handleSeedDefault}
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-500 text-white rounded-xl font-medium hover:from-violet-600 hover:to-purple-600 transition-all"
            >
              <HiRefresh className="w-5 h-5" />
              Create Default Structure
            </button>
          </div>
        ) : (
          structures.map((structure) => (
            <div
              key={structure._id}
              className="bg-white rounded-2xl shadow-sm border border-secondary-100 overflow-hidden"
            >
              {/* Structure Header */}
              <div
                className="p-5 flex items-center justify-between cursor-pointer hover:bg-secondary-50 transition-colors"
                onClick={() => setExpandedId(expandedId === structure._id ? null : structure._id)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-500 rounded-xl flex items-center justify-center text-white">
                    <HiCurrencyDollar className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-secondary-900">{structure.name}</h3>
                      {structure.isDefault && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 text-violet-700 rounded-full">
                          Default
                        </span>
                      )}
                      {structure.isActive ? (
                        <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded-full">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-xs font-medium bg-secondary-100 text-secondary-700 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-secondary-500">
                      Code: {structure.code} | {structure.components.length} components
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); openAssignModal(structure._id); }}
                    className="p-2 text-secondary-500 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-all"
                    title="Assign to Employee"
                  >
                    <HiUserGroup className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); openEditModal(structure); }}
                    className="p-2 text-secondary-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Edit"
                  >
                    <HiPencil className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(structure._id); }}
                    className="p-2 text-secondary-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                    title="Delete"
                  >
                    <HiTrash className="w-5 h-5" />
                  </button>
                  {expandedId === structure._id ? (
                    <HiChevronUp className="w-5 h-5 text-secondary-400" />
                  ) : (
                    <HiChevronDown className="w-5 h-5 text-secondary-400" />
                  )}
                </div>
              </div>

              {/* Expanded Components */}
              {expandedId === structure._id && (
                <div className="border-t border-secondary-100 p-5 bg-secondary-50/50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Earnings */}
                    <div>
                      <h4 className="font-semibold text-emerald-700 mb-3 flex items-center gap-2">
                        <HiCheck className="w-5 h-5" />
                        Earnings
                      </h4>
                      <div className="space-y-2">
                        {structure.components
                          .filter((c) => c.type === 'earning')
                          .map((comp, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-secondary-100"
                            >
                              <div>
                                <p className="font-medium text-secondary-900">{comp.name}</p>
                                <p className="text-xs text-secondary-500">Code: {comp.code}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-emerald-600">
                                  {comp.calculationType === 'percentage'
                                    ? `${comp.value}% of ${comp.percentageOf}`
                                    : formatCurrency(comp.value)}
                                </p>
                                <p className="text-xs text-secondary-500">
                                  {comp.isTaxable ? 'Taxable' : 'Non-taxable'}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>

                    {/* Deductions */}
                    <div>
                      <h4 className="font-semibold text-rose-700 mb-3 flex items-center gap-2">
                        <HiX className="w-5 h-5" />
                        Deductions
                      </h4>
                      <div className="space-y-2">
                        {structure.components
                          .filter((c) => c.type === 'deduction')
                          .map((comp, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between p-3 bg-white rounded-lg border border-secondary-100"
                            >
                              <div>
                                <p className="font-medium text-secondary-900">{comp.name}</p>
                                <p className="text-xs text-secondary-500">Code: {comp.code}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-rose-600">
                                  {comp.calculationType === 'percentage'
                                    ? `${comp.value}% of ${comp.percentageOf}`
                                    : formatCurrency(comp.value)}
                                </p>
                                <p className="text-xs text-secondary-500">
                                  {comp.isTaxable ? 'Taxable' : 'Non-taxable'}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-6 py-5">
              <h2 className="text-xl font-bold text-white">
                {editingStructure ? 'Edit Salary Structure' : 'Create Salary Structure'}
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-secondary-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  rows={2}
                />
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isDefault}
                  onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                  className="w-4 h-4 text-violet-600 rounded"
                />
                <span className="text-sm text-secondary-700">Set as default structure</span>
              </label>

              {/* Components Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold text-secondary-900 mb-4">Salary Components</h3>

                {/* Add Component Form */}
                <div className="bg-secondary-50 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <input
                      type="text"
                      placeholder="Name"
                      value={newComponent.name}
                      onChange={(e) => setNewComponent({ ...newComponent, name: e.target.value })}
                      className="px-3 py-2 rounded-lg border border-secondary-200 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Code"
                      value={newComponent.code}
                      onChange={(e) => setNewComponent({ ...newComponent, code: e.target.value.toUpperCase() })}
                      className="px-3 py-2 rounded-lg border border-secondary-200 text-sm"
                    />
                    <select
                      value={newComponent.type}
                      onChange={(e) => setNewComponent({ ...newComponent, type: e.target.value as 'earning' | 'deduction' })}
                      className="px-3 py-2 rounded-lg border border-secondary-200 text-sm"
                    >
                      <option value="earning">Earning</option>
                      <option value="deduction">Deduction</option>
                    </select>
                    <select
                      value={newComponent.calculationType}
                      onChange={(e) => setNewComponent({ ...newComponent, calculationType: e.target.value as 'fixed' | 'percentage' })}
                      className="px-3 py-2 rounded-lg border border-secondary-200 text-sm"
                    >
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <input
                      type="number"
                      placeholder="Value"
                      value={newComponent.value || ''}
                      onChange={(e) => setNewComponent({ ...newComponent, value: Number(e.target.value) })}
                      className="px-3 py-2 rounded-lg border border-secondary-200 text-sm"
                    />
                    {newComponent.calculationType === 'percentage' && (
                      <select
                        value={newComponent.percentageOf}
                        onChange={(e) => setNewComponent({ ...newComponent, percentageOf: e.target.value as 'basic' | 'gross' })}
                        className="px-3 py-2 rounded-lg border border-secondary-200 text-sm"
                      >
                        <option value="basic">% of Basic</option>
                        <option value="gross">% of Gross</option>
                      </select>
                    )}
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newComponent.isTaxable}
                        onChange={(e) => setNewComponent({ ...newComponent, isTaxable: e.target.checked })}
                        className="w-4 h-4 text-violet-600 rounded"
                      />
                      Taxable
                    </label>
                    <button
                      type="button"
                      onClick={addComponent}
                      className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700"
                    >
                      Add Component
                    </button>
                  </div>
                </div>

                {/* Components List */}
                <div className="space-y-2">
                  {formData.components.map((comp, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        comp.type === 'earning' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'
                      }`}
                    >
                      <div>
                        <span className="font-medium">{comp.name}</span>
                        <span className="text-sm text-secondary-500 ml-2">({comp.code})</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={comp.type === 'earning' ? 'text-emerald-600' : 'text-rose-600'}>
                          {comp.calculationType === 'percentage' ? `${comp.value}%` : formatCurrency(comp.value)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeComponent(idx)}
                          className="p-1 text-secondary-400 hover:text-rose-600"
                        >
                          <HiX className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </form>

            <div className="px-6 py-4 bg-secondary-50 border-t flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); resetForm(); }}
                className="px-4 py-2.5 text-secondary-700 bg-white border border-secondary-200 rounded-xl hover:bg-secondary-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-medium hover:from-violet-700 hover:to-purple-700"
              >
                {editingStructure ? 'Update' : 'Create'} Structure
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Salary Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5">
              <h2 className="text-xl font-bold text-white">Assign Salary to Employee</h2>
              <p className="text-white/70 text-sm">Set base salary using this structure</p>
            </div>

            <form onSubmit={handleAssignSalary} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Employee</label>
                <select
                  value={assignData.employeeId}
                  onChange={(e) => setAssignData({ ...assignData, employeeId: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.firstName} {emp.lastName} ({emp.employeeCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Base Salary (Monthly)</label>
                <input
                  type="number"
                  value={assignData.baseSalary || ''}
                  onChange={(e) => setAssignData({ ...assignData, baseSalary: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-1">Effective From</label>
                <input
                  type="date"
                  value={assignData.effectiveFrom}
                  onChange={(e) => setAssignData({ ...assignData, effectiveFrom: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-secondary-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-secondary-700 bg-secondary-100 rounded-xl hover:bg-secondary-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-teal-700"
                >
                  Assign Salary
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryStructures;
