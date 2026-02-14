import React, { useState, useEffect } from 'react';
import {
  HiChevronLeft,
  HiDownload,
  HiCalendar,
  HiUsers,
  HiOfficeBuilding,
  HiClock,
  HiCheckCircle,
  HiXCircle,
  HiDocumentReport,
  HiSearch,
  HiLocationMarker,
  HiExclamationCircle,
  HiClipboardList,
  HiCurrencyRupee,
  HiCash,
  HiCalculator,
  HiShieldCheck,
  HiDocumentDownload,
} from 'react-icons/hi';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import api from '../services/api';

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

interface Department {
  _id: string;
  name: string;
}

interface AttendanceRecord {
  _id: string;
  employeeId: string;
  employee?: Employee;
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: string;
  workHours?: number;
  overtimeHours?: number;
  lateMinutes?: number;
  earlyLeaveMinutes?: number;
  gpsStatus?: 'approved' | 'rejected' | 'pending';
  gpsLocation?: { lat: number; lng: number };
  notes?: string;
}

interface LeaveRecord {
  _id: string;
  employeeId: string;
  employee?: Employee;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  status: string;
  reason?: string;
  appliedOn: string;
}

interface LeaveBalance {
  employeeId: string;
  employee?: Employee;
  balances: {
    type: string;
    total: number;
    used: number;
    pending: number;
    available: number;
  }[];
}

interface SalaryRecord {
  _id: string;
  employeeId: string;
  employee?: Employee;
  month: number;
  year: number;
  basicSalary: number;
  hra: number;
  allowances: number;
  deductions: number;
  grossSalary: number;
  netSalary: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  tds: number;
  otherDeductions: number;
  bonus: number;
  overtime: number;
  status: 'draft' | 'processed' | 'paid';
  paidOn?: string;
}

interface PFStatement {
  employeeId: string;
  employee?: Employee;
  month: number;
  year: number;
  basicSalary: number;
  pfWages: number;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  uanNumber?: string;
}

interface ESIStatement {
  employeeId: string;
  employee?: Employee;
  month: number;
  year: number;
  grossSalary: number;
  esiWages: number;
  employeeContribution: number;
  employerContribution: number;
  totalContribution: number;
  esicNumber?: string;
}

type ReportCategory = 'attendance' | 'leave' | 'salary';
type AttendanceReportType =
  | 'daily-performance' | 'daily-absent' | 'daily-in-out' | 'daily-late-in'
  | 'daily-early-in' | 'daily-gps-approved' | 'daily-gps-rejected' | 'daily-gps-pending'
  | 'daily-present' | 'daily-short-performance' | 'daily-early-out' | 'daily-overtime'
  | 'daily-mis-punch' | 'daily-half-day'
  | 'monthly-performance' | 'monthly-absent' | 'monthly-late-in' | 'monthly-overtime'
  | 'monthly-summary';
type LeaveReportType = 'leave-application' | 'leave-balance-employee' | 'leave-balance-department' | 'leave-balance-combined';
type SalaryReportType = 'salary-report' | 'salary-slip-normal' | 'salary-slip-formula' | 'salary-summary-normal' | 'salary-summary-formula' | 'pf-statement' | 'esi-statement';
type ReportType = AttendanceReportType | LeaveReportType | SalaryReportType;

const Reports: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory | null>(null);
  const [selectedReportType, setSelectedReportType] = useState<ReportType | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any[]>([]);
  const [showReport, setShowReport] = useState(false);

  // Filters
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [useRange, setUseRange] = useState(false);

  // Data
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees?limit=500&status=active');
      setEmployees(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/departments');
      setDepartments(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const getDateRange = () => {
    if (useRange) {
      return { startDate, endDate };
    }
    if (selectedReportType?.startsWith('monthly')) {
      const start = new Date(selectedYear, selectedMonth, 1);
      const end = new Date(selectedYear, selectedMonth + 1, 0);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      };
    }
    return { startDate: selectedDate, endDate: selectedDate };
  };

  const fetchAttendanceReport = async () => {
    setLoading(true);
    try {
      const { startDate: start, endDate: end } = getDateRange();
      const params = new URLSearchParams({
        startDate: start,
        endDate: end,
        limit: '1000',
      });

      if (selectedEmployee !== 'all') {
        params.append('employeeId', selectedEmployee);
      }
      if (selectedDepartment !== 'all') {
        params.append('departmentId', selectedDepartment);
      }

      const response = await api.get(`/attendance?${params}`);
      let records = response.data.data?.records || [];

      // Filter based on report type
      records = filterAttendanceRecords(records);
      setReportData(records);
    } catch (error) {
      console.error('Failed to fetch attendance report:', error);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAttendanceRecords = (records: AttendanceRecord[]) => {
    switch (selectedReportType) {
      case 'daily-absent':
      case 'monthly-absent':
        return records.filter(r => r.status === 'absent');
      case 'daily-present':
        return records.filter(r => r.status === 'present' || r.status === 'late');
      case 'daily-late-in':
      case 'monthly-late-in':
        return records.filter(r => r.status === 'late' || (r.lateMinutes && r.lateMinutes > 0));
      case 'daily-early-in':
        return records.filter(r => {
          if (!r.checkIn) return false;
          const checkInTime = new Date(r.checkIn);
          const shiftStart = new Date(r.checkIn);
          shiftStart.setHours(9, 0, 0, 0); // Assuming 9 AM shift start
          return checkInTime < shiftStart;
        });
      case 'daily-early-out':
        return records.filter(r => r.earlyLeaveMinutes && r.earlyLeaveMinutes > 0);
      case 'daily-overtime':
      case 'monthly-overtime':
        return records.filter(r => r.overtimeHours && r.overtimeHours > 0);
      case 'daily-half-day':
        return records.filter(r => r.status === 'half_day');
      case 'daily-mis-punch':
        return records.filter(r => (r.checkIn && !r.checkOut) || (!r.checkIn && r.checkOut));
      case 'daily-short-performance':
        return records.filter(r => r.workHours && r.workHours < 8);
      case 'daily-gps-approved':
        return records.filter(r => r.gpsStatus === 'approved');
      case 'daily-gps-rejected':
        return records.filter(r => r.gpsStatus === 'rejected');
      case 'daily-gps-pending':
        return records.filter(r => r.gpsStatus === 'pending');
      default:
        return records;
    }
  };

  const fetchLeaveReport = async () => {
    setLoading(true);
    try {
      const { startDate: start, endDate: end } = getDateRange();

      if (selectedReportType === 'leave-application') {
        const params = new URLSearchParams({
          startDate: start,
          endDate: end,
          limit: '500',
        });
        if (selectedEmployee !== 'all') {
          params.append('employeeId', selectedEmployee);
        }
        if (selectedDepartment !== 'all') {
          params.append('departmentId', selectedDepartment);
        }

        const response = await api.get(`/leaves?${params}`);
        setReportData(response.data.data?.leaves || response.data.data || []);
      } else {
        // Leave balance reports
        const params = new URLSearchParams();
        if (selectedEmployee !== 'all') {
          params.append('employeeId', selectedEmployee);
        }
        if (selectedDepartment !== 'all') {
          params.append('departmentId', selectedDepartment);
        }

        const response = await api.get(`/leaves/balances?${params}`);
        setReportData(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch leave report:', error);
      // Generate mock data for demo
      if (selectedReportType === 'leave-application') {
        setReportData([]);
      } else {
        const mockBalances = employees
          .filter(emp => selectedEmployee === 'all' || emp._id === selectedEmployee)
          .filter(emp => selectedDepartment === 'all' || emp.departmentId?._id === selectedDepartment)
          .map(emp => ({
            employeeId: emp._id,
            employee: emp,
            balances: [
              { type: 'Annual', total: 20, used: 5, pending: 2, available: 13 },
              { type: 'Sick', total: 10, used: 2, pending: 0, available: 8 },
              { type: 'Casual', total: 5, used: 1, pending: 1, available: 3 },
            ],
          }));
        setReportData(mockBalances);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaryReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        month: String(selectedMonth + 1),
        year: String(selectedYear),
      });

      if (selectedEmployee !== 'all') {
        params.append('employeeId', selectedEmployee);
      }
      if (selectedDepartment !== 'all') {
        params.append('departmentId', selectedDepartment);
      }

      let endpoint = '/payroll';
      if (selectedReportType === 'pf-statement') {
        endpoint = '/payroll/pf-statement';
      } else if (selectedReportType === 'esi-statement') {
        endpoint = '/payroll/esi-statement';
      }

      const response = await api.get(`${endpoint}?${params}`);
      let records = response.data.data || [];
      setReportData(records);
    } catch (error) {
      console.error('Failed to fetch salary report:', error);
      // Generate mock data for demo
      const filteredEmps = employees
        .filter(emp => selectedEmployee === 'all' || emp._id === selectedEmployee)
        .filter(emp => selectedDepartment === 'all' || emp.departmentId?._id === selectedDepartment);

      if (selectedReportType === 'pf-statement') {
        const mockPF: PFStatement[] = filteredEmps.map(emp => ({
          employeeId: emp._id,
          employee: emp,
          month: selectedMonth + 1,
          year: selectedYear,
          basicSalary: 25000 + Math.floor(Math.random() * 25000),
          pfWages: 15000,
          employeeContribution: 1800,
          employerContribution: 1800,
          totalContribution: 3600,
          uanNumber: `1001${Math.floor(Math.random() * 100000000)}`,
        }));
        setReportData(mockPF);
      } else if (selectedReportType === 'esi-statement') {
        const mockESI: ESIStatement[] = filteredEmps.map(emp => ({
          employeeId: emp._id,
          employee: emp,
          month: selectedMonth + 1,
          year: selectedYear,
          grossSalary: 18000 + Math.floor(Math.random() * 3000),
          esiWages: 18000,
          employeeContribution: 135,
          employerContribution: 585,
          totalContribution: 720,
          esicNumber: `31${Math.floor(Math.random() * 1000000000)}`,
        }));
        setReportData(mockESI);
      } else {
        const mockSalary: SalaryRecord[] = filteredEmps.map(emp => {
          const basic = 20000 + Math.floor(Math.random() * 30000);
          const hra = Math.floor(basic * 0.4);
          const allowances = Math.floor(basic * 0.2);
          const pfEmployee = Math.min(Math.floor(basic * 0.12), 1800);
          const pfEmployer = pfEmployee;
          const esiEmployee = basic < 21000 ? Math.floor((basic + hra + allowances) * 0.0075) : 0;
          const esiEmployer = basic < 21000 ? Math.floor((basic + hra + allowances) * 0.0325) : 0;
          const gross = basic + hra + allowances;
          const deductions = pfEmployee + esiEmployee + 200; // PT
          const net = gross - deductions;

          return {
            _id: `sal_${emp._id}`,
            employeeId: emp._id,
            employee: emp,
            month: selectedMonth + 1,
            year: selectedYear,
            basicSalary: basic,
            hra: hra,
            allowances: allowances,
            deductions: deductions,
            grossSalary: gross,
            netSalary: net,
            pfEmployee: pfEmployee,
            pfEmployer: pfEmployer,
            esiEmployee: esiEmployee,
            esiEmployer: esiEmployer,
            professionalTax: 200,
            tds: 0,
            otherDeductions: 0,
            bonus: 0,
            overtime: Math.floor(Math.random() * 5000),
            status: 'processed' as const,
          };
        });
        setReportData(mockSalary);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateReport = () => {
    if (selectedReportType?.startsWith('leave')) {
      fetchLeaveReport();
    } else if (selectedReportType?.startsWith('salary') || selectedReportType === 'pf-statement' || selectedReportType === 'esi-statement') {
      fetchSalaryReport();
    } else {
      fetchAttendanceReport();
    }
    setShowReport(true);
  };

  const exportToCSV = () => {
    let csvContent = '';
    const reportTitle = getReportTitle();
    const period = getPeriodLabel();

    csvContent = `${reportTitle}\n`;
    csvContent += `Period: ${period}\n`;
    csvContent += `Generated: ${new Date().toLocaleString()}\n\n`;

    if (selectedReportType?.startsWith('leave-balance')) {
      csvContent += `Employee Code,Employee Name,Department,Leave Type,Total,Used,Pending,Available\n`;
      reportData.forEach((item: LeaveBalance) => {
        item.balances.forEach(balance => {
          csvContent += `${item.employee?.employeeCode || '-'},${item.employee?.firstName || ''} ${item.employee?.lastName || ''},${item.employee?.departmentId?.name || '-'},${balance.type},${balance.total},${balance.used},${balance.pending},${balance.available}\n`;
        });
      });
    } else if (selectedReportType === 'leave-application') {
      csvContent += `Employee Code,Employee Name,Department,Leave Type,Start Date,End Date,Days,Status,Reason,Applied On\n`;
      reportData.forEach((item: LeaveRecord) => {
        csvContent += `${item.employee?.employeeCode || '-'},${item.employee?.firstName || ''} ${item.employee?.lastName || ''},${item.employee?.departmentId?.name || '-'},${item.leaveType},${item.startDate?.split('T')[0]},${item.endDate?.split('T')[0]},${item.days},${item.status},${item.reason || '-'},${item.appliedOn?.split('T')[0]}\n`;
      });
    } else if (selectedReportType === 'pf-statement') {
      csvContent += `Employee Code,Employee Name,Department,UAN Number,Basic Salary,PF Wages,Employee Contribution,Employer Contribution,Total Contribution\n`;
      reportData.forEach((item: PFStatement) => {
        csvContent += `${item.employee?.employeeCode || '-'},${item.employee?.firstName || ''} ${item.employee?.lastName || ''},${item.employee?.departmentId?.name || '-'},${item.uanNumber || '-'},${item.basicSalary},${item.pfWages},${item.employeeContribution},${item.employerContribution},${item.totalContribution}\n`;
      });
    } else if (selectedReportType === 'esi-statement') {
      csvContent += `Employee Code,Employee Name,Department,ESIC Number,Gross Salary,ESI Wages,Employee Contribution,Employer Contribution,Total Contribution\n`;
      reportData.forEach((item: ESIStatement) => {
        csvContent += `${item.employee?.employeeCode || '-'},${item.employee?.firstName || ''} ${item.employee?.lastName || ''},${item.employee?.departmentId?.name || '-'},${item.esicNumber || '-'},${item.grossSalary},${item.esiWages},${item.employeeContribution},${item.employerContribution},${item.totalContribution}\n`;
      });
    } else if (selectedReportType?.startsWith('salary')) {
      csvContent += `Employee Code,Employee Name,Department,Basic,HRA,Allowances,Gross Salary,PF,ESI,PT,TDS,Other Deductions,Total Deductions,Net Salary,Status\n`;
      reportData.forEach((item: SalaryRecord) => {
        csvContent += `${item.employee?.employeeCode || '-'},${item.employee?.firstName || ''} ${item.employee?.lastName || ''},${item.employee?.departmentId?.name || '-'},${item.basicSalary},${item.hra},${item.allowances},${item.grossSalary},${item.pfEmployee},${item.esiEmployee},${item.professionalTax},${item.tds},${item.otherDeductions},${item.deductions},${item.netSalary},${item.status}\n`;
      });
    } else {
      csvContent += `Date,Employee Code,Employee Name,Department,Status,Check In,Check Out,Work Hours,OT Hours,Late (min),Early Out (min),GPS Status\n`;
      reportData.forEach((item: AttendanceRecord) => {
        csvContent += `${item.date?.split('T')[0]},${item.employee?.employeeCode || '-'},${item.employee?.firstName || ''} ${item.employee?.lastName || ''},${item.employee?.departmentId?.name || '-'},${item.status},${item.checkIn ? new Date(item.checkIn).toLocaleTimeString() : '-'},${item.checkOut ? new Date(item.checkOut).toLocaleTimeString() : '-'},${item.workHours?.toFixed(2) || '0'},${item.overtimeHours?.toFixed(2) || '0'},${item.lateMinutes || '0'},${item.earlyLeaveMinutes || '0'},${item.gpsStatus || '-'}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedReportType}_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const reportTitle = getReportTitle();
    const period = getPeriodLabel();

    // Header
    doc.setFontSize(18);
    doc.setTextColor(33, 37, 41);
    doc.text(reportTitle, 14, 20);

    doc.setFontSize(11);
    doc.setTextColor(108, 117, 125);
    doc.text(`Period: ${period}`, 14, 28);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 34);
    doc.text(`Total Records: ${reportData.length}`, 14, 40);

    let tableData: (string | number)[][] = [];
    let headers: string[] = [];

    if (selectedReportType?.startsWith('leave-balance')) {
      headers = ['Employee Code', 'Employee Name', 'Department', 'Leave Type', 'Total', 'Used', 'Pending', 'Available'];
      reportData.forEach((item: LeaveBalance) => {
        item.balances.forEach(balance => {
          tableData.push([
            item.employee?.employeeCode || '-',
            `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`,
            item.employee?.departmentId?.name || '-',
            balance.type,
            balance.total,
            balance.used,
            balance.pending,
            balance.available,
          ]);
        });
      });
    } else if (selectedReportType === 'leave-application') {
      headers = ['Employee Code', 'Employee Name', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status'];
      reportData.forEach((item: LeaveRecord) => {
        tableData.push([
          item.employee?.employeeCode || '-',
          `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`,
          item.employee?.departmentId?.name || '-',
          item.leaveType,
          item.startDate?.split('T')[0] || '-',
          item.endDate?.split('T')[0] || '-',
          item.days,
          item.status,
        ]);
      });
    } else if (selectedReportType === 'pf-statement') {
      headers = ['Employee Code', 'Employee Name', 'Department', 'UAN Number', 'Basic Salary', 'PF Wages', 'Employee PF', 'Employer PF', 'Total PF'];
      reportData.forEach((item: PFStatement) => {
        tableData.push([
          item.employee?.employeeCode || '-',
          `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`,
          item.employee?.departmentId?.name || '-',
          item.uanNumber || '-',
          `₹${item.basicSalary?.toLocaleString('en-IN')}`,
          `₹${item.pfWages?.toLocaleString('en-IN')}`,
          `₹${item.employeeContribution?.toLocaleString('en-IN')}`,
          `₹${item.employerContribution?.toLocaleString('en-IN')}`,
          `₹${item.totalContribution?.toLocaleString('en-IN')}`,
        ]);
      });
      // Add totals row
      const totalEmpPF = reportData.reduce((sum: number, r: PFStatement) => sum + (r.employeeContribution || 0), 0);
      const totalEmprPF = reportData.reduce((sum: number, r: PFStatement) => sum + (r.employerContribution || 0), 0);
      const totalPF = reportData.reduce((sum: number, r: PFStatement) => sum + (r.totalContribution || 0), 0);
      tableData.push(['', 'TOTAL', '', '', '', '', `₹${totalEmpPF.toLocaleString('en-IN')}`, `₹${totalEmprPF.toLocaleString('en-IN')}`, `₹${totalPF.toLocaleString('en-IN')}`]);
    } else if (selectedReportType === 'esi-statement') {
      headers = ['Employee Code', 'Employee Name', 'Department', 'ESIC Number', 'Gross Salary', 'ESI Wages', 'Employee ESI', 'Employer ESI', 'Total ESI'];
      reportData.forEach((item: ESIStatement) => {
        tableData.push([
          item.employee?.employeeCode || '-',
          `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`,
          item.employee?.departmentId?.name || '-',
          item.esicNumber || '-',
          `₹${item.grossSalary?.toLocaleString('en-IN')}`,
          `₹${item.esiWages?.toLocaleString('en-IN')}`,
          `₹${item.employeeContribution?.toLocaleString('en-IN')}`,
          `₹${item.employerContribution?.toLocaleString('en-IN')}`,
          `₹${item.totalContribution?.toLocaleString('en-IN')}`,
        ]);
      });
      // Add totals row
      const totalEmpESI = reportData.reduce((sum: number, r: ESIStatement) => sum + (r.employeeContribution || 0), 0);
      const totalEmprESI = reportData.reduce((sum: number, r: ESIStatement) => sum + (r.employerContribution || 0), 0);
      const totalESI = reportData.reduce((sum: number, r: ESIStatement) => sum + (r.totalContribution || 0), 0);
      tableData.push(['', 'TOTAL', '', '', '', '', `₹${totalEmpESI.toLocaleString('en-IN')}`, `₹${totalEmprESI.toLocaleString('en-IN')}`, `₹${totalESI.toLocaleString('en-IN')}`]);
    } else if (selectedReportType?.startsWith('salary')) {
      headers = ['Employee Code', 'Employee Name', 'Department', 'Basic', 'HRA', 'Allowances', 'Gross', 'PF', 'ESI', 'PT', 'Deductions', 'Net Salary', 'Status'];
      reportData.forEach((item: SalaryRecord) => {
        tableData.push([
          item.employee?.employeeCode || '-',
          `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`,
          item.employee?.departmentId?.name || '-',
          `₹${item.basicSalary?.toLocaleString('en-IN')}`,
          `₹${item.hra?.toLocaleString('en-IN')}`,
          `₹${item.allowances?.toLocaleString('en-IN')}`,
          `₹${item.grossSalary?.toLocaleString('en-IN')}`,
          `₹${item.pfEmployee?.toLocaleString('en-IN')}`,
          `₹${item.esiEmployee?.toLocaleString('en-IN')}`,
          `₹${item.professionalTax?.toLocaleString('en-IN')}`,
          `₹${item.deductions?.toLocaleString('en-IN')}`,
          `₹${item.netSalary?.toLocaleString('en-IN')}`,
          item.status,
        ]);
      });
      // Add totals row
      const totalGross = reportData.reduce((sum: number, r: SalaryRecord) => sum + (r.grossSalary || 0), 0);
      const totalDeductions = reportData.reduce((sum: number, r: SalaryRecord) => sum + (r.deductions || 0), 0);
      const totalNet = reportData.reduce((sum: number, r: SalaryRecord) => sum + (r.netSalary || 0), 0);
      tableData.push(['', 'TOTAL', '', '', '', '', `₹${totalGross.toLocaleString('en-IN')}`, '', '', '', `₹${totalDeductions.toLocaleString('en-IN')}`, `₹${totalNet.toLocaleString('en-IN')}`, '']);
    } else {
      // Attendance reports
      headers = ['Date', 'Employee Code', 'Employee Name', 'Department', 'Status', 'Check In', 'Check Out', 'Work Hours', 'OT Hours'];
      reportData.forEach((item: AttendanceRecord) => {
        tableData.push([
          item.date?.split('T')[0] || '-',
          item.employee?.employeeCode || '-',
          `${item.employee?.firstName || ''} ${item.employee?.lastName || ''}`,
          item.employee?.departmentId?.name || '-',
          item.status,
          item.checkIn ? new Date(item.checkIn).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
          item.checkOut ? new Date(item.checkOut).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '-',
          item.workHours?.toFixed(1) || '0',
          item.overtimeHours?.toFixed(1) || '0',
        ]);
      });
    }

    autoTable(doc, {
      head: [headers],
      body: tableData,
      startY: 48,
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [249, 250, 251],
      },
      didParseCell: (data) => {
        // Style the totals row
        if (data.row.index === tableData.length - 1 && tableData[tableData.length - 1]?.[1] === 'TOTAL') {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [229, 231, 235];
        }
      },
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Page ${i} of ${pageCount} | HRM System`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      );
    }

    doc.save(`${selectedReportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const getReportTitle = () => {
    const titles: Record<string, string> = {
      'daily-performance': 'Daily Performance Report',
      'daily-absent': 'Daily Absent Report',
      'daily-in-out': 'Daily In/Out Report',
      'daily-late-in': 'Daily Late IN Report',
      'daily-early-in': 'Daily Early IN Report',
      'daily-gps-approved': 'Daily GPS Approved Report',
      'daily-gps-rejected': 'Daily GPS Rejected Report',
      'daily-gps-pending': 'Daily GPS Pending Report',
      'daily-present': 'Daily Present Report',
      'daily-short-performance': 'Daily Short Performance Report',
      'daily-early-out': 'Daily Early OUT Report',
      'daily-overtime': 'Daily Overtime Report',
      'daily-mis-punch': 'Daily Mis Punch Report',
      'daily-half-day': 'Daily Half Day Report',
      'monthly-performance': 'Monthly Performance Report',
      'monthly-absent': 'Monthly Absent Report',
      'monthly-late-in': 'Monthly Late IN Report',
      'monthly-overtime': 'Monthly Overtime Report',
      'monthly-summary': 'Monthly Summary Report',
      'leave-application': 'Leave Application Report',
      'leave-balance-employee': 'Leave Balance by Employee',
      'leave-balance-department': 'Leave Balance by Department',
      'leave-balance-combined': 'Leave Balance Combined Report',
      'salary-report': 'Salary Report',
      'salary-slip-normal': 'Salary Slip (Normal)',
      'salary-slip-formula': 'Salary Slip (By Formula)',
      'salary-summary-normal': 'Salary Summary (Normal)',
      'salary-summary-formula': 'Salary Summary (By Formula)',
      'pf-statement': 'PF Statement',
      'esi-statement': 'ESI Statement',
    };
    return titles[selectedReportType || ''] || 'Report';
  };

  const getPeriodLabel = () => {
    if (useRange) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }
    if (selectedReportType?.startsWith('monthly') || selectedReportType?.startsWith('salary') || selectedReportType === 'pf-statement' || selectedReportType === 'esi-statement') {
      return `${months[selectedMonth]} ${selectedYear}`;
    }
    return new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string }> = {
      present: { bg: 'bg-green-100', text: 'text-green-700' },
      absent: { bg: 'bg-red-100', text: 'text-red-700' },
      late: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      half_day: { bg: 'bg-orange-100', text: 'text-orange-700' },
      on_leave: { bg: 'bg-blue-100', text: 'text-blue-700' },
      approved: { bg: 'bg-green-100', text: 'text-green-700' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-700' },
      processed: { bg: 'bg-blue-100', text: 'text-blue-700' },
      paid: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    };
    const style = styles[status] || { bg: 'bg-gray-100', text: 'text-gray-700' };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${style.bg} ${style.text}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const formatTime = (time?: string) => {
    if (!time) return '-';
    return new Date(time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const attendanceReports = [
    { id: 'daily-performance', title: 'Daily Performance', description: 'Overall daily performance metrics', icon: HiDocumentReport, color: 'bg-blue-500' },
    { id: 'daily-absent', title: 'Daily Absent', description: 'Employees absent on selected date', icon: HiXCircle, color: 'bg-red-500' },
    { id: 'daily-in-out', title: 'Daily In/Out', description: 'Check-in and check-out times', icon: HiClock, color: 'bg-purple-500' },
    { id: 'daily-late-in', title: 'Daily Late IN', description: 'Employees who arrived late', icon: HiClock, color: 'bg-yellow-500' },
    { id: 'daily-early-in', title: 'Daily Early IN', description: 'Employees who arrived early', icon: HiCheckCircle, color: 'bg-green-500' },
    { id: 'daily-gps-approved', title: 'Daily GPS Approved', description: 'GPS attendance approved', icon: HiLocationMarker, color: 'bg-emerald-500' },
    { id: 'daily-gps-rejected', title: 'Daily GPS Rejected', description: 'GPS attendance rejected', icon: HiLocationMarker, color: 'bg-rose-500' },
    { id: 'daily-gps-pending', title: 'Daily GPS Pending', description: 'GPS attendance pending approval', icon: HiLocationMarker, color: 'bg-amber-500' },
    { id: 'daily-present', title: 'Daily Present', description: 'All present employees', icon: HiCheckCircle, color: 'bg-teal-500' },
    { id: 'daily-short-performance', title: 'Daily Short Performance', description: 'Employees with less than 8 hours', icon: HiExclamationCircle, color: 'bg-orange-500' },
    { id: 'daily-early-out', title: 'Daily Early OUT', description: 'Employees who left early', icon: HiClock, color: 'bg-pink-500' },
    { id: 'daily-overtime', title: 'Daily Overtime', description: 'Employees with overtime hours', icon: HiClock, color: 'bg-indigo-500' },
    { id: 'daily-mis-punch', title: 'Daily Mis Punch', description: 'Missing check-in or check-out', icon: HiExclamationCircle, color: 'bg-red-400' },
    { id: 'daily-half-day', title: 'Daily Half Day', description: 'Half day attendance records', icon: HiClock, color: 'bg-cyan-500' },
    { id: 'monthly-performance', title: 'Monthly Performance', description: 'Monthly performance summary', icon: HiDocumentReport, color: 'bg-blue-600' },
    { id: 'monthly-absent', title: 'Monthly Absent', description: 'Monthly absence summary', icon: HiXCircle, color: 'bg-red-600' },
    { id: 'monthly-late-in', title: 'Monthly Late IN', description: 'Monthly late arrivals', icon: HiClock, color: 'bg-yellow-600' },
    { id: 'monthly-overtime', title: 'Monthly Overtime', description: 'Monthly overtime summary', icon: HiClock, color: 'bg-indigo-600' },
    { id: 'monthly-summary', title: 'Monthly Summary', description: 'Complete monthly attendance summary', icon: HiClipboardList, color: 'bg-purple-600' },
  ];

  const leaveReports = [
    { id: 'leave-application', title: 'Leave Application', description: 'All leave applications with status', icon: HiCalendar, color: 'bg-blue-500' },
    { id: 'leave-balance-employee', title: 'Leave Balance by Employee', description: 'Individual employee leave balances', icon: HiUsers, color: 'bg-green-500' },
    { id: 'leave-balance-department', title: 'Leave Balance by Department', description: 'Department-wise leave balances', icon: HiOfficeBuilding, color: 'bg-purple-500' },
    { id: 'leave-balance-combined', title: 'Combined Leave Report', description: 'Employee + Department combination', icon: HiDocumentReport, color: 'bg-indigo-500' },
  ];

  const salaryReports = [
    { id: 'salary-report', title: 'Salary Report', description: 'Complete salary details for all employees', icon: HiCurrencyRupee, color: 'bg-emerald-500' },
    { id: 'salary-slip-normal', title: 'Salary Slip Normal', description: 'Standard salary slip format', icon: HiDocumentReport, color: 'bg-blue-500' },
    { id: 'salary-slip-formula', title: 'Salary Slip By Formula', description: 'Formula-based salary calculation', icon: HiCalculator, color: 'bg-purple-500' },
    { id: 'salary-summary-normal', title: 'Salary Summary Normal', description: 'Monthly salary summary overview', icon: HiClipboardList, color: 'bg-teal-500' },
    { id: 'salary-summary-formula', title: 'Salary Summary By Formula', description: 'Formula-based salary summary', icon: HiCalculator, color: 'bg-indigo-500' },
    { id: 'pf-statement', title: 'PF Statement', description: 'Provident Fund contributions report', icon: HiShieldCheck, color: 'bg-amber-500' },
    { id: 'esi-statement', title: 'ESI Statement', description: 'Employee State Insurance report', icon: HiCash, color: 'bg-rose-500' },
  ];

  const filteredEmployees = employees.filter(emp =>
    `${emp.firstName} ${emp.lastName} ${emp.employeeCode}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Report View
  if (showReport) {
    return (
      <div className="space-y-6">
        {/* Report Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setShowReport(false);
                setReportData([]);
              }}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              <HiChevronLeft className="w-5 h-5 text-secondary-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-secondary-900">{getReportTitle()}</h1>
              <p className="text-secondary-500">{getPeriodLabel()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToCSV}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <HiDownload className="w-5 h-5" />
              Export CSV
            </button>
            <button
              onClick={exportToPDF}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <HiDocumentDownload className="w-5 h-5" />
              Export PDF
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
            <p className="text-sm text-secondary-500">Total Records</p>
            <p className="text-2xl font-bold text-secondary-900">{reportData.length}</p>
          </div>
          {selectedReportType?.startsWith('leave-balance') ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Total Employees</p>
                <p className="text-2xl font-bold text-blue-600">{reportData.length}</p>
              </div>
            </>
          ) : selectedReportType === 'leave-application' ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Approved</p>
                <p className="text-2xl font-bold text-green-600">{reportData.filter((r: LeaveRecord) => r.status === 'approved').length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{reportData.filter((r: LeaveRecord) => r.status === 'pending').length}</p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Rejected</p>
                <p className="text-2xl font-bold text-red-600">{reportData.filter((r: LeaveRecord) => r.status === 'rejected').length}</p>
              </div>
            </>
          ) : selectedReportType === 'pf-statement' ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Total Employee PF</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reportData.reduce((sum: number, r: PFStatement) => sum + (r.employeeContribution || 0), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Total Employer PF</p>
                <p className="text-2xl font-bold text-green-600">
                  {reportData.reduce((sum: number, r: PFStatement) => sum + (r.employerContribution || 0), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Total PF</p>
                <p className="text-2xl font-bold text-purple-600">
                  {reportData.reduce((sum: number, r: PFStatement) => sum + (r.totalContribution || 0), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
            </>
          ) : selectedReportType === 'esi-statement' ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Total Employee ESI</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reportData.reduce((sum: number, r: ESIStatement) => sum + (r.employeeContribution || 0), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Total Employer ESI</p>
                <p className="text-2xl font-bold text-green-600">
                  {reportData.reduce((sum: number, r: ESIStatement) => sum + (r.employerContribution || 0), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Total ESI</p>
                <p className="text-2xl font-bold text-rose-600">
                  {reportData.reduce((sum: number, r: ESIStatement) => sum + (r.totalContribution || 0), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
            </>
          ) : selectedReportType?.startsWith('salary') ? (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Total Gross Salary</p>
                <p className="text-2xl font-bold text-blue-600">
                  {reportData.reduce((sum: number, r: SalaryRecord) => sum + (r.grossSalary || 0), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Total Deductions</p>
                <p className="text-2xl font-bold text-red-600">
                  {reportData.reduce((sum: number, r: SalaryRecord) => sum + (r.deductions || 0), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Total Net Salary</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {reportData.reduce((sum: number, r: SalaryRecord) => sum + (r.netSalary || 0), 0).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Total Work Hours</p>
                <p className="text-2xl font-bold text-purple-600">
                  {reportData.reduce((sum: number, r: AttendanceRecord) => sum + (r.workHours || 0), 0).toFixed(1)}h
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Total OT Hours</p>
                <p className="text-2xl font-bold text-orange-600">
                  {reportData.reduce((sum: number, r: AttendanceRecord) => sum + (r.overtimeHours || 0), 0).toFixed(1)}h
                </p>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-4">
                <p className="text-sm text-secondary-500">Avg Work Hours</p>
                <p className="text-2xl font-bold text-secondary-900">
                  {reportData.length > 0 ? (reportData.reduce((sum: number, r: AttendanceRecord) => sum + (r.workHours || 0), 0) / reportData.length).toFixed(1) : '0'}h
                </p>
              </div>
            </>
          )}
        </div>

        {/* Report Table */}
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : selectedReportType?.startsWith('leave-balance') ? (
              <table className="w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Department</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Leave Type</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Total</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Used</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Pending</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Available</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-secondary-500">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    reportData.flatMap((item: LeaveBalance, idx) =>
                      item.balances.map((balance, bidx) => (
                        <tr key={`${idx}-${bidx}`} className="hover:bg-secondary-50">
                          {bidx === 0 && (
                            <>
                              <td className="px-6 py-4" rowSpan={item.balances.length}>
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                                    <span className="text-primary-700 font-medium">
                                      {item.employee?.firstName?.[0] || '?'}{item.employee?.lastName?.[0] || ''}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-secondary-900">
                                      {item.employee?.firstName || ''} {item.employee?.lastName || ''}
                                    </p>
                                    <p className="text-sm text-secondary-500">{item.employee?.employeeCode || '-'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-secondary-600" rowSpan={item.balances.length}>
                                {item.employee?.departmentId?.name || '-'}
                              </td>
                            </>
                          )}
                          <td className="px-6 py-4 text-center font-medium">{balance.type}</td>
                          <td className="px-6 py-4 text-center">{balance.total}</td>
                          <td className="px-6 py-4 text-center text-red-600">{balance.used}</td>
                          <td className="px-6 py-4 text-center text-yellow-600">{balance.pending}</td>
                          <td className="px-6 py-4 text-center text-green-600 font-medium">{balance.available}</td>
                        </tr>
                      ))
                    )
                  )}
                </tbody>
              </table>
            ) : selectedReportType === 'pf-statement' ? (
              <table className="w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Department</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">UAN Number</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Basic Salary</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">PF Wages</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Employee PF</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Employer PF</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Total PF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-secondary-500">
                        No PF records found
                      </td>
                    </tr>
                  ) : (
                    reportData.map((item: PFStatement, idx: number) => (
                      <tr key={idx} className="hover:bg-secondary-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                              <span className="text-amber-700 font-medium">
                                {item.employee?.firstName?.[0] || '?'}{item.employee?.lastName?.[0] || ''}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900">
                                {item.employee?.firstName || ''} {item.employee?.lastName || ''}
                              </p>
                              <p className="text-sm text-secondary-500">{item.employee?.employeeCode || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-secondary-600">{item.employee?.departmentId?.name || '-'}</td>
                        <td className="px-6 py-4 font-mono text-secondary-600">{item.uanNumber || '-'}</td>
                        <td className="px-6 py-4 text-right text-secondary-900">{item.basicSalary?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right text-secondary-600">{item.pfWages?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right text-blue-600">{item.employeeContribution?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right text-green-600">{item.employerContribution?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right font-semibold text-purple-600">{item.totalContribution?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : selectedReportType === 'esi-statement' ? (
              <table className="w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Department</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">ESIC Number</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Gross Salary</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">ESI Wages</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Employee ESI</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Employer ESI</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Total ESI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-secondary-500">
                        No ESI records found
                      </td>
                    </tr>
                  ) : (
                    reportData.map((item: ESIStatement, idx: number) => (
                      <tr key={idx} className="hover:bg-secondary-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center">
                              <span className="text-rose-700 font-medium">
                                {item.employee?.firstName?.[0] || '?'}{item.employee?.lastName?.[0] || ''}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900">
                                {item.employee?.firstName || ''} {item.employee?.lastName || ''}
                              </p>
                              <p className="text-sm text-secondary-500">{item.employee?.employeeCode || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-secondary-600">{item.employee?.departmentId?.name || '-'}</td>
                        <td className="px-6 py-4 font-mono text-secondary-600">{item.esicNumber || '-'}</td>
                        <td className="px-6 py-4 text-right text-secondary-900">{item.grossSalary?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right text-secondary-600">{item.esiWages?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right text-blue-600">{item.employeeContribution?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right text-green-600">{item.employerContribution?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right font-semibold text-rose-600">{item.totalContribution?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : selectedReportType?.startsWith('salary') ? (
              <table className="w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Department</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Basic</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">HRA</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Allowances</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Gross</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">PF</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">ESI</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">PT</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Deductions</th>
                    <th className="text-right px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Net Salary</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-12 text-center text-secondary-500">
                        No salary records found
                      </td>
                    </tr>
                  ) : (
                    reportData.map((item: SalaryRecord) => (
                      <tr key={item._id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                              <span className="text-emerald-700 font-medium">
                                {item.employee?.firstName?.[0] || '?'}{item.employee?.lastName?.[0] || ''}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900">
                                {item.employee?.firstName || ''} {item.employee?.lastName || ''}
                              </p>
                              <p className="text-sm text-secondary-500">{item.employee?.employeeCode || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-secondary-600">{item.employee?.departmentId?.name || '-'}</td>
                        <td className="px-6 py-4 text-right text-secondary-900">{item.basicSalary?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right text-secondary-600">{item.hra?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right text-secondary-600">{item.allowances?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right font-medium text-blue-600">{item.grossSalary?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right text-red-500">{item.pfEmployee?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right text-red-500">{item.esiEmployee?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right text-red-500">{item.professionalTax?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right font-medium text-red-600">{item.deductions?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-right font-bold text-emerald-600">{item.netSalary?.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}</td>
                        <td className="px-6 py-4 text-center">{getStatusBadge(item.status)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : selectedReportType === 'leave-application' ? (
              <table className="w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Department</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Leave Type</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Start Date</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">End Date</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Days</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-secondary-500">
                        No leave applications found
                      </td>
                    </tr>
                  ) : (
                    reportData.map((item: LeaveRecord) => (
                      <tr key={item._id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-primary-700 font-medium">
                                {item.employee?.firstName?.[0] || '?'}{item.employee?.lastName?.[0] || ''}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900">
                                {item.employee?.firstName || ''} {item.employee?.lastName || ''}
                              </p>
                              <p className="text-sm text-secondary-500">{item.employee?.employeeCode || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-secondary-600">{item.employee?.departmentId?.name || '-'}</td>
                        <td className="px-6 py-4 text-center font-medium">{item.leaveType}</td>
                        <td className="px-6 py-4 text-center text-secondary-600">{item.startDate?.split('T')[0]}</td>
                        <td className="px-6 py-4 text-center text-secondary-600">{item.endDate?.split('T')[0]}</td>
                        <td className="px-6 py-4 text-center font-medium">{item.days}</td>
                        <td className="px-6 py-4 text-center">{getStatusBadge(item.status)}</td>
                        <td className="px-6 py-4 text-secondary-600 max-w-xs truncate">{item.reason || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead className="bg-secondary-50">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Date</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Employee</th>
                    <th className="text-left px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Department</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Status</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Check In</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Check Out</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Work Hours</th>
                    <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">OT Hours</th>
                    {(selectedReportType?.includes('late') || selectedReportType?.includes('early')) && (
                      <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">Minutes</th>
                    )}
                    {selectedReportType?.includes('gps') && (
                      <th className="text-center px-6 py-3 text-xs font-semibold text-secondary-600 uppercase">GPS Status</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-secondary-200">
                  {reportData.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-12 text-center text-secondary-500">
                        No records found
                      </td>
                    </tr>
                  ) : (
                    reportData.map((item: AttendanceRecord) => (
                      <tr key={item._id} className="hover:bg-secondary-50">
                        <td className="px-6 py-4 text-secondary-600">
                          {new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-primary-700 font-medium">
                                {item.employee?.firstName?.[0] || '?'}{item.employee?.lastName?.[0] || ''}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium text-secondary-900">
                                {item.employee?.firstName || ''} {item.employee?.lastName || ''}
                              </p>
                              <p className="text-sm text-secondary-500">{item.employee?.employeeCode || '-'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-secondary-600">{item.employee?.departmentId?.name || '-'}</td>
                        <td className="px-6 py-4 text-center">{getStatusBadge(item.status)}</td>
                        <td className="px-6 py-4 text-center text-secondary-600">{formatTime(item.checkIn)}</td>
                        <td className="px-6 py-4 text-center text-secondary-600">{formatTime(item.checkOut)}</td>
                        <td className="px-6 py-4 text-center text-secondary-600">
                          {item.workHours ? `${item.workHours.toFixed(1)}h` : '-'}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {item.overtimeHours ? (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                              +{item.overtimeHours.toFixed(1)}h
                            </span>
                          ) : '-'}
                        </td>
                        {(selectedReportType?.includes('late') || selectedReportType?.includes('early')) && (
                          <td className="px-6 py-4 text-center">
                            {selectedReportType?.includes('late') && item.lateMinutes ? (
                              <span className="text-yellow-600 font-medium">+{item.lateMinutes}m</span>
                            ) : selectedReportType?.includes('early-out') && item.earlyLeaveMinutes ? (
                              <span className="text-pink-600 font-medium">-{item.earlyLeaveMinutes}m</span>
                            ) : '-'}
                          </td>
                        )}
                        {selectedReportType?.includes('gps') && (
                          <td className="px-6 py-4 text-center">{getStatusBadge(item.gpsStatus || 'pending')}</td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Report Selection View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-secondary-900">Reports & Analytics</h1>
          <p className="text-secondary-500">Generate attendance, leave, and salary reports</p>
        </div>
      </div>

      {/* Category Selection */}
      {!selectedCategory && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            onClick={() => setSelectedCategory('attendance')}
            className="bg-white rounded-xl shadow-sm border border-secondary-200 p-8 cursor-pointer hover:shadow-md hover:border-primary-300 transition-all"
          >
            <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mb-4">
              <HiClock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-secondary-900">Attendance Reports</h2>
            <p className="text-secondary-500 mt-2">Daily and monthly attendance reports including performance, late arrivals, overtime, GPS tracking, and more</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Daily Performance</span>
              <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">Absent Reports</span>
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Late IN</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">GPS Reports</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">+15 more</span>
            </div>
          </div>

          <div
            onClick={() => setSelectedCategory('leave')}
            className="bg-white rounded-xl shadow-sm border border-secondary-200 p-8 cursor-pointer hover:shadow-md hover:border-primary-300 transition-all"
          >
            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mb-4">
              <HiCalendar className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-secondary-900">Leave Reports</h2>
            <p className="text-secondary-500 mt-2">Leave applications, balances by employee or department, and combined reports with date range filters</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">Leave Applications</span>
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Balance by Employee</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Balance by Dept</span>
              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full">Combined</span>
            </div>
          </div>

          <div
            onClick={() => setSelectedCategory('salary')}
            className="bg-white rounded-xl shadow-sm border border-secondary-200 p-8 cursor-pointer hover:shadow-md hover:border-primary-300 transition-all"
          >
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4">
              <HiCurrencyRupee className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-secondary-900">Salary Reports</h2>
            <p className="text-secondary-500 mt-2">Salary slips, summaries, PF statements, ESI statements, and statutory compliance reports</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full">Salary Slips</span>
              <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">PF Statement</span>
              <span className="px-2 py-1 bg-rose-100 text-rose-700 text-xs rounded-full">ESI Statement</span>
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Summary</span>
            </div>
          </div>
        </div>
      )}

      {/* Report Type Selection */}
      {selectedCategory && !selectedReportType && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => setSelectedCategory(null)}
              className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
            >
              <HiChevronLeft className="w-5 h-5 text-secondary-600" />
            </button>
            <h2 className="text-lg font-semibold text-secondary-900">
              {selectedCategory === 'attendance' ? 'Attendance Reports' : selectedCategory === 'leave' ? 'Leave Reports' : 'Salary Reports'}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {(selectedCategory === 'attendance' ? attendanceReports : selectedCategory === 'leave' ? leaveReports : salaryReports).map((report) => (
              <div
                key={report.id}
                onClick={() => setSelectedReportType(report.id as ReportType)}
                className="bg-white rounded-xl shadow-sm border border-secondary-200 p-5 cursor-pointer hover:shadow-md hover:border-primary-300 transition-all"
              >
                <div className={`w-10 h-10 ${report.color} rounded-lg flex items-center justify-center mb-3`}>
                  <report.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-secondary-900 text-sm">{report.title}</h3>
                <p className="text-xs text-secondary-500 mt-1">{report.description}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Report Configuration */}
      {selectedReportType && !showReport && (
        <div className="bg-white rounded-xl shadow-sm border border-secondary-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedReportType(null)}
                className="p-2 hover:bg-secondary-100 rounded-lg transition-colors"
              >
                <HiChevronLeft className="w-5 h-5 text-secondary-600" />
              </button>
              <h2 className="text-lg font-semibold text-secondary-900">{getReportTitle()}</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Department</label>
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>

            {/* Employee Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary-700 mb-2">Employee</label>
              <div className="relative mb-2">
                <HiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Employees</option>
                {filteredEmployees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.firstName} {emp.lastName} ({emp.employeeCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selection */}
            {selectedReportType?.startsWith('monthly') || selectedReportType?.startsWith('salary') || selectedReportType === 'pf-statement' || selectedReportType === 'esi-statement' ? (
              <div>
                <label className="block text-sm font-medium text-secondary-700 mb-2">Month & Year</label>
                <div className="flex gap-2">
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(Number(e.target.value))}
                    className="flex-1 px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {months.map((month, index) => (
                      <option key={index} value={index}>{month}</option>
                    ))}
                  </select>
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="w-28 px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {[2024, 2025, 2026].map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <label className="block text-sm font-medium text-secondary-700">Date Selection</label>
                  <label className="flex items-center gap-2 text-sm text-secondary-600">
                    <input
                      type="checkbox"
                      checked={useRange}
                      onChange={(e) => setUseRange(e.target.checked)}
                      className="rounded border-secondary-300 text-primary-600 focus:ring-primary-500"
                    />
                    Use Date Range
                  </label>
                </div>
                {useRange ? (
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="flex-1 px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    <span className="flex items-center text-secondary-400">to</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="flex-1 px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                ) : (
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full px-4 py-2 border border-secondary-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                )}
              </div>
            )}
          </div>

          {/* Generate Button */}
          <div className="flex justify-end mt-6">
            <button
              onClick={generateReport}
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
