import { Request, Response } from 'express';
import Report from '../models/Report';
import ReportExecution from '../models/ReportExecution';
import mongoose from 'mongoose';

// ==================== REPORT CONTROLLERS ====================

export const createReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const report = new Report({
      ...req.body,
      tenantId,
      createdBy: userId,
    });

    await report.save();

    res.status(201).json({
      success: true,
      message: 'Report created successfully',
      data: { report },
    });
  } catch (error) {
    console.error('[Reports Service] Create report error:', error);
    res.status(500).json({ success: false, message: 'Failed to create report' });
  }
};

export const getReports = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { type, category, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = {
      tenantId,
      isActive: true,
      $or: [{ createdBy: userId }, { isPublic: true }],
    };
    if (type) query.type = type;
    if (category) query.category = category;

    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      Report.find(query)
        .populate('createdBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Report.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        reports,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (error) {
    console.error('[Reports Service] Get reports error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports' });
  }
};

export const getReportById = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const report = await Report.findOne({ _id: id, tenantId, isActive: true })
      .populate('createdBy', 'firstName lastName')
      .lean();

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    res.status(200).json({ success: true, data: { report } });
  } catch (error) {
    console.error('[Reports Service] Get report error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch report' });
  }
};

export const updateReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const report = await Report.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Report updated',
      data: { report },
    });
  } catch (error) {
    console.error('[Reports Service] Update report error:', error);
    res.status(500).json({ success: false, message: 'Failed to update report' });
  }
};

export const deleteReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { id } = req.params;

    const report = await Report.findOneAndUpdate(
      { _id: id, tenantId },
      { isActive: false },
      { new: true }
    );

    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Report deleted' });
  } catch (error) {
    console.error('[Reports Service] Delete report error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete report' });
  }
};

export const executeReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { id } = req.params;
    const { parameters, format = 'json' } = req.body;

    const report = await Report.findOne({ _id: id, tenantId, isActive: true });
    if (!report) {
      res.status(404).json({ success: false, message: 'Report not found' });
      return;
    }

    // Create execution record
    const execution = new ReportExecution({
      tenantId,
      reportId: id,
      executedBy: userId,
      parameters,
      format,
      status: 'running',
    });
    await execution.save();

    // In real implementation, this would trigger async report generation
    // For now, we'll simulate with a simple response
    const mockData = generateMockReportData(report.type, parameters);

    execution.status = 'completed';
    execution.completedAt = new Date();
    execution.duration = Date.now() - execution.startedAt.getTime();
    execution.rowCount = mockData.length;
    await execution.save();

    // Update report last generated timestamp
    report.lastGeneratedAt = new Date();
    await report.save();

    res.status(200).json({
      success: true,
      message: 'Report executed successfully',
      data: {
        execution: {
          id: execution._id,
          status: execution.status,
          rowCount: execution.rowCount,
          duration: execution.duration,
        },
        results: mockData,
      },
    });
  } catch (error) {
    console.error('[Reports Service] Execute report error:', error);
    res.status(500).json({ success: false, message: 'Failed to execute report' });
  }
};

export const getReportExecutions = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { reportId, page = 1, limit = 20 } = req.query;

    const query: Record<string, unknown> = { tenantId };
    if (reportId) query.reportId = reportId;

    const skip = (Number(page) - 1) * Number(limit);

    const [executions, total] = await Promise.all([
      ReportExecution.find(query)
        .populate('reportId', 'name type')
        .populate('executedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ReportExecution.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        executions,
        pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) },
      },
    });
  } catch (error) {
    console.error('[Reports Service] Get executions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch executions' });
  }
};

// ==================== STANDARD REPORTS ====================

export const getEmployeeReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { departmentId, status, startDate, endDate } = req.query;

    // This would typically query the employee service
    // For now, return mock analytics data
    const data = {
      summary: {
        totalEmployees: 150,
        activeEmployees: 142,
        newHires: 12,
        terminations: 5,
      },
      byDepartment: [
        { department: 'Engineering', count: 45 },
        { department: 'Sales', count: 30 },
        { department: 'Marketing', count: 25 },
        { department: 'HR', count: 15 },
        { department: 'Finance', count: 20 },
        { department: 'Operations', count: 15 },
      ],
      byStatus: [
        { status: 'active', count: 142 },
        { status: 'on_leave', count: 5 },
        { status: 'terminated', count: 3 },
      ],
      tenureDistribution: [
        { range: '0-1 years', count: 35 },
        { range: '1-3 years', count: 55 },
        { range: '3-5 years', count: 40 },
        { range: '5+ years', count: 20 },
      ],
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Reports Service] Employee report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate employee report' });
  }
};

export const getAttendanceReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { startDate, endDate, departmentId } = req.query;

    const data = {
      summary: {
        averageAttendance: 94.5,
        totalWorkingDays: 22,
        totalAbsences: 120,
        lateArrivals: 45,
      },
      dailyTrend: [
        { date: '2024-01-01', attendance: 95 },
        { date: '2024-01-02', attendance: 93 },
        { date: '2024-01-03', attendance: 96 },
        { date: '2024-01-04', attendance: 94 },
        { date: '2024-01-05', attendance: 92 },
      ],
      byDepartment: [
        { department: 'Engineering', attendance: 96 },
        { department: 'Sales', attendance: 92 },
        { department: 'Marketing', attendance: 94 },
        { department: 'HR', attendance: 97 },
        { department: 'Finance', attendance: 95 },
      ],
      topAbsentees: [
        { employee: 'John Doe', absences: 5 },
        { employee: 'Jane Smith', absences: 4 },
        { employee: 'Bob Johnson', absences: 3 },
      ],
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Reports Service] Attendance report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate attendance report' });
  }
};

export const getLeaveReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { year, departmentId } = req.query;

    const data = {
      summary: {
        totalLeavesTaken: 450,
        pendingRequests: 12,
        averageLeaveBalance: 8.5,
        approvalRate: 92,
      },
      byType: [
        { type: 'Annual Leave', count: 280 },
        { type: 'Sick Leave', count: 95 },
        { type: 'Personal Leave', count: 45 },
        { type: 'Maternity/Paternity', count: 20 },
        { type: 'Other', count: 10 },
      ],
      monthlyTrend: [
        { month: 'Jan', count: 30 },
        { month: 'Feb', count: 25 },
        { month: 'Mar', count: 35 },
        { month: 'Apr', count: 40 },
        { month: 'May', count: 45 },
        { month: 'Jun', count: 50 },
      ],
      byDepartment: [
        { department: 'Engineering', taken: 120, balance: 180 },
        { department: 'Sales', taken: 80, balance: 120 },
        { department: 'Marketing', taken: 65, balance: 100 },
      ],
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Reports Service] Leave report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate leave report' });
  }
};

export const getPayrollReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { month, year, departmentId } = req.query;

    const data = {
      summary: {
        totalGrossSalary: 2500000,
        totalDeductions: 450000,
        totalNetSalary: 2050000,
        totalEmployees: 150,
        averageSalary: 13667,
      },
      byDepartment: [
        { department: 'Engineering', gross: 900000, net: 765000 },
        { department: 'Sales', gross: 600000, net: 510000 },
        { department: 'Marketing', gross: 400000, net: 340000 },
        { department: 'HR', gross: 250000, net: 212500 },
        { department: 'Finance', gross: 350000, net: 297500 },
      ],
      deductionBreakdown: [
        { type: 'Tax', amount: 300000 },
        { type: 'Health Insurance', amount: 75000 },
        { type: 'Retirement', amount: 50000 },
        { type: 'Other', amount: 25000 },
      ],
      monthlyTrend: [
        { month: 'Jan', gross: 2400000, net: 1980000 },
        { month: 'Feb', gross: 2450000, net: 2010000 },
        { month: 'Mar', gross: 2500000, net: 2050000 },
      ],
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Reports Service] Payroll report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate payroll report' });
  }
};

export const getRecruitmentReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { startDate, endDate } = req.query;

    const data = {
      summary: {
        openPositions: 15,
        totalApplications: 450,
        hiredThisMonth: 8,
        avgTimeToHire: 25,
        offerAcceptanceRate: 85,
      },
      pipeline: [
        { stage: 'New', count: 180 },
        { stage: 'Screening', count: 120 },
        { stage: 'Interview', count: 80 },
        { stage: 'Technical', count: 45 },
        { stage: 'HR Round', count: 30 },
        { stage: 'Offer', count: 15 },
        { stage: 'Hired', count: 8 },
      ],
      bySource: [
        { source: 'LinkedIn', count: 180 },
        { source: 'Indeed', count: 120 },
        { source: 'Referral', count: 80 },
        { source: 'Company Website', count: 50 },
        { source: 'Other', count: 20 },
      ],
      byDepartment: [
        { department: 'Engineering', openings: 8, hired: 4 },
        { department: 'Sales', openings: 4, hired: 2 },
        { department: 'Marketing', openings: 2, hired: 1 },
        { department: 'Operations', openings: 1, hired: 1 },
      ],
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Reports Service] Recruitment report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate recruitment report' });
  }
};

export const getPerformanceReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { year, departmentId } = req.query;

    const data = {
      summary: {
        reviewsCompleted: 140,
        reviewsPending: 10,
        averageRating: 3.8,
        topPerformers: 25,
        needsImprovement: 8,
      },
      ratingDistribution: [
        { rating: 5, label: 'Exceptional', count: 15 },
        { rating: 4, label: 'Exceeds Expectations', count: 45 },
        { rating: 3, label: 'Meets Expectations', count: 65 },
        { rating: 2, label: 'Needs Improvement', count: 12 },
        { rating: 1, label: 'Unsatisfactory', count: 3 },
      ],
      byDepartment: [
        { department: 'Engineering', avgRating: 3.9 },
        { department: 'Sales', avgRating: 3.7 },
        { department: 'Marketing', avgRating: 3.8 },
        { department: 'HR', avgRating: 4.0 },
        { department: 'Finance', avgRating: 3.6 },
      ],
      goalCompletion: {
        achieved: 68,
        partiallyAchieved: 22,
        notAchieved: 10,
      },
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Reports Service] Performance report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate performance report' });
  }
};

export const getTrainingReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { year } = req.query;

    const data = {
      summary: {
        totalPrograms: 35,
        activePrograms: 12,
        totalEnrollments: 450,
        completionRate: 78,
        averageRating: 4.2,
      },
      byCategory: [
        { category: 'Technical', programs: 15, enrollments: 200 },
        { category: 'Soft Skills', programs: 8, enrollments: 120 },
        { category: 'Compliance', programs: 6, enrollments: 80 },
        { category: 'Leadership', programs: 4, enrollments: 35 },
        { category: 'Safety', programs: 2, enrollments: 15 },
      ],
      completionTrend: [
        { month: 'Jan', completed: 35 },
        { month: 'Feb', completed: 42 },
        { month: 'Mar', completed: 38 },
        { month: 'Apr', completed: 50 },
        { month: 'May', completed: 45 },
        { month: 'Jun', completed: 55 },
      ],
      topRatedCourses: [
        { title: 'Leadership Fundamentals', rating: 4.8 },
        { title: 'Advanced React', rating: 4.7 },
        { title: 'Communication Skills', rating: 4.6 },
      ],
    };

    res.status(200).json({ success: true, data });
  } catch (error) {
    console.error('[Reports Service] Training report error:', error);
    res.status(500).json({ success: false, message: 'Failed to generate training report' });
  }
};

// Helper function to generate mock report data
function generateMockReportData(type: string, parameters: Record<string, unknown>): unknown[] {
  const mockData: Record<string, unknown[]> = {
    employee: [
      { id: 1, name: 'John Doe', department: 'Engineering', status: 'active' },
      { id: 2, name: 'Jane Smith', department: 'Sales', status: 'active' },
    ],
    attendance: [
      { date: '2024-01-15', present: 145, absent: 5 },
      { date: '2024-01-16', present: 142, absent: 8 },
    ],
    leave: [
      { employee: 'John Doe', type: 'Annual', days: 5 },
      { employee: 'Jane Smith', type: 'Sick', days: 2 },
    ],
    payroll: [
      { employee: 'John Doe', gross: 5000, deductions: 800, net: 4200 },
      { employee: 'Jane Smith', gross: 4500, deductions: 720, net: 3780 },
    ],
    recruitment: [
      { position: 'Software Engineer', applications: 45, hired: 2 },
      { position: 'Sales Manager', applications: 30, hired: 1 },
    ],
    performance: [
      { employee: 'John Doe', rating: 4.5, status: 'completed' },
      { employee: 'Jane Smith', rating: 4.0, status: 'completed' },
    ],
    training: [
      { program: 'Leadership 101', enrollments: 25, completions: 20 },
      { program: 'Technical Training', enrollments: 40, completions: 35 },
    ],
  };

  return mockData[type] || [];
}
