import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Payroll from '../models/Payroll';
import EmployeeSalary from '../models/EmployeeSalary';
import SalaryStructure from '../models/SalaryStructure';
import { generatePayslipPDF } from '../services/payslipService';
import { getApprovedOvertimeForPayroll, markOvertimeAsPaid, calculateShiftAllowance } from '../services/overtimeService';

const EMPLOYEE_SERVICE_URL = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003';
const TENANT_SERVICE_URL = process.env.TENANT_SERVICE_URL || 'http://localhost:3002';
const ATTENDANCE_SERVICE_URL = process.env.ATTENDANCE_SERVICE_URL || 'http://localhost:3004';

// Helper to fetch attendance summary from attendance service
async function fetchAttendanceSummary(tenantId: string, employeeId: string, month: number, year: number): Promise<{
  present: number;
  absent: number;
  halfDay: number;
  late: number;
  leaves: number;
  holidays: number;
  totalWorkHours: number;
} | null> {
  try {
    // Call attendance service /summary endpoint with employeeId, month, year query params
    const url = `${ATTENDANCE_SERVICE_URL}/summary?month=${month}&year=${year}&employeeId=${employeeId}`;
    console.log(`[Payroll] Fetching attendance from: ${url}`);

    const response = await fetch(url, {
      headers: {
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.log(`[Payroll] Attendance service returned ${response.status}`);
      return null;
    }

    const data = await response.json() as Record<string, unknown>;
    console.log('[Payroll] Attendance response:', JSON.stringify(data));

    // Response format: { success: true, data: { summary: {...}, records: [...] } }
    const responseData = data.data as Record<string, unknown> | undefined;
    const summary = (responseData?.summary || data.summary || data) as Record<string, unknown>;

    // 'present' count = records with status 'present'
    // 'late' count = records with status 'late' (still present, but late)
    // 'halfDay' = records with status 'half_day'
    // 'onLeave' = records with status 'on_leave' (approved leaves)

    // Total present days = present + late (both are full day attendance)
    const presentCount = Number(summary.present || 0) + Number(summary.late || 0);
    const halfDayCount = Number(summary.halfDay || 0);
    const leavesCount = Number(summary.onLeave || summary.leaves || 0);

    console.log(`[Payroll] Parsed attendance: present=${presentCount}, halfDay=${halfDayCount}, leaves=${leavesCount}`);

    return {
      present: presentCount,
      absent: Number(summary.absent || 0),
      halfDay: halfDayCount,
      late: Number(summary.late || 0),
      leaves: leavesCount,
      holidays: Number(summary.holidays || 0),
      totalWorkHours: Number(summary.totalWorkHours || 0),
    };
  } catch (error) {
    console.error('[Payroll] Error fetching attendance:', error);
    return null;
  }
}

// Helper to fetch tenant data from tenant service
async function fetchTenantData(tenantId: string): Promise<{
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  logo?: string;
} | null> {
  try {
    const response = await fetch(`${TENANT_SERVICE_URL}/${tenantId}`, {
      headers: { 'Content-Type': 'application/json' },
    });
    if (!response.ok) return null;
    const data = await response.json() as Record<string, unknown>;
    const tenant = (data.data || data.tenant || data) as Record<string, unknown>;

    // Build full logo URL if logo path exists
    let logoUrl: string | undefined;
    if (tenant.logo) {
      // Logo is stored as /uploads/logos/filename.png
      // Need to build full URL using TENANT_SERVICE_URL
      const baseUrl = TENANT_SERVICE_URL.replace(/\/[^/]*$/, ''); // Remove trailing path like /tenants
      logoUrl = `${baseUrl}${tenant.logo}`;
    }

    return {
      name: String(tenant.name || tenant.companyName || 'Company'),
      address: tenant.address ? String(tenant.address) : undefined,
      city: tenant.city ? String(tenant.city) : undefined,
      state: tenant.state ? String(tenant.state) : undefined,
      country: tenant.country ? String(tenant.country) : undefined,
      pincode: tenant.pincode || tenant.zipCode ? String(tenant.pincode || tenant.zipCode) : undefined,
      logo: logoUrl,
    };
  } catch {
    return null;
  }
}

// Helper to fetch full employee details from employee service
async function fetchFullEmployeeData(tenantId: string, employeeId: string): Promise<{
  firstName: string;
  lastName: string;
  employeeCode: string;
  email?: string;
  department?: string;
  designation?: string;
  dateOfJoining?: string;
  bankName?: string;
  bankAccountNumber?: string;
  panNumber?: string;
  uanNumber?: string;
} | null> {
  try {
    const response = await fetch(`${EMPLOYEE_SERVICE_URL}/employees/${employeeId}`, {
      headers: {
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    const data = await response.json() as Record<string, unknown>;
    const emp = (data.data || data.employee || data) as Record<string, unknown>;

    // Handle nested bank details
    const bankDetails = emp.bankDetails as Record<string, unknown> | undefined;

    return {
      firstName: String(emp.firstName || ''),
      lastName: String(emp.lastName || ''),
      employeeCode: String(emp.employeeCode || emp.employeeId || employeeId),
      email: emp.email ? String(emp.email) : undefined,
      department: emp.department && typeof emp.department === 'object'
        ? String((emp.department as Record<string, unknown>).name || '')
        : emp.departmentName ? String(emp.departmentName) : undefined,
      designation: emp.designation || emp.jobTitle || emp.position
        ? String(emp.designation || emp.jobTitle || emp.position)
        : undefined,
      dateOfJoining: emp.dateOfJoining || emp.joiningDate || emp.hireDate
        ? new Date(String(emp.dateOfJoining || emp.joiningDate || emp.hireDate)).toLocaleDateString('en-IN')
        : undefined,
      bankName: bankDetails?.bankName ? String(bankDetails.bankName) :
                emp.bankName ? String(emp.bankName) : undefined,
      bankAccountNumber: bankDetails?.accountNumber ? String(bankDetails.accountNumber) :
                         emp.bankAccountNumber || emp.accountNumber ? String(emp.bankAccountNumber || emp.accountNumber) : undefined,
      panNumber: emp.panNumber || emp.pan ? String(emp.panNumber || emp.pan) : undefined,
      uanNumber: emp.uanNumber || emp.uan ? String(emp.uanNumber || emp.uan) : undefined,
    };
  } catch {
    return null;
  }
}

// Helper to fetch employee data from employee service (simplified version for payroll generation)
async function fetchEmployeeData(tenantId: string, employeeId: string): Promise<{
  firstName: string;
  lastName: string;
  employeeCode: string;
  email?: string;
  department?: string;
} | null> {
  try {
    const response = await fetch(`${EMPLOYEE_SERVICE_URL}/employees/${employeeId}`, {
      headers: {
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    const data = await response.json() as Record<string, unknown>;
    const emp = (data.data || data.employee || data) as Record<string, unknown>;
    return {
      firstName: String(emp.firstName || ''),
      lastName: String(emp.lastName || ''),
      employeeCode: String(emp.employeeCode || emp.employeeId || employeeId),
      email: emp.email ? String(emp.email) : undefined,
      department: emp.department && typeof emp.department === 'object'
        ? String((emp.department as Record<string, unknown>).name || '')
        : emp.departmentName ? String(emp.departmentName) : undefined,
    };
  } catch {
    return null;
  }
}

// Generate payroll for an employee
export const generatePayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ success: false, errors: errors.array() });
      return;
    }

    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { employeeId, month, year } = req.body;

    // Check if payroll already exists
    const existing = await Payroll.findOne({ tenantId, employeeId, month, year });
    if (existing) {
      res.status(400).json({
        success: false,
        message: 'Payroll already exists for this period',
      });
      return;
    }

    // Get employee salary configuration
    const employeeSalary = await EmployeeSalary.findOne({
      tenantId,
      employeeId,
      isActive: true,
    }).populate('salaryStructureId');

    if (!employeeSalary) {
      res.status(404).json({
        success: false,
        message: 'No salary configuration found for employee',
      });
      return;
    }

    const salaryStructure = await SalaryStructure.findById(employeeSalary.salaryStructureId);
    if (!salaryStructure) {
      res.status(404).json({
        success: false,
        message: 'Salary structure not found',
      });
      return;
    }

    // Calculate pay period
    const payPeriodStart = new Date(year, month - 1, 1);
    const payPeriodEnd = new Date(year, month, 0);
    const workingDays = getWorkingDays(payPeriodStart, payPeriodEnd);

    // Fetch actual attendance data for the employee
    const attendance = await fetchAttendanceSummary(tenantId, employeeId, month, year);

    // Calculate actual present days, leave days, and LOP days
    let presentDays = workingDays; // Default to full attendance
    let leaveDays = 0;
    let lopDays = 0;

    if (attendance) {
      // Present days = full present + half days counted as 0.5
      presentDays = attendance.present + (attendance.halfDay * 0.5);
      // Approved leave days (paid leaves)
      leaveDays = attendance.leaves;
      // LOP days = working days - present days - approved leaves
      lopDays = Math.max(0, workingDays - presentDays - leaveDays);

      console.log(`[Payroll] Attendance for ${employeeId}: present=${presentDays}, leaves=${leaveDays}, lop=${lopDays}, workingDays=${workingDays}`);
    }

    // Calculate proration ratio based on actual attendance
    // Paid days = present days + approved leave days
    const paidDays = presentDays + leaveDays;
    const prorationRatio = workingDays > 0 ? paidDays / workingDays : 1;

    console.log(`[Payroll] Proration for ${employeeId}: paidDays=${paidDays}, ratio=${prorationRatio.toFixed(4)}`);

    // Calculate components
    const earnings: Array<{name: string; code: string; type: 'earning'; amount: number; isTaxable: boolean}> = [];
    const deductions: Array<{name: string; code: string; type: 'deduction'; amount: number; isTaxable: boolean}> = [];
    const fullBaseSalary = employeeSalary.baseSalary;
    // Prorate base salary based on attendance
    const baseSalary = Math.round(fullBaseSalary * prorationRatio);

    for (const component of salaryStructure.components) {
      if (!component.isActive) continue;

      let fullAmount = 0;
      if (component.calculationType === 'fixed') {
        fullAmount = component.value;
      } else if (component.calculationType === 'percentage') {
        // Calculate percentage based on the configured base (basic salary or gross salary)
        const grossSalary = fullBaseSalary;
        const baseForCalc = component.percentageOf === 'basic' ? fullBaseSalary : grossSalary;
        fullAmount = (baseForCalc * component.value) / 100;
      }
      // Ensure amount is valid
      if (isNaN(fullAmount) || !isFinite(fullAmount) || fullAmount < 0) {
        fullAmount = 0;
      }

      // Prorate earnings based on attendance
      let amount = component.type === 'earning' ? Math.round(fullAmount * prorationRatio) : fullAmount;

      if (component.type === 'earning') {
        earnings.push({
          name: component.name,
          code: component.code,
          type: 'earning',
          amount,
          isTaxable: component.isTaxable,
        });
      } else {
        // Recalculate deduction based on prorated salary if it's percentage based
        if (component.calculationType === 'percentage') {
          amount = Math.round((baseSalary * component.value) / 100);
        }
        deductions.push({
          name: component.name,
          code: component.code,
          type: 'deduction',
          amount,
          isTaxable: component.isTaxable,
        });
      }
    }

    // Note: We already prorated baseSalary and earnings based on attendance ratio
    // So we don't add a separate LOP deduction (that would be double-counting)
    // The prorated salary already reflects the reduced pay for unpaid days

    // Fetch approved overtime entries for this employee and period
    const overtimeData = await getApprovedOvertimeForPayroll(tenantId, employeeId, month, year);
    const overtimeHours = overtimeData.totalHours;
    const overtimePay = overtimeData.totalAmount;

    // Add overtime pay as an earning if applicable
    if (overtimePay > 0) {
      earnings.push({
        name: 'Overtime Pay',
        code: 'OT',
        type: 'earning',
        amount: Math.round(overtimePay),
        isTaxable: true,
      });
    }

    // Calculate shift allowance if employee is assigned to a shift
    const shiftAllowanceData = await calculateShiftAllowance(
      tenantId,
      employeeId,
      month,
      year,
      employeeSalary.baseSalary,
      workingDays
    );

    if (shiftAllowanceData && shiftAllowanceData.allowanceAmount > 0) {
      earnings.push({
        name: `Shift Allowance (${shiftAllowanceData.shiftName})`,
        code: 'SHIFT',
        type: 'earning',
        amount: Math.round(shiftAllowanceData.allowanceAmount * prorationRatio),
        isTaxable: true,
      });
    }

    // Fetch employee data for snapshot
    const employeeData = await fetchEmployeeData(tenantId, employeeId);

    // Create payroll record
    const payroll = new Payroll({
      tenantId,
      employeeId,
      employee: employeeData || {
        firstName: 'Employee',
        lastName: employeeId.slice(-6),
        employeeCode: employeeId,
      },
      month,
      year,
      payPeriodStart,
      payPeriodEnd,
      baseSalary,
      earnings,
      deductions,
      workingDays,
      presentDays,
      leaveDays,
      lopDays,
      overtimeHours,
      overtimePay: Math.round(overtimePay),
      processedBy: userId,
      status: 'draft',
    });

    await payroll.save();

    // Mark overtime entries as paid
    if (overtimeData.entries.length > 0) {
      const entryIds = overtimeData.entries.map(e => (e as any)._id.toString());
      await markOvertimeAsPaid(entryIds, payroll._id.toString());
    }

    res.status(201).json({
      success: true,
      message: 'Payroll generated successfully',
      data: { payroll },
    });
  } catch (error) {
    console.error('[Payroll Service] Generate payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payroll',
    });
  }
};

// Get payrolls
export const getPayrolls = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const {
      employeeId,
      month,
      year,
      status,
      search,
      sortBy = 'year',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);
    if (status) query.status = status;

    // Text search - search by employee ID or notes
    if (search) {
      query.$or = [
        { employeeId: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    // Dynamic sorting
    const sortOptions: Record<string, 1 | -1> = {
      [sortBy as string]: sortOrder === 'asc' ? 1 : -1,
    };

    const [payrolls, total] = await Promise.all([
      Payroll.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Payroll.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        payrolls,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error('[Payroll Service] Get payrolls error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payrolls',
    });
  }
};

// Get payroll by ID
export const getPayrollById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const payroll = await Payroll.findOne({ _id: id, tenantId }).lean();

    if (!payroll) {
      res.status(404).json({ success: false, message: 'Payroll not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: { payroll },
    });
  } catch (error) {
    console.error('[Payroll Service] Get payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll',
    });
  }
};

// Process payroll
export const processPayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;

    const payroll = await Payroll.findOne({ _id: id, tenantId });

    if (!payroll) {
      res.status(404).json({ success: false, message: 'Payroll not found' });
      return;
    }

    if (payroll.status !== 'draft') {
      res.status(400).json({ success: false, message: 'Payroll is not in draft status' });
      return;
    }

    payroll.status = 'processed';
    payroll.processedBy = userId as unknown as typeof payroll.processedBy;
    payroll.processedAt = new Date();
    await payroll.save();

    res.status(200).json({
      success: true,
      message: 'Payroll processed successfully',
      data: { payroll },
    });
  } catch (error) {
    console.error('[Payroll Service] Process payroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payroll',
    });
  }
};

// Mark payroll as paid
export const markAsPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;
    const { paymentReference } = req.body;

    const payroll = await Payroll.findOne({ _id: id, tenantId });

    if (!payroll) {
      res.status(404).json({ success: false, message: 'Payroll not found' });
      return;
    }

    if (payroll.status !== 'processed') {
      res.status(400).json({ success: false, message: 'Payroll must be processed before marking as paid' });
      return;
    }

    payroll.status = 'paid';
    payroll.paidAt = new Date();
    payroll.paymentReference = paymentReference;
    await payroll.save();

    res.status(200).json({
      success: true,
      message: 'Payroll marked as paid',
      data: { payroll },
    });
  } catch (error) {
    console.error('[Payroll Service] Mark as paid error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark payroll as paid',
    });
  }
};

// Bulk generate payroll
export const bulkGeneratePayroll = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { month, year, employeeIds: providedEmployeeIds } = req.body;

    // If no employeeIds provided, get all employees with active salary configurations
    let employeeIds = providedEmployeeIds;
    if (!employeeIds || !Array.isArray(employeeIds) || employeeIds.length === 0) {
      const activeSalaries = await EmployeeSalary.find({ tenantId, isActive: true }).select('employeeId').lean();
      employeeIds = activeSalaries.map(s => s.employeeId.toString());

      if (employeeIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'No employees with salary configurations found. Please assign salary structures to employees first.',
        });
        return;
      }
    }

    const results = { success: 0, failed: 0, errors: [] as string[] };

    for (const employeeId of employeeIds) {
      try {
        // Check if already exists
        const existing = await Payroll.findOne({ tenantId, employeeId, month, year });
        if (existing) {
          results.errors.push(`Payroll already exists for employee ${employeeId}`);
          results.failed++;
          continue;
        }

        const employeeSalary = await EmployeeSalary.findOne({
          tenantId,
          employeeId,
          isActive: true,
        });

        if (!employeeSalary) {
          results.errors.push(`No salary config for employee ${employeeId}`);
          results.failed++;
          continue;
        }

        const salaryStructure = await SalaryStructure.findById(employeeSalary.salaryStructureId);
        if (!salaryStructure) {
          results.failed++;
          continue;
        }

        const payPeriodStart = new Date(year, month - 1, 1);
        const payPeriodEnd = new Date(year, month, 0);
        const workingDays = getWorkingDays(payPeriodStart, payPeriodEnd);

        // Fetch actual attendance data for the employee
        const attendance = await fetchAttendanceSummary(tenantId, employeeId, month, year);

        // Calculate actual present days, leave days, and LOP days
        let presentDays = workingDays; // Default to full attendance
        let leaveDays = 0;
        let lopDays = 0;

        if (attendance) {
          // Present days = full present + half days counted as 0.5
          presentDays = attendance.present + (attendance.halfDay * 0.5);
          // Approved leave days (paid leaves)
          leaveDays = attendance.leaves;
          // LOP days = working days - present days - approved leaves - holidays
          // (holidays are already excluded from workingDays calculation if they fall on weekdays)
          lopDays = Math.max(0, workingDays - presentDays - leaveDays);

          console.log(`[Payroll] Attendance for ${employeeId}: present=${presentDays}, leaves=${leaveDays}, lop=${lopDays}, workingDays=${workingDays}`);
        }

        // Calculate proration ratio based on actual attendance
        // Paid days = present days + approved leave days
        const paidDays = presentDays + leaveDays;
        const prorationRatio = workingDays > 0 ? paidDays / workingDays : 1;

        console.log(`[Payroll] Proration for ${employeeId}: paidDays=${paidDays}, ratio=${prorationRatio.toFixed(4)}`);

        const earnings: Array<{name: string; code: string; type: 'earning'; amount: number; isTaxable: boolean}> = [];
        const deductions: Array<{name: string; code: string; type: 'deduction'; amount: number; isTaxable: boolean}> = [];
        const fullBaseSalary = employeeSalary.baseSalary;
        // Prorate base salary based on attendance
        const baseSalary = Math.round(fullBaseSalary * prorationRatio);

        for (const component of salaryStructure.components) {
          if (!component.isActive) continue;
          let fullAmount = component.calculationType === 'fixed' ? component.value : (fullBaseSalary * component.value) / 100;
          // Prorate earnings based on attendance, deductions remain as-is (they're calculated on prorated amounts)
          let amount = component.type === 'earning' ? Math.round(fullAmount * prorationRatio) : fullAmount;

          if (component.type === 'earning') {
            earnings.push({ name: component.name, code: component.code, type: 'earning', amount, isTaxable: component.isTaxable });
          } else {
            // Recalculate deduction based on prorated salary if it's percentage based
            if (component.calculationType === 'percentage') {
              amount = Math.round((baseSalary * component.value) / 100);
            }
            deductions.push({ name: component.name, code: component.code, type: 'deduction', amount, isTaxable: component.isTaxable });
          }
        }

        // Note: We already prorated baseSalary and earnings based on attendance ratio
        // So we don't add a separate LOP deduction (that would be double-counting)
        // The prorated salary already reflects the reduced pay for unpaid days

        // Fetch approved overtime entries for this employee and period
        const overtimeData = await getApprovedOvertimeForPayroll(tenantId, employeeId, month, year);
        const overtimeHours = overtimeData.totalHours;
        const overtimePay = overtimeData.totalAmount;

        // Add overtime pay as an earning if applicable
        if (overtimePay > 0) {
          earnings.push({
            name: 'Overtime Pay',
            code: 'OT',
            type: 'earning',
            amount: Math.round(overtimePay),
            isTaxable: true,
          });
        }

        // Calculate shift allowance if employee is assigned to a shift
        const shiftAllowanceData = await calculateShiftAllowance(
          tenantId,
          employeeId,
          month,
          year,
          employeeSalary.baseSalary,
          workingDays
        );

        if (shiftAllowanceData && shiftAllowanceData.allowanceAmount > 0) {
          earnings.push({
            name: `Shift Allowance (${shiftAllowanceData.shiftName})`,
            code: 'SHIFT',
            type: 'earning',
            amount: Math.round(shiftAllowanceData.allowanceAmount * prorationRatio),
            isTaxable: true,
          });
        }

        // Fetch employee data for snapshot
        const employeeData = await fetchEmployeeData(tenantId, employeeId);

        const payroll = new Payroll({
          tenantId,
          employeeId,
          employee: employeeData || {
            firstName: 'Employee',
            lastName: employeeId.slice(-6),
            employeeCode: employeeId,
          },
          month,
          year,
          payPeriodStart,
          payPeriodEnd,
          baseSalary,
          earnings,
          deductions,
          workingDays,
          presentDays,
          leaveDays,
          lopDays,
          overtimeHours,
          overtimePay: Math.round(overtimePay),
          processedBy: userId,
          status: 'draft',
        });

        await payroll.save();

        // Mark overtime entries as paid
        if (overtimeData.entries.length > 0) {
          const entryIds = overtimeData.entries.map(e => (e as any)._id.toString());
          await markOvertimeAsPaid(entryIds, payroll._id.toString());
        }

        results.success++;
      } catch (err: any) {
        console.error(`[Payroll] Error generating payroll for ${employeeId}:`, err.message || err);
        results.errors.push(`Error for ${employeeId}: ${err.message || 'Unknown error'}`);
        results.failed++;
      }
    }

    res.status(200).json({
      success: true,
      message: `Generated ${results.success} payrolls, ${results.failed} failed`,
      data: results,
    });
  } catch (error) {
    console.error('[Payroll Service] Bulk generate error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to bulk generate payroll',
    });
  }
};

// Get payroll summary
export const getPayrollSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { month, year } = req.query;

    const payrolls = await Payroll.find({
      tenantId,
      month: Number(month),
      year: Number(year),
    }).lean();

    const summary = {
      totalEmployees: payrolls.length,
      totalGrossSalary: payrolls.reduce((sum, p) => sum + p.grossSalary, 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + p.totalDeductions, 0),
      totalNetSalary: payrolls.reduce((sum, p) => sum + p.netSalary, 0),
      totalTax: payrolls.reduce((sum, p) => sum + p.incomeTax, 0),
      totalOvertimeHours: payrolls.reduce((sum, p) => sum + (p.overtimeHours || 0), 0),
      totalOvertimePay: payrolls.reduce((sum, p) => sum + (p.overtimePay || 0), 0),
      statusBreakdown: {
        draft: payrolls.filter(p => p.status === 'draft').length,
        processing: payrolls.filter(p => p.status === 'processing').length,
        processed: payrolls.filter(p => p.status === 'processed').length,
        paid: payrolls.filter(p => p.status === 'paid').length,
      },
    };

    res.status(200).json({
      success: true,
      data: { summary },
    });
  } catch (error) {
    console.error('[Payroll Service] Get summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payroll summary',
    });
  }
};

// Helper function to calculate working days
function getWorkingDays(startDate: Date, endDate: Date): number {
  let count = 0;
  const current = new Date(startDate);
  while (current <= endDate) {
    const dayOfWeek = current.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  return count;
}

// ==================== EMPLOYEE SELF-SERVICE ENDPOINTS ====================

// Get payslips for employee (self-service) - returns processed/paid payrolls only
export const getEmployeePayslips = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.tenantId || req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;
    const { page = 1, limit = 12, year, status } = req.query;

    if (!employeeId) {
      res.status(400).json({ success: false, message: 'Employee ID is required' });
      return;
    }

    // Build query - only show processed or paid payrolls to employees
    const query: Record<string, unknown> = {
      tenantId,
      employeeId,
      status: { $in: ['processed', 'paid'] } // Only show finalized payrolls
    };

    // Filter by year if provided
    if (year) {
      query.year = Number(year);
    }

    // Allow further filtering by status if specified
    if (status && (status === 'processed' || status === 'paid')) {
      query.status = status;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [payrolls, total] = await Promise.all([
      Payroll.find(query)
        .sort({ year: -1, month: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Payroll.countDocuments(query),
    ]);

    // Transform to mobile app expected format
    const payslips = payrolls.map(payroll => ({
      _id: payroll._id,
      tenantId: payroll.tenantId,
      employeeId: payroll.employeeId,
      employee: payroll.employee ? {
        firstName: payroll.employee.firstName,
        lastName: payroll.employee.lastName,
        employeeCode: payroll.employee.employeeCode,
        email: payroll.employee.email,
        department: payroll.employee.department,
      } : undefined,
      month: payroll.month,
      year: payroll.year,
      basicSalary: payroll.baseSalary,
      earnings: payroll.earnings.map(e => ({
        name: e.name,
        code: e.code,
        amount: e.amount,
        type: 'fixed' as const,
        isRecurring: true,
      })),
      deductions: payroll.deductions.map(d => ({
        name: d.name,
        code: d.code,
        amount: d.amount,
        type: 'fixed' as const,
        isRecurring: true,
      })),
      grossSalary: payroll.grossSalary,
      totalDeductions: payroll.totalDeductions,
      netSalary: payroll.netSalary,
      status: payroll.status === 'processed' ? 'approved' : payroll.status, // Map 'processed' to 'approved' for mobile
      paidAt: payroll.paidAt,
      payPeriodStart: payroll.payPeriodStart,
      payPeriodEnd: payroll.payPeriodEnd,
      workingDays: payroll.workingDays,
      presentDays: payroll.presentDays,
      leaveDays: payroll.leaveDays,
      lopDays: payroll.lopDays,
      createdAt: payroll.createdAt,
      updatedAt: payroll.updatedAt,
    }));

    res.status(200).json({
      success: true,
      data: payslips,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('[Payroll Service] Get employee payslips error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payslips',
    });
  }
};

// Get specific payslip for employee by month/year
export const getEmployeePayslipByPeriod = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.tenantId || req.headers['x-tenant-id'] as string;
    const { employeeId, year, month } = req.params;

    if (!employeeId || !year || !month) {
      res.status(400).json({ success: false, message: 'Employee ID, year and month are required' });
      return;
    }

    const payroll = await Payroll.findOne({
      tenantId,
      employeeId,
      year: Number(year),
      month: Number(month),
      status: { $in: ['processed', 'paid'] } // Only show finalized payrolls
    }).lean();

    if (!payroll) {
      res.status(404).json({ success: false, message: 'Payslip not found' });
      return;
    }

    // Transform to mobile app expected format
    const payslip = {
      _id: payroll._id,
      tenantId: payroll.tenantId,
      employeeId: payroll.employeeId,
      employee: payroll.employee ? {
        firstName: payroll.employee.firstName,
        lastName: payroll.employee.lastName,
        employeeCode: payroll.employee.employeeCode,
        email: payroll.employee.email,
        department: payroll.employee.department,
      } : undefined,
      month: payroll.month,
      year: payroll.year,
      basicSalary: payroll.baseSalary,
      earnings: payroll.earnings.map(e => ({
        name: e.name,
        code: e.code,
        amount: e.amount,
        type: 'fixed' as const,
        isRecurring: true,
      })),
      deductions: payroll.deductions.map(d => ({
        name: d.name,
        code: d.code,
        amount: d.amount,
        type: 'fixed' as const,
        isRecurring: true,
      })),
      grossSalary: payroll.grossSalary,
      totalDeductions: payroll.totalDeductions,
      netSalary: payroll.netSalary,
      status: payroll.status === 'processed' ? 'approved' : payroll.status,
      paidAt: payroll.paidAt,
      payPeriodStart: payroll.payPeriodStart,
      payPeriodEnd: payroll.payPeriodEnd,
      workingDays: payroll.workingDays,
      presentDays: payroll.presentDays,
      leaveDays: payroll.leaveDays,
      lopDays: payroll.lopDays,
      incomeTax: payroll.incomeTax,
      taxableIncome: payroll.taxableIncome,
      overtimeHours: payroll.overtimeHours,
      overtimePay: payroll.overtimePay,
      notes: payroll.notes,
      createdAt: payroll.createdAt,
      updatedAt: payroll.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: payslip,
    });
  } catch (error) {
    console.error('[Payroll Service] Get employee payslip error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payslip',
    });
  }
};

// Get specific payslip by ID for employee (self-service)
export const getEmployeePayslipById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.tenantId || req.headers['x-tenant-id'] as string;
    const { employeeId, payslipId } = req.params;

    if (!employeeId || !payslipId) {
      res.status(400).json({ success: false, message: 'Employee ID and Payslip ID are required' });
      return;
    }

    const payroll = await Payroll.findOne({
      _id: payslipId,
      tenantId,
      employeeId,
      status: { $in: ['processed', 'paid'] } // Only show finalized payrolls
    }).lean();

    if (!payroll) {
      res.status(404).json({ success: false, message: 'Payslip not found' });
      return;
    }

    // Transform to mobile app expected format
    const payslip = {
      _id: payroll._id,
      tenantId: payroll.tenantId,
      employeeId: payroll.employeeId,
      employee: payroll.employee ? {
        firstName: payroll.employee.firstName,
        lastName: payroll.employee.lastName,
        employeeCode: payroll.employee.employeeCode,
        email: payroll.employee.email,
        department: payroll.employee.department,
      } : undefined,
      month: payroll.month,
      year: payroll.year,
      basicSalary: payroll.baseSalary,
      earnings: payroll.earnings.map(e => ({
        name: e.name,
        code: e.code,
        amount: e.amount,
        type: 'fixed' as const,
        isRecurring: true,
      })),
      deductions: payroll.deductions.map(d => ({
        name: d.name,
        code: d.code,
        amount: d.amount,
        type: 'fixed' as const,
        isRecurring: true,
      })),
      grossSalary: payroll.grossSalary,
      totalDeductions: payroll.totalDeductions,
      netSalary: payroll.netSalary,
      status: payroll.status === 'processed' ? 'approved' : payroll.status,
      paidAt: payroll.paidAt,
      payPeriodStart: payroll.payPeriodStart,
      payPeriodEnd: payroll.payPeriodEnd,
      workingDays: payroll.workingDays,
      presentDays: payroll.presentDays,
      leaveDays: payroll.leaveDays,
      lopDays: payroll.lopDays,
      incomeTax: payroll.incomeTax,
      taxableIncome: payroll.taxableIncome,
      overtimeHours: payroll.overtimeHours,
      overtimePay: payroll.overtimePay,
      notes: payroll.notes,
      createdAt: payroll.createdAt,
      updatedAt: payroll.updatedAt,
    };

    res.status(200).json({
      success: true,
      data: payslip,
    });
  } catch (error) {
    console.error('[Payroll Service] Get employee payslip by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payslip',
    });
  }
};

// Get YTD summary for employee
export const getEmployeeYTDSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.tenantId || req.headers['x-tenant-id'] as string;
    const { employeeId, year } = req.params;

    if (!employeeId || !year) {
      res.status(400).json({ success: false, message: 'Employee ID and year are required' });
      return;
    }

    const payrolls = await Payroll.find({
      tenantId,
      employeeId,
      year: Number(year),
      status: { $in: ['processed', 'paid'] }
    }).sort({ month: 1 }).lean();

    const monthlyBreakdown = payrolls.map(p => ({
      month: p.month,
      gross: p.grossSalary,
      deductions: p.totalDeductions,
      net: p.netSalary,
    }));

    const summary = {
      year: Number(year),
      totalGross: payrolls.reduce((sum, p) => sum + p.grossSalary, 0),
      totalDeductions: payrolls.reduce((sum, p) => sum + p.totalDeductions, 0),
      totalNet: payrolls.reduce((sum, p) => sum + p.netSalary, 0),
      totalTax: payrolls.reduce((sum, p) => sum + (p.incomeTax || 0), 0),
      monthsProcessed: payrolls.length,
      monthlyBreakdown,
    };

    res.status(200).json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('[Payroll Service] Get YTD summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch YTD summary',
    });
  }
};

// Download payslip PDF for employee (by payslip ID)
export const downloadPayslipPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.tenantId || req.headers['x-tenant-id'] as string;
    const { employeeId, payslipId } = req.params;

    if (!employeeId || !payslipId) {
      res.status(400).json({ success: false, message: 'Employee ID and Payslip ID are required' });
      return;
    }

    const payroll = await Payroll.findOne({
      _id: payslipId,
      tenantId,
      employeeId,
      status: { $in: ['draft', 'processed', 'paid'] }
    }).lean();

    if (!payroll) {
      res.status(404).json({ success: false, message: 'Payslip not found or not ready for download' });
      return;
    }

    // Fetch tenant and employee data in parallel
    const [tenantData, employeeData] = await Promise.all([
      fetchTenantData(tenantId),
      fetchFullEmployeeData(tenantId, employeeId),
    ]);

    // Build company address
    const addressParts = [
      tenantData?.address,
      tenantData?.city,
      tenantData?.state,
      tenantData?.pincode,
      tenantData?.country,
    ].filter(Boolean);
    const companyAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Address not available';

    // Format dates
    const payPeriodStart = new Date(payroll.payPeriodStart);
    const payPeriodEnd = new Date(payroll.payPeriodEnd);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Prepare payslip data for PDF generation
    const payslipData = {
      companyName: tenantData?.name || 'Company',
      companyAddress: companyAddress,
      companyLogo: tenantData?.logo,
      employeeName: employeeData
        ? `${employeeData.firstName} ${employeeData.lastName}`
        : payroll.employee
          ? `${payroll.employee.firstName} ${payroll.employee.lastName}`
          : 'Employee',
      employeeId: payroll.employeeId.toString(),
      employeeCode: employeeData?.employeeCode || payroll.employee?.employeeCode || payroll.employeeId.toString(),
      email: employeeData?.email || payroll.employee?.email,
      designation: employeeData?.designation || 'Employee',
      department: employeeData?.department || payroll.employee?.department || 'Department',
      dateOfJoining: employeeData?.dateOfJoining || 'Not available',
      bankName: employeeData?.bankName || 'Bank',
      bankAccountNumber: employeeData?.bankAccountNumber || 'XXXXXXXX',
      panNumber: employeeData?.panNumber,
      uanNumber: employeeData?.uanNumber,
      month: payroll.month,
      year: payroll.year,
      payPeriodStart: payPeriodStart.toLocaleDateString('en-IN'),
      payPeriodEnd: payPeriodEnd.toLocaleDateString('en-IN'),
      workingDays: payroll.workingDays || 0,
      presentDays: payroll.presentDays || 0,
      leaveDays: payroll.leaveDays || 0,
      lopDays: payroll.lopDays || 0,
      basicSalary: payroll.baseSalary || 0,
      earnings: payroll.earnings.map(e => ({ name: e.name, amount: e.amount })),
      deductions: payroll.deductions.map(d => ({ name: d.name, amount: d.amount })),
      grossSalary: payroll.grossSalary,
      totalDeductions: payroll.totalDeductions,
      netSalary: payroll.netSalary,
      overtimeHours: payroll.overtimeHours || 0,
      overtimePay: payroll.overtimePay || 0,
      paymentReference: payroll.paymentReference,
    };

    const pdfBuffer = await generatePayslipPDF(payslipData);

    // Set response headers for PDF download
    const fileName = `Payslip_${employeeData?.employeeCode || payroll.employee?.employeeCode || employeeId}_${months[payroll.month - 1]}_${payroll.year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('[Payroll Service] Download payslip PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payslip PDF',
    });
  }
};

// Download payslip PDF by month/year
export const downloadPayslipByPeriodPDF = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.params.tenantId || req.headers['x-tenant-id'] as string;
    const { employeeId, year, month } = req.params;

    if (!employeeId || !year || !month) {
      res.status(400).json({ success: false, message: 'Employee ID, year and month are required' });
      return;
    }

    const payroll = await Payroll.findOne({
      tenantId,
      employeeId,
      year: Number(year),
      month: Number(month),
      status: { $in: ['processed', 'paid'] }
    }).lean();

    if (!payroll) {
      res.status(404).json({ success: false, message: 'Payslip not found for the specified period' });
      return;
    }

    // Fetch tenant and employee data in parallel
    const [tenantData, employeeData] = await Promise.all([
      fetchTenantData(tenantId),
      fetchFullEmployeeData(tenantId, employeeId),
    ]);

    // Build company address
    const addressParts = [
      tenantData?.address,
      tenantData?.city,
      tenantData?.state,
      tenantData?.pincode,
      tenantData?.country,
    ].filter(Boolean);
    const companyAddress = addressParts.length > 0 ? addressParts.join(', ') : 'Address not available';

    // Format dates
    const payPeriodStart = new Date(payroll.payPeriodStart);
    const payPeriodEnd = new Date(payroll.payPeriodEnd);
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Prepare payslip data for PDF generation
    const payslipData = {
      companyName: tenantData?.name || 'Company',
      companyAddress: companyAddress,
      companyLogo: tenantData?.logo,
      employeeName: employeeData
        ? `${employeeData.firstName} ${employeeData.lastName}`
        : payroll.employee
          ? `${payroll.employee.firstName} ${payroll.employee.lastName}`
          : 'Employee',
      employeeId: payroll.employeeId.toString(),
      employeeCode: employeeData?.employeeCode || payroll.employee?.employeeCode || payroll.employeeId.toString(),
      email: employeeData?.email || payroll.employee?.email,
      designation: employeeData?.designation || 'Employee',
      department: employeeData?.department || payroll.employee?.department || 'Department',
      dateOfJoining: employeeData?.dateOfJoining || 'Not available',
      bankName: employeeData?.bankName || 'Bank',
      bankAccountNumber: employeeData?.bankAccountNumber || 'XXXXXXXX',
      panNumber: employeeData?.panNumber,
      uanNumber: employeeData?.uanNumber,
      month: payroll.month,
      year: payroll.year,
      payPeriodStart: payPeriodStart.toLocaleDateString('en-IN'),
      payPeriodEnd: payPeriodEnd.toLocaleDateString('en-IN'),
      workingDays: payroll.workingDays || 0,
      presentDays: payroll.presentDays || 0,
      leaveDays: payroll.leaveDays || 0,
      lopDays: payroll.lopDays || 0,
      basicSalary: payroll.baseSalary || 0,
      earnings: payroll.earnings.map(e => ({ name: e.name, amount: e.amount })),
      deductions: payroll.deductions.map(d => ({ name: d.name, amount: d.amount })),
      grossSalary: payroll.grossSalary,
      totalDeductions: payroll.totalDeductions,
      netSalary: payroll.netSalary,
      overtimeHours: payroll.overtimeHours || 0,
      overtimePay: payroll.overtimePay || 0,
      paymentReference: payroll.paymentReference,
    };

    const pdfBuffer = await generatePayslipPDF(payslipData);

    // Set response headers for PDF download
    const fileName = `Payslip_${employeeData?.employeeCode || payroll.employee?.employeeCode || employeeId}_${months[payroll.month - 1]}_${payroll.year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    console.error('[Payroll Service] Download payslip by period PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate payslip PDF',
    });
  }
};

// Debug endpoint to check salary status for all employees
export const debugSalaryStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    console.log(`[DEBUG] Checking salary status for tenant: ${tenantId}`);

    // Fetch all employees from employee service
    const employeesResponse = await fetch(`${EMPLOYEE_SERVICE_URL}/employees`, {
      headers: {
        'x-tenant-id': tenantId,
        'Content-Type': 'application/json',
      },
    });
    const employeesData = await employeesResponse.json() as { data?: Array<{ _id: string; firstName: string; lastName: string; employeeCode: string }> };
    const employees = employeesData.data || [];

    console.log(`[DEBUG] Found ${employees.length} employees`);

    // Fetch all active salary configurations
    const activeSalaries = await EmployeeSalary.find({ tenantId, isActive: true }).lean();
    console.log(`[DEBUG] Found ${activeSalaries.length} active salary configs`);

    // Fetch all salary configurations (including inactive)
    const allSalaries = await EmployeeSalary.find({ tenantId }).lean();
    console.log(`[DEBUG] Found ${allSalaries.length} total salary configs`);

    // Build comparison
    const employeeStatus = employees.map((emp: { _id: string; firstName: string; lastName: string; employeeCode: string }) => {
      const activeSalary = activeSalaries.find(s => s.employeeId.toString() === emp._id.toString());
      const anySalary = allSalaries.find(s => s.employeeId.toString() === emp._id.toString());

      return {
        employeeId: emp._id,
        name: `${emp.firstName} ${emp.lastName}`,
        employeeCode: emp.employeeCode,
        hasActiveSalary: !!activeSalary,
        hasAnySalary: !!anySalary,
        salaryDetails: activeSalary ? {
          baseSalary: activeSalary.baseSalary,
          structureId: activeSalary.salaryStructureId,
          effectiveFrom: activeSalary.effectiveFrom,
          isActive: activeSalary.isActive,
        } : null,
        allSalaryRecords: allSalaries.filter(s => s.employeeId.toString() === emp._id.toString()).map(s => ({
          id: s._id,
          baseSalary: s.baseSalary,
          isActive: s.isActive,
          effectiveFrom: s.effectiveFrom,
        })),
      };
    });

    // Summary
    const summary = {
      totalEmployees: employees.length,
      employeesWithActiveSalary: employeeStatus.filter((e: { hasActiveSalary: boolean }) => e.hasActiveSalary).length,
      employeesWithoutSalary: employeeStatus.filter((e: { hasActiveSalary: boolean }) => !e.hasActiveSalary).length,
    };

    res.status(200).json({
      success: true,
      tenantId,
      summary,
      employees: employeeStatus,
      rawSalaryConfigs: allSalaries,
    });
  } catch (error) {
    console.error('[DEBUG] Error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug endpoint failed',
      error: String(error),
    });
  }
};
