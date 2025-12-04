import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { HiArrowLeft, HiSave, HiClock } from 'react-icons/hi';
import api from '../services/api';
import type { Employee, Shift } from '../types';

interface Department {
  _id: string;
  name: string;
}

const EmployeeForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [isLoading, setIsLoading] = useState(isEditing);
  const [isSaving, setIsSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nextEmployeeCode, setNextEmployeeCode] = useState<string>('');

  const [formData, setFormData] = useState<Partial<Employee>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'male',
    departmentId: '',
    designation: '',
    employeeCode: '',
    status: 'active',
    employmentType: 'full-time',
    joiningDate: new Date().toISOString().split('T')[0],
    salary: {
      basic: 0,
      hra: 0,
      allowances: 0,
      deductions: 0,
      netSalary: 0,
      currency: 'USD',
    },
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
    },
  });

  useEffect(() => {
    fetchDepartments();
    fetchShifts();
    if (isEditing) {
      fetchEmployee();
    } else {
      fetchNextEmployeeCode();
    }
  }, [id]);

  const fetchNextEmployeeCode = async () => {
    try {
      const response = await api.get('/employees/next-code');
      setNextEmployeeCode(response.data.data?.nextEmployeeCode || '');
    } catch (error) {
      console.error('Failed to fetch next employee code:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data.departments || response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      const response = await api.get('/shifts?active=true');
      setShifts(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    }
  };

  const fetchEmployee = async () => {
    try {
      const response = await api.get(`/employees/${id}`);
      const employee = response.data.data.employee || response.data.data;
      setFormData({
        ...employee,
        departmentId: typeof employee.departmentId === 'object' ? employee.departmentId._id : employee.departmentId,
        shiftId: typeof employee.shiftId === 'object' ? employee.shiftId._id : employee.shiftId,
        joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : '',
        dateOfBirth: employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().split('T')[0] : '',
      });
    } catch (error) {
      console.error('Failed to fetch employee:', error);
      navigate('/employees');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setErrors((prev) => ({ ...prev, [name]: '' }));

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof Employee] as Record<string, unknown>),
          [child]: value,
        },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName?.trim()) newErrors.firstName = 'First name is required';
    if (!formData.lastName?.trim()) newErrors.lastName = 'Last name is required';
    if (!formData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.phone?.trim()) newErrors.phone = 'Phone is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.departmentId) newErrors.departmentId = 'Department is required';
    if (!formData.designation?.trim()) newErrors.designation = 'Designation is required';
    if (!formData.joiningDate) newErrors.joiningDate = 'Joining date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      if (isEditing) {
        await api.put(`/employees/${id}`, formData);
      } else {
        // Remove employeeCode for new employees - backend will auto-generate it
        const { employeeCode, ...dataWithoutCode } = formData;
        await api.post('/employees', dataWithoutCode);
      }
      navigate('/employees');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save employee';
      setErrors({ submit: message });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-secondary-200 rounded w-1/4" />
        <div className="h-96 bg-secondary-200 rounded" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/employees')}
          className="p-2 hover:bg-secondary-100 rounded-lg"
        >
          <HiArrowLeft className="w-5 h-5 text-secondary-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">
            {isEditing ? 'Edit Employee' : 'Add Employee'}
          </h1>
          <p className="text-secondary-500">
            {isEditing ? 'Update employee information' : 'Create a new employee record'}
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {errors.submit && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
            {errors.submit}
          </div>
        )}

        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee Code - Read Only */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Employee Code
              </label>
              <div className="w-full px-4 py-2 border border-secondary-200 rounded-lg bg-secondary-50 text-secondary-600">
                {isEditing && formData.employeeCode ? (
                  <span className="font-mono font-semibold text-primary-600">{formData.employeeCode}</span>
                ) : nextEmployeeCode ? (
                  <span className="font-mono font-semibold text-primary-600">{nextEmployeeCode}</span>
                ) : (
                  <span className="italic">Loading...</span>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                First Name *
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.firstName ? 'border-red-500' : 'border-secondary-200'
                }`}
              />
              {errors.firstName && (
                <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Last Name *
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.lastName ? 'border-red-500' : 'border-secondary-200'
                }`}
              />
              {errors.lastName && (
                <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Email *</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.email ? 'border-red-500' : 'border-secondary-200'
                }`}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Phone *</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.phone ? 'border-red-500' : 'border-secondary-200'
                }`}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Date of Birth *
              </label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.dateOfBirth ? 'border-red-500' : 'border-secondary-200'
                }`}
              />
              {errors.dateOfBirth && (
                <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Gender *</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.gender ? 'border-red-500' : 'border-secondary-200'
                }`}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Joining Date *
              </label>
              <input
                type="date"
                name="joiningDate"
                value={formData.joiningDate}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.joiningDate ? 'border-red-500' : 'border-secondary-200'
                }`}
              />
              {errors.joiningDate && (
                <p className="text-red-500 text-xs mt-1">{errors.joiningDate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Employment Details */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">Employment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Department *
              </label>
              <select
                name="departmentId"
                value={(formData.departmentId as string) || ''}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.departmentId ? 'border-red-500' : 'border-secondary-200'
                }`}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
                ))}
              </select>
              {errors.departmentId && (
                <p className="text-red-500 text-xs mt-1">{errors.departmentId}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Designation *</label>
              <input
                type="text"
                name="designation"
                value={formData.designation || ''}
                onChange={handleChange}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  errors.designation ? 'border-red-500' : 'border-secondary-200'
                }`}
              />
              {errors.designation && (
                <p className="text-red-500 text-xs mt-1">{errors.designation}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on-leave">On Leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Employment Type
              </label>
              <select
                name="employmentType"
                value={formData.employmentType}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="full-time">Full Time</option>
                <option value="part-time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                <span className="flex items-center gap-1">
                  <HiClock className="w-4 h-4" />
                  Work Shift
                </span>
              </label>
              <select
                name="shiftId"
                value={(formData.shiftId as string) || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select Shift</option>
                {shifts.map((shift) => (
                  <option key={shift._id} value={shift._id}>
                    {shift.name} ({shift.startTime} - {shift.endTime})
                    {shift.isDefault ? ' (Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Basic Salary</label>
              <input
                type="number"
                name="salary.basic"
                value={formData.salary?.basic || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Currency</label>
              <select
                name="salary.currency"
                value={formData.salary?.currency || 'USD'}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="INR">INR</option>
              </select>
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-secondary-700 mb-1">Street</label>
              <input
                type="text"
                name="address.street"
                value={formData.address?.street || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">City</label>
              <input
                type="text"
                name="address.city"
                value={formData.address?.city || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">State</label>
              <input
                type="text"
                name="address.state"
                value={formData.address?.state || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Country</label>
              <input
                type="text"
                name="address.country"
                value={formData.address?.country || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Zip Code</label>
              <input
                type="text"
                name="address.zipCode"
                value={formData.address?.zipCode || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
          <h2 className="text-lg font-semibold text-secondary-900 mb-4">Emergency Contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Name</label>
              <input
                type="text"
                name="emergencyContact.name"
                value={formData.emergencyContact?.name || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">
                Relationship
              </label>
              <input
                type="text"
                name="emergencyContact.relationship"
                value={formData.emergencyContact?.relationship || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-1">Phone</label>
              <input
                type="tel"
                name="emergencyContact.phone"
                value={formData.emergencyContact?.phone || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/employees')}
            className="px-6 py-2 border border-secondary-200 text-secondary-700 rounded-lg hover:bg-secondary-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            <HiSave className="w-5 h-5" />
            {isSaving ? 'Saving...' : isEditing ? 'Update Employee' : 'Create Employee'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EmployeeForm;
