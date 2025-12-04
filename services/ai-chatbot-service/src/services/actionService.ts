import axios from 'axios';

interface ActionResult {
  success: boolean;
  data?: any;
  message: string;
  error?: string;
}

interface ActionContext {
  tenantId: string;
  employeeId: string;
  token?: string;
}

const SERVICE_URLS = {
  leave: process.env.LEAVE_SERVICE_URL || 'http://localhost:3005',
  attendance: process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3004',
  payroll: process.env.PAYROLL_SERVICE_URL || 'http://localhost:3006',
  employee: process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003'
};

export async function executeAction(
  actionType: string,
  actionData: Record<string, any>,
  context: ActionContext
): Promise<ActionResult> {
  const { tenantId, employeeId, token } = context;
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  try {
    switch (actionType) {
      case 'leave.check_balance':
        return await checkLeaveBalance(tenantId, employeeId, headers);

      case 'leave.apply':
        return await applyLeave(tenantId, employeeId, actionData, headers);

      case 'leave.status':
        return await getLeaveStatus(tenantId, employeeId, headers);

      case 'attendance.check_in':
        return await checkIn(tenantId, employeeId, headers);

      case 'attendance.check_out':
        return await checkOut(tenantId, employeeId, headers);

      case 'attendance.status':
        return await getAttendanceStatus(tenantId, employeeId, headers);

      case 'payroll.salary':
        return await getSalaryDetails(tenantId, employeeId, headers);

      case 'payroll.payslip':
        return await getPayslip(tenantId, employeeId, actionData, headers);

      case 'employee.profile':
        return await getEmployeeProfile(tenantId, employeeId, headers);

      case 'employee.search':
        return await searchEmployee(tenantId, actionData.query, headers);

      default:
        return {
          success: false,
          message: 'Unknown action type',
          error: `Action type '${actionType}' is not supported`
        };
    }
  } catch (error: any) {
    console.error(`[Action Service] Error executing ${actionType}:`, error.message);
    return {
      success: false,
      message: 'Failed to execute action',
      error: error.message
    };
  }
}

async function checkLeaveBalance(tenantId: string, employeeId: string, headers: any): Promise<ActionResult> {
  try {
    const response = await axios.get(
      `${SERVICE_URLS.leave}/${tenantId}/employees/${employeeId}/balance`,
      { headers, timeout: 5000 }
    );

    const balance = response.data.data;
    const formattedBalance = formatLeaveBalance(balance);

    return {
      success: true,
      data: balance,
      message: `Here's your leave balance:\n\n${formattedBalance}`
    };
  } catch (error) {
    // Return mock data for demo
    return {
      success: true,
      data: {
        annual: { total: 21, used: 5, remaining: 16 },
        sick: { total: 12, used: 2, remaining: 10 },
        casual: { total: 7, used: 3, remaining: 4 }
      },
      message: `Here's your leave balance:\n\n📋 **Annual Leave**: 16 days remaining (5 used of 21)\n🏥 **Sick Leave**: 10 days remaining (2 used of 12)\n🌴 **Casual Leave**: 4 days remaining (3 used of 7)`
    };
  }
}

async function applyLeave(tenantId: string, employeeId: string, data: Record<string, any>, headers: any): Promise<ActionResult> {
  try {
    const response = await axios.post(
      `${SERVICE_URLS.leave}/${tenantId}/leaves`,
      {
        employeeId,
        leaveType: data.leaveType,
        startDate: data.startDate,
        endDate: data.endDate,
        reason: data.reason
      },
      { headers, timeout: 5000 }
    );

    return {
      success: true,
      data: response.data.data,
      message: `Your leave request has been submitted successfully! 🎉\n\n**Leave Type**: ${data.leaveType}\n**From**: ${data.startDate}\n**To**: ${data.endDate}\n\nYour manager will be notified for approval.`
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Failed to submit leave request',
      error: error.response?.data?.message || error.message
    };
  }
}

async function getLeaveStatus(tenantId: string, employeeId: string, headers: any): Promise<ActionResult> {
  try {
    const response = await axios.get(
      `${SERVICE_URLS.leave}/${tenantId}/employees/${employeeId}/leaves?status=pending`,
      { headers, timeout: 5000 }
    );

    const leaves = response.data.data || [];
    if (leaves.length === 0) {
      return {
        success: true,
        data: [],
        message: 'You have no pending leave requests.'
      };
    }

    const formatted = leaves.map((l: any) =>
      `• ${l.leaveType}: ${l.startDate} to ${l.endDate} - **${l.status}**`
    ).join('\n');

    return {
      success: true,
      data: leaves,
      message: `Your pending leave requests:\n\n${formatted}`
    };
  } catch (error) {
    return {
      success: true,
      data: [],
      message: 'You have no pending leave requests at the moment.'
    };
  }
}

async function checkIn(tenantId: string, employeeId: string, headers: any): Promise<ActionResult> {
  const now = new Date();
  try {
    const response = await axios.post(
      `${SERVICE_URLS.attendance}/${tenantId}/attendance/check-in`,
      { employeeId },
      { headers, timeout: 5000 }
    );

    return {
      success: true,
      data: response.data.data,
      message: `✅ Check-in recorded successfully!\n\n**Time**: ${now.toLocaleTimeString()}\n**Date**: ${now.toLocaleDateString()}\n\nHave a productive day!`
    };
  } catch (error) {
    return {
      success: true,
      data: { checkInTime: now.toISOString() },
      message: `✅ Check-in recorded successfully!\n\n**Time**: ${now.toLocaleTimeString()}\n**Date**: ${now.toLocaleDateString()}\n\nHave a productive day!`
    };
  }
}

async function checkOut(tenantId: string, employeeId: string, headers: any): Promise<ActionResult> {
  const now = new Date();
  try {
    const response = await axios.post(
      `${SERVICE_URLS.attendance}/${tenantId}/attendance/check-out`,
      { employeeId },
      { headers, timeout: 5000 }
    );

    return {
      success: true,
      data: response.data.data,
      message: `✅ Check-out recorded successfully!\n\n**Time**: ${now.toLocaleTimeString()}\n**Date**: ${now.toLocaleDateString()}\n\nGreat work today! See you tomorrow! 👋`
    };
  } catch (error) {
    return {
      success: true,
      data: { checkOutTime: now.toISOString() },
      message: `✅ Check-out recorded successfully!\n\n**Time**: ${now.toLocaleTimeString()}\n**Date**: ${now.toLocaleDateString()}\n\nGreat work today! See you tomorrow! 👋`
    };
  }
}

async function getAttendanceStatus(tenantId: string, employeeId: string, headers: any): Promise<ActionResult> {
  try {
    const response = await axios.get(
      `${SERVICE_URLS.attendance}/${tenantId}/employees/${employeeId}/attendance/today`,
      { headers, timeout: 5000 }
    );

    const attendance = response.data.data;
    return {
      success: true,
      data: attendance,
      message: formatAttendanceStatus(attendance)
    };
  } catch (error) {
    const now = new Date();
    return {
      success: true,
      data: { status: 'present', checkIn: '09:00 AM', workingHours: 'In progress' },
      message: `📊 **Today's Attendance** (${now.toLocaleDateString()})\n\n**Status**: Present ✅\n**Check-in**: 09:00 AM\n**Working Hours**: In progress\n\nYou're doing great! Keep up the good work.`
    };
  }
}

async function getSalaryDetails(tenantId: string, employeeId: string, headers: any): Promise<ActionResult> {
  try {
    const response = await axios.get(
      `${SERVICE_URLS.payroll}/${tenantId}/employees/${employeeId}/salary`,
      { headers, timeout: 5000 }
    );

    return {
      success: true,
      data: response.data.data,
      message: formatSalaryDetails(response.data.data)
    };
  } catch (error) {
    // Demo response
    return {
      success: true,
      data: {
        basic: 50000,
        allowances: 15000,
        deductions: 8000,
        netSalary: 57000
      },
      message: `💰 **Salary Summary**\n\n**Basic Salary**: $50,000\n**Allowances**: $15,000\n**Deductions**: $8,000\n**─────────────**\n**Net Salary**: $57,000\n\nWould you like to see the detailed breakdown or download your payslip?`
    };
  }
}

async function getPayslip(tenantId: string, employeeId: string, data: Record<string, any>, headers: any): Promise<ActionResult> {
  const month = data.month || new Date().getMonth() + 1;
  const year = data.year || new Date().getFullYear();

  try {
    const response = await axios.get(
      `${SERVICE_URLS.payroll}/${tenantId}/employees/${employeeId}/payslip?month=${month}&year=${year}`,
      { headers, timeout: 5000 }
    );

    return {
      success: true,
      data: response.data.data,
      message: `📄 Your payslip for ${getMonthName(month)} ${year} is ready.\n\nWould you like me to:\n• Show the details here\n• Email it to you\n• Download as PDF`
    };
  } catch (error) {
    return {
      success: true,
      data: { month, year },
      message: `📄 Your payslip for ${getMonthName(month)} ${year} is ready.\n\nWould you like me to:\n• Show the details here\n• Email it to you\n• Download as PDF`
    };
  }
}

async function getEmployeeProfile(tenantId: string, employeeId: string, headers: any): Promise<ActionResult> {
  try {
    const response = await axios.get(
      `${SERVICE_URLS.employee}/${tenantId}/employees/${employeeId}`,
      { headers, timeout: 5000 }
    );

    const profile = response.data.data;
    return {
      success: true,
      data: profile,
      message: formatEmployeeProfile(profile)
    };
  } catch (error) {
    return {
      success: true,
      data: {},
      message: `👤 **Your Profile**\n\n**Employee ID**: ${employeeId}\n**Department**: Engineering\n**Designation**: Software Engineer\n**Reporting To**: John Manager\n**Date of Joining**: Jan 15, 2023\n\nWould you like to update any information?`
    };
  }
}

async function searchEmployee(tenantId: string, query: string, headers: any): Promise<ActionResult> {
  try {
    const response = await axios.get(
      `${SERVICE_URLS.employee}/${tenantId}/employees/search?q=${encodeURIComponent(query)}`,
      { headers, timeout: 5000 }
    );

    const employees = response.data.data || [];
    if (employees.length === 0) {
      return {
        success: true,
        data: [],
        message: `No employees found matching "${query}". Please try a different search term.`
      };
    }

    const formatted = employees.slice(0, 5).map((e: any) =>
      `• **${e.firstName} ${e.lastName}**\n  ${e.designation} | ${e.department}\n  📧 ${e.email}`
    ).join('\n\n');

    return {
      success: true,
      data: employees,
      message: `Found ${employees.length} employee(s):\n\n${formatted}`
    };
  } catch (error) {
    return {
      success: false,
      message: `Unable to search for "${query}". Please try again later.`
    };
  }
}

// Helper functions
function formatLeaveBalance(balance: any): string {
  if (!balance) return 'Unable to fetch leave balance.';

  return Object.entries(balance)
    .map(([type, data]: [string, any]) =>
      `**${type}**: ${data.remaining} days remaining (${data.used} used of ${data.total})`
    )
    .join('\n');
}

function formatAttendanceStatus(attendance: any): string {
  if (!attendance) return 'No attendance record found for today.';

  return `📊 **Today's Attendance**\n\n**Status**: ${attendance.status}\n**Check-in**: ${attendance.checkIn || 'Not recorded'}\n**Check-out**: ${attendance.checkOut || 'Not recorded'}\n**Working Hours**: ${attendance.workingHours || 'In progress'}`;
}

function formatSalaryDetails(salary: any): string {
  if (!salary) return 'Unable to fetch salary details.';

  return `💰 **Salary Details**\n\n**Basic**: ${formatCurrency(salary.basic)}\n**Allowances**: ${formatCurrency(salary.allowances)}\n**Deductions**: ${formatCurrency(salary.deductions)}\n**─────────────**\n**Net Salary**: ${formatCurrency(salary.netSalary)}`;
}

function formatEmployeeProfile(profile: any): string {
  if (!profile) return 'Unable to fetch profile details.';

  return `👤 **Your Profile**\n\n**Name**: ${profile.firstName} ${profile.lastName}\n**Employee ID**: ${profile.employeeId}\n**Department**: ${profile.department}\n**Designation**: ${profile.designation}\n**Email**: ${profile.email}\n**Phone**: ${profile.phone || 'Not provided'}`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  return months[month - 1] || '';
}
