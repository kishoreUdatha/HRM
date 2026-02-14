import React, { useState, useEffect } from 'react';
import {
  HiX,
  HiCheckCircle,
  HiClock,
  HiXCircle,
  HiCalendar,
  HiSearch,
} from 'react-icons/hi';
import api from '../../services/api';

interface Employee {
  _id: string;
  firstName: string;
  lastName: string;
  employeeCode: string;
  departmentId?: {
    _id: string;
    name: string;
  };
}

interface MarkAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MarkAttendanceModal: React.FC<MarkAttendanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState<string>('present');
  const [checkIn, setCheckIn] = useState('09:00');
  const [checkOut, setCheckOut] = useState('18:00');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm) {
      const filtered = employees.filter(
        (emp) =>
          `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
          emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredEmployees(filtered);
      setShowDropdown(true);
    } else {
      setFilteredEmployees([]);
      setShowDropdown(false);
    }
  }, [searchTerm, employees]);

  const fetchEmployees = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/employees?limit=500&status=active');
      setEmployees(response.data.data?.employees || response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSearchTerm(`${employee.firstName} ${employee.lastName} (${employee.employeeCode})`);
    setShowDropdown(false);
  };

  const handleSubmit = async () => {
    if (!selectedEmployee) {
      alert('Please select an employee');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        employeeId: selectedEmployee._id,
        date: date,
        status: status,
      };

      // Add check-in/check-out times if status is present or late
      if (status === 'present' || status === 'late' || status === 'half_day') {
        // Create datetime from date and time
        const checkInDateTime = new Date(`${date}T${checkIn}:00`);
        const checkOutDateTime = new Date(`${date}T${checkOut}:00`);
        payload.checkIn = checkInDateTime.toISOString();
        payload.checkOut = checkOutDateTime.toISOString();
      }

      if (notes) {
        payload.notes = notes;
      }

      await api.post('/attendance/mark', payload);
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error('Failed to mark attendance:', error);
      alert(error.response?.data?.message || 'Failed to mark attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSelectedEmployee(null);
    setSearchTerm('');
    setDate(new Date().toISOString().split('T')[0]);
    setStatus('present');
    setCheckIn('09:00');
    setCheckOut('18:00');
    setNotes('');
    onClose();
  };

  if (!isOpen) return null;

  const statusOptions = [
    { value: 'present', label: 'Present', icon: HiCheckCircle, color: 'text-green-600 bg-green-100' },
    { value: 'absent', label: 'Absent', icon: HiXCircle, color: 'text-red-600 bg-red-100' },
    { value: 'late', label: 'Late', icon: HiClock, color: 'text-yellow-600 bg-yellow-100' },
    { value: 'half_day', label: 'Half Day', icon: HiClock, color: 'text-orange-600 bg-orange-100' },
    { value: 'on_leave', label: 'On Leave', icon: HiCalendar, color: 'text-blue-600 bg-blue-100' },
    { value: 'holiday', label: 'Holiday', icon: HiCalendar, color: 'text-purple-600 bg-purple-100' },
    { value: 'weekend', label: 'Weekend', icon: HiCalendar, color: 'text-gray-600 bg-gray-100' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-secondary-200">
          <h2 className="text-xl font-semibold text-secondary-900">Mark Attendance</h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
          >
            <HiX className="w-5 h-5 text-secondary-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-130px)]">
          {/* Employee Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Select Employee *
            </label>
            <div className="relative">
              <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedEmployee(null);
                }}
                onFocus={() => searchTerm && setShowDropdown(true)}
                placeholder="Search by name or employee code..."
                className="w-full pl-10 pr-4 py-2.5 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {showDropdown && filteredEmployees.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {filteredEmployees.map((emp) => (
                  <button
                    key={emp._id}
                    onClick={() => handleSelectEmployee(emp)}
                    className="w-full px-4 py-3 text-left hover:bg-secondary-50 flex items-center gap-3 border-b border-secondary-100 last:border-0"
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-medium">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-secondary-900">
                        {emp.firstName} {emp.lastName}
                      </p>
                      <p className="text-sm text-secondary-500">
                        {emp.employeeCode} {emp.departmentId?.name && `• ${emp.departmentId.name}`}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {showDropdown && searchTerm && filteredEmployees.length === 0 && !isLoading && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-secondary-200 rounded-lg shadow-lg p-4 text-center text-secondary-500">
                No employees found
              </div>
            )}
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <p className="text-xs text-secondary-500 mt-1">
              You can mark attendance for past dates
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Status *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {statusOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setStatus(opt.value)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                      status === opt.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-secondary-200 hover:border-secondary-300'
                    }`}
                  >
                    <div className={`p-1 rounded-full ${opt.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-medium text-secondary-700">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Check In/Out Times (only for present, late, half_day) */}
          {(status === 'present' || status === 'late' || status === 'half_day') && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Check In Time
                </label>
                <input
                  type="time"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-4 py-2.5 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">
                  Check Out Time
                </label>
                <input
                  type="time"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="w-full px-4 py-2.5 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this attendance..."
              rows={2}
              className="w-full px-4 py-2.5 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-secondary-200 bg-secondary-50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-secondary-700 hover:bg-secondary-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedEmployee || isSubmitting}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Marking...' : 'Mark Attendance'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarkAttendanceModal;
