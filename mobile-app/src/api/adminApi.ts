import apiClient from './apiClient';
import type {ApiResponse, Employee, Attendance, LeaveRequest} from '../types';

// ==================== TYPES ====================

export interface AdminDashboardStats {
  totalEmployees: number;
  activeEmployees: number;
  todayPresent: number;
  todayAbsent: number;
  todayLate: number;
  todayOnLeave: number;
  pendingLeaves: number;
  monthlyPayroll: number;
  todayPayroll: number;
}

export interface EmployeeAttendanceStatus {
  employeeId: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    department?: string;
    designation?: string;
    avatar?: string;
  };
  date: string;
  checkIn?: string;
  checkOut?: string;
  status: 'present' | 'absent' | 'late' | 'half_day' | 'on_leave' | 'holiday' | 'weekend';
  workHours?: number;
  overtimeHours?: number;
}

export interface TeamAttendanceSummary {
  date: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  onLeave: number;
  holiday: number;
  weekend: number;
  employees: EmployeeAttendanceStatus[];
}

export interface EmployeeSalaryDetails {
  employeeId: string;
  employee: {
    firstName: string;
    lastName: string;
    employeeCode: string;
    department?: string;
    designation?: string;
    avatar?: string;
  };
  baseSalary: number;
  grossSalary: number;
  netSalary: number;
  currentMonthEarned: number;
  daysWorked: number;
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  lopDays: number;
  overtimeHours: number;
  overtimePay: number;
  currency: string;
}

export interface PayrollSummary {
  month: number;
  year: number;
  totalEmployees: number;
  totalGrossSalary: number;
  totalDeductions: number;
  totalNetSalary: number;
  totalOvertimePay: number;
  todayEarned: number;
  statusBreakdown: {
    draft: number;
    processing: number;
    processed: number;
    paid: number;
  };
  employees: EmployeeSalaryDetails[];
}

export interface AttendanceListParams {
  date?: string;
  startDate?: string;
  endDate?: string;
  departmentId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface LeaveListParams {
  status?: 'pending' | 'approved' | 'rejected' | 'cancelled';
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  page?: number;
  limit?: number;
}

// ==================== API FUNCTIONS ====================

export const adminApi = {
  /**
   * Get admin dashboard statistics
   */
  async getDashboardStats(): Promise<ApiResponse<AdminDashboardStats>> {
    // Fetch multiple endpoints in parallel for dashboard data
    try {
      const today = new Date().toISOString().split('T')[0];
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      const [employeesRes, attendanceRes, leavesRes, payrollRes] = await Promise.all([
        apiClient.get('/employees', {params: {limit: 1000}}),
        apiClient.get('/attendance', {params: {date: today, limit: 1000}}),
        apiClient.get('/leaves/requests', {params: {status: 'pending'}}),
        apiClient.get('/payroll/summary', {params: {month: currentMonth, year: currentYear}}),
      ]);

      const employees = employeesRes.data?.data?.employees || employeesRes.data?.data || [];
      const attendanceRecords = attendanceRes.data?.data?.records || attendanceRes.data?.data || [];
      const pendingLeaves = leavesRes.data?.data?.requests || leavesRes.data?.data || [];
      const payrollSummary = payrollRes.data?.data?.summary || payrollRes.data?.data || {};

      // Calculate stats
      const totalEmployees = employees.length;
      const activeEmployees = employees.filter((e: Employee) => e.status === 'active').length;
      const todayPresent = attendanceRecords.filter((a: Attendance) =>
        a.status === 'present' || a.status === 'late'
      ).length;
      const todayAbsent = activeEmployees - todayPresent -
        attendanceRecords.filter((a: Attendance) => a.status === 'on-leave').length;
      const todayLate = attendanceRecords.filter((a: Attendance) => a.status === 'late').length;
      const todayOnLeave = attendanceRecords.filter((a: Attendance) =>
        a.status === 'on-leave'
      ).length;

      // Calculate today's payroll (estimated based on monthly)
      const workingDaysInMonth = getWorkingDaysInMonth(currentYear, currentMonth - 1);
      const daysPassed = new Date().getDate();
      const todayPayroll = (payrollSummary.totalNetSalary || 0) / workingDaysInMonth;

      return {
        success: true,
        data: {
          totalEmployees,
          activeEmployees,
          todayPresent,
          todayAbsent: Math.max(0, todayAbsent),
          todayLate,
          todayOnLeave,
          pendingLeaves: pendingLeaves.length,
          monthlyPayroll: payrollSummary.totalNetSalary || 0,
          todayPayroll: Math.round(todayPayroll),
        },
      };
    } catch (error) {
      console.error('[AdminApi] getDashboardStats error:', error);
      return {
        success: false,
        message: 'Failed to fetch dashboard stats',
      };
    }
  },

  /**
   * Get team attendance for a specific date
   */
  async getTeamAttendance(params: AttendanceListParams = {}): Promise<ApiResponse<TeamAttendanceSummary>> {
    try {
      const date = params.date || new Date().toISOString().split('T')[0];

      const [attendanceRes, employeesRes] = await Promise.all([
        apiClient.get('/attendance', {
          params: {
            date,
            limit: 1000,
            ...params,
          },
        }),
        apiClient.get('/employees', {params: {limit: 1000, status: 'active'}}),
      ]);

      const attendanceRecords = attendanceRes.data?.data?.records || attendanceRes.data?.data || [];
      const employees = employeesRes.data?.data?.employees || employeesRes.data?.data || [];

      // Build attendance status for each employee
      const employeeAttendance: EmployeeAttendanceStatus[] = employees.map((emp: Employee) => {
        const record = attendanceRecords.find((a: Attendance) =>
          a.employeeId === emp._id || a.employeeId?.toString() === emp._id
        );

        return {
          employeeId: emp._id,
          employee: {
            firstName: emp.firstName,
            lastName: emp.lastName,
            employeeCode: emp.employeeCode,
            department: emp.department?.name || (emp.department as unknown as string),
            designation: emp.designation,
            avatar: emp.profileImage,
          },
          date,
          checkIn: record?.checkIn,
          checkOut: record?.checkOut,
          status: record?.status || 'absent',
          workHours: record?.workHours,
          overtimeHours: record?.overtimeHours,
        };
      });

      // Calculate summary
      const summary: TeamAttendanceSummary = {
        date,
        total: employees.length,
        present: employeeAttendance.filter(e => e.status === 'present').length,
        absent: employeeAttendance.filter(e => e.status === 'absent').length,
        late: employeeAttendance.filter(e => e.status === 'late').length,
        halfDay: employeeAttendance.filter(e => e.status === 'half_day').length,
        onLeave: employeeAttendance.filter(e => e.status === 'on_leave').length,
        holiday: employeeAttendance.filter(e => e.status === 'holiday').length,
        weekend: employeeAttendance.filter(e => e.status === 'weekend').length,
        employees: employeeAttendance,
      };

      return {
        success: true,
        data: summary,
      };
    } catch (error) {
      console.error('[AdminApi] getTeamAttendance error:', error);
      return {
        success: false,
        message: 'Failed to fetch team attendance',
      };
    }
  },

  /**
   * Get all leave requests for approval
   */
  async getLeaveRequests(params: LeaveListParams = {}): Promise<ApiResponse<{requests: LeaveRequest[]; total: number}>> {
    try {
      const response = await apiClient.get('/leaves/requests', {
        params: {
          ...params,
          limit: params.limit || 50,
        },
      });

      // API returns data.leaves, not data.requests
      const leaves = response.data?.data?.leaves || response.data?.data?.requests || [];

      return {
        success: true,
        data: {
          requests: leaves,
          total: response.data?.data?.pagination?.total || response.data?.pagination?.total || leaves.length,
        },
      };
    } catch (error) {
      console.error('[AdminApi] getLeaveRequests error:', error);
      return {
        success: false,
        message: 'Failed to fetch leave requests',
      };
    }
  },

  /**
   * Approve a leave request
   */
  async approveLeave(leaveId: string): Promise<ApiResponse<LeaveRequest>> {
    const response = await apiClient.patch<ApiResponse<LeaveRequest>>(
      `/leaves/requests/${leaveId}/approve`
    );
    return response.data;
  },

  /**
   * Reject a leave request
   */
  async rejectLeave(leaveId: string, reason?: string): Promise<ApiResponse<LeaveRequest>> {
    const response = await apiClient.patch<ApiResponse<LeaveRequest>>(
      `/leaves/requests/${leaveId}/reject`,
      {reason}
    );
    return response.data;
  },

  /**
   * Get payroll summary for current month
   */
  async getPayrollSummary(month?: number, year?: number): Promise<ApiResponse<PayrollSummary>> {
    try {
      const currentMonth = month || new Date().getMonth() + 1;
      const currentYear = year || new Date().getFullYear();

      const [payrollRes, employeesRes, attendanceRes] = await Promise.all([
        apiClient.get('/payroll', {
          params: {month: currentMonth, year: currentYear, limit: 1000},
        }),
        apiClient.get('/employees', {params: {limit: 1000, status: 'active'}}),
        apiClient.get('/attendance/summary', {
          params: {month: currentMonth, year: currentYear},
        }),
      ]);

      const payrolls = payrollRes.data?.data?.payrolls || payrollRes.data?.data || [];
      const employees = employeesRes.data?.data?.employees || employeesRes.data?.data || [];

      // Build employee salary details
      const workingDays = getWorkingDaysInMonth(currentYear, currentMonth - 1);
      const daysPassed = Math.min(new Date().getDate(), workingDays);

      const employeeSalaries: EmployeeSalaryDetails[] = payrolls.map((p: any) => {
        const emp = employees.find((e: Employee) => e._id === p.employeeId || e._id === p.employeeId?.toString());
        const dailyRate = (p.netSalary || 0) / workingDays;
        const currentMonthEarned = dailyRate * (p.presentDays || daysPassed);

        return {
          employeeId: p.employeeId,
          employee: {
            firstName: p.employee?.firstName || emp?.firstName || '',
            lastName: p.employee?.lastName || emp?.lastName || '',
            employeeCode: p.employee?.employeeCode || emp?.employeeCode || '',
            department: p.employee?.department || emp?.department?.name,
            designation: emp?.designation,
            avatar: emp?.profileImage,
          },
          baseSalary: p.baseSalary || 0,
          grossSalary: p.grossSalary || 0,
          netSalary: p.netSalary || 0,
          currentMonthEarned: Math.round(currentMonthEarned),
          daysWorked: p.presentDays || 0,
          workingDays: p.workingDays || workingDays,
          presentDays: p.presentDays || 0,
          leaveDays: p.leaveDays || 0,
          lopDays: p.lopDays || 0,
          overtimeHours: p.overtimeHours || 0,
          overtimePay: p.overtimePay || 0,
          currency: 'INR',
        };
      });

      // Calculate totals
      const totalGross = payrolls.reduce((sum: number, p: any) => sum + (p.grossSalary || 0), 0);
      const totalDeductions = payrolls.reduce((sum: number, p: any) => sum + (p.totalDeductions || 0), 0);
      const totalNet = payrolls.reduce((sum: number, p: any) => sum + (p.netSalary || 0), 0);
      const totalOT = payrolls.reduce((sum: number, p: any) => sum + (p.overtimePay || 0), 0);
      const todayEarned = employeeSalaries.reduce((sum, e) => sum + e.currentMonthEarned, 0);

      return {
        success: true,
        data: {
          month: currentMonth,
          year: currentYear,
          totalEmployees: payrolls.length,
          totalGrossSalary: totalGross,
          totalDeductions,
          totalNetSalary: totalNet,
          totalOvertimePay: totalOT,
          todayEarned: Math.round(todayEarned),
          statusBreakdown: {
            draft: payrolls.filter((p: any) => p.status === 'draft').length,
            processing: payrolls.filter((p: any) => p.status === 'processing').length,
            processed: payrolls.filter((p: any) => p.status === 'processed').length,
            paid: payrolls.filter((p: any) => p.status === 'paid').length,
          },
          employees: employeeSalaries,
        },
      };
    } catch (error) {
      console.error('[AdminApi] getPayrollSummary error:', error);
      return {
        success: false,
        message: 'Failed to fetch payroll summary',
      };
    }
  },

  /**
   * Get individual employee salary details with current earnings
   */
  async getEmployeeSalaryDetails(employeeId: string, month?: number, year?: number): Promise<ApiResponse<EmployeeSalaryDetails>> {
    try {
      const currentMonth = month || new Date().getMonth() + 1;
      const currentYear = year || new Date().getFullYear();

      const [employeeRes, payrollRes, attendanceRes] = await Promise.all([
        apiClient.get(`/employees/${employeeId}`),
        apiClient.get('/payroll', {
          params: {employeeId, month: currentMonth, year: currentYear},
        }),
        apiClient.get('/attendance/summary', {
          params: {employeeId, month: currentMonth, year: currentYear},
        }),
      ]);

      const employee = employeeRes.data?.data;
      const payroll = payrollRes.data?.data?.payrolls?.[0] || payrollRes.data?.data?.[0];
      const attendance = attendanceRes.data?.data?.summary || attendanceRes.data?.data;

      if (!employee) {
        return {
          success: false,
          message: 'Employee not found',
        };
      }

      const workingDays = getWorkingDaysInMonth(currentYear, currentMonth - 1);
      const presentDays = (attendance?.present || 0) + (attendance?.late || 0);
      const halfDays = attendance?.halfDay || 0;
      const effectiveDays = presentDays + (halfDays * 0.5);

      // Calculate current earnings
      const baseSalary = payroll?.baseSalary || employee.salary?.basic || 0;
      const grossSalary = payroll?.grossSalary ||
        (employee.salary?.basic + employee.salary?.hra + employee.salary?.allowances) || 0;
      const netSalary = payroll?.netSalary || employee.salary?.netSalary || grossSalary;
      const dailyRate = netSalary / workingDays;
      const currentMonthEarned = dailyRate * effectiveDays;

      return {
        success: true,
        data: {
          employeeId,
          employee: {
            firstName: employee.firstName,
            lastName: employee.lastName,
            employeeCode: employee.employeeCode,
            department: employee.department?.name,
            designation: employee.designation,
            avatar: employee.profileImage,
          },
          baseSalary,
          grossSalary,
          netSalary,
          currentMonthEarned: Math.round(currentMonthEarned),
          daysWorked: effectiveDays,
          workingDays,
          presentDays: effectiveDays,
          leaveDays: attendance?.onLeave || 0,
          lopDays: payroll?.lopDays || 0,
          overtimeHours: attendance?.totalOvertimeHours || payroll?.overtimeHours || 0,
          overtimePay: payroll?.overtimePay || 0,
          currency: employee.salary?.currency || 'INR',
        },
      };
    } catch (error) {
      console.error('[AdminApi] getEmployeeSalaryDetails error:', error);
      return {
        success: false,
        message: 'Failed to fetch employee salary details',
      };
    }
  },

  /**
   * Get all employees list
   */
  async getEmployees(params: {page?: number; limit?: number; search?: string; departmentId?: string} = {}): Promise<ApiResponse<{employees: Employee[]; total: number}>> {
    try {
      const response = await apiClient.get('/employees', {params});
      return {
        success: true,
        data: {
          employees: response.data?.data?.employees || response.data?.data || [],
          total: response.data?.pagination?.total || (response.data?.data?.employees || response.data?.data || []).length,
        },
      };
    } catch (error) {
      console.error('[AdminApi] getEmployees error:', error);
      return {
        success: false,
        message: 'Failed to fetch employees',
      };
    }
  },
};

// Helper function
function getWorkingDaysInMonth(year: number, month: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let workingDays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  return workingDays;
}
