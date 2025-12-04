import { Request, Response } from 'express';
import mongoose from 'mongoose';
import KPI from '../models/KPI';
import Dashboard from '../models/Dashboard';
import AnalyticsSnapshot from '../models/AnalyticsSnapshot';
import Prediction from '../models/Prediction';
import {
  calculateAttritionRisk,
  generateRecommendations,
  calculateTrend,
  detectAnomalies,
  detectSeasonality,
  savePrediction
} from '../services/predictionService';

// ==================== KPI ENDPOINTS ====================

export const createKPI = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const kpi = new KPI({
      ...req.body,
      tenantId,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    await kpi.save();

    res.status(201).json({ success: true, data: kpi });
  } catch (error: any) {
    console.error('Error creating KPI:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getKPIs = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { category, isActive, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId };
    if (category) query.category = category;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const kpis = await KPI.find(query)
      .sort({ category: 1, name: 1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    const total = await KPI.countDocuments(query);

    res.json({
      success: true,
      data: kpis,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getKPI = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { kpiId } = req.params;

    const kpi = await KPI.findOne({ _id: kpiId, tenantId });

    if (!kpi) {
      res.status(404).json({ success: false, message: 'KPI not found' });
      return;
    }

    res.json({ success: true, data: kpi });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateKPI = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { kpiId } = req.params;

    const kpi = await KPI.findOneAndUpdate(
      { _id: kpiId, tenantId },
      { $set: req.body },
      { new: true }
    );

    if (!kpi) {
      res.status(404).json({ success: false, message: 'KPI not found' });
      return;
    }

    res.json({ success: true, data: kpi });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteKPI = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { kpiId } = req.params;

    await KPI.findOneAndDelete({ _id: kpiId, tenantId });

    res.json({ success: true, message: 'KPI deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get default/built-in KPIs
export const getDefaultKPIs = async (req: Request, res: Response): Promise<void> => {
  try {
    const defaultKPIs = [
      {
        name: 'Employee Headcount',
        description: 'Total number of active employees',
        category: 'workforce',
        type: 'count',
        visualization: 'number',
      },
      {
        name: 'Turnover Rate',
        description: 'Percentage of employees who left in the period',
        category: 'workforce',
        type: 'percentage',
        visualization: 'gauge',
      },
      {
        name: 'Average Tenure',
        description: 'Average time employees have been with the company',
        category: 'workforce',
        type: 'average',
        visualization: 'number',
      },
      {
        name: 'Attendance Rate',
        description: 'Percentage of employees present on average',
        category: 'attendance',
        type: 'percentage',
        visualization: 'gauge',
      },
      {
        name: 'Absenteeism Rate',
        description: 'Percentage of unplanned absences',
        category: 'attendance',
        type: 'percentage',
        visualization: 'trend',
      },
      {
        name: 'Average Performance Score',
        description: 'Average performance rating across employees',
        category: 'performance',
        type: 'average',
        visualization: 'gauge',
      },
      {
        name: 'Time to Hire',
        description: 'Average days to fill a position',
        category: 'recruitment',
        type: 'average',
        visualization: 'number',
      },
      {
        name: 'Offer Acceptance Rate',
        description: 'Percentage of offers accepted',
        category: 'recruitment',
        type: 'percentage',
        visualization: 'gauge',
      },
      {
        name: 'Cost per Hire',
        description: 'Average cost to hire an employee',
        category: 'recruitment',
        type: 'average',
        visualization: 'number',
      },
      {
        name: 'Payroll Cost',
        description: 'Total payroll expenditure',
        category: 'payroll',
        type: 'sum',
        visualization: 'trend',
      },
      {
        name: 'Training Completion Rate',
        description: 'Percentage of assigned trainings completed',
        category: 'engagement',
        type: 'percentage',
        visualization: 'gauge',
      },
      {
        name: 'Leave Utilization',
        description: 'Percentage of available leaves used',
        category: 'workforce',
        type: 'percentage',
        visualization: 'bar',
      },
    ];

    res.json({ success: true, data: defaultKPIs });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== DASHBOARD ENDPOINTS ====================

export const createDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    const dashboard = new Dashboard({
      ...req.body,
      tenantId,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    await dashboard.save();

    res.status(201).json({ success: true, data: dashboard });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboards = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const userRole = req.headers['x-user-role'] as string;
    const { type } = req.query;

    const query: any = {
      tenantId,
      $or: [
        { createdBy: new mongoose.Types.ObjectId(userId) },
        { isPublic: true },
        { 'sharedWith.id': userId },
        { 'sharedWith.id': userRole, 'sharedWith.type': 'role' },
      ],
    };

    if (type) query.type = type;

    const dashboards = await Dashboard.find(query)
      .sort({ isDefault: -1, updatedAt: -1 })
      .lean();

    res.json({ success: true, data: dashboards });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { dashboardId } = req.params;

    const dashboard = await Dashboard.findOne({ _id: dashboardId, tenantId });

    if (!dashboard) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }

    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { dashboardId } = req.params;

    const dashboard = await Dashboard.findOneAndUpdate(
      { _id: dashboardId, tenantId },
      { $set: req.body },
      { new: true }
    );

    if (!dashboard) {
      res.status(404).json({ success: false, message: 'Dashboard not found' });
      return;
    }

    res.json({ success: true, data: dashboard });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const { dashboardId } = req.params;

    await Dashboard.findOneAndDelete({
      _id: dashboardId,
      tenantId,
      createdBy: new mongoose.Types.ObjectId(userId),
    });

    res.json({ success: true, message: 'Dashboard deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== ANALYTICS SNAPSHOT ENDPOINTS ====================

export const getSnapshots = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { type, startDate, endDate, limit = 30 } = req.query;

    const query: any = { tenantId };
    if (type) query.type = type;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate as string);
      if (endDate) query.date.$lte = new Date(endDate as string);
    }

    const snapshots = await AnalyticsSnapshot.find(query)
      .sort({ date: -1 })
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: snapshots });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getLatestSnapshot = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { type = 'daily' } = req.query;

    const snapshot = await AnalyticsSnapshot.findOne({ tenantId, type })
      .sort({ date: -1 })
      .lean();

    res.json({ success: true, data: snapshot });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== PREDICTION ENDPOINTS ====================

export const getPredictions = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { type, entityType, status = 'active' } = req.query;

    const query: any = { tenantId, status };
    if (type) query.type = type;
    if (entityType) query.entityType = entityType;

    const predictions = await Prediction.find(query)
      .sort({ 'prediction.value': -1 })
      .lean();

    res.json({ success: true, data: predictions });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getEmployeeAttritionRisk = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { employeeId } = req.params;

    const prediction = await Prediction.findOne({
      tenantId,
      type: 'attrition',
      entityType: 'employee',
      entityId: new mongoose.Types.ObjectId(employeeId),
      status: 'active',
    }).lean();

    if (!prediction) {
      res.status(404).json({ success: false, message: 'No prediction found for this employee' });
      return;
    }

    res.json({ success: true, data: prediction });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getHighRiskEmployees = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { threshold = 0.6, limit = 20 } = req.query;

    const predictions = await Prediction.find({
      tenantId,
      type: 'attrition',
      entityType: 'employee',
      status: 'active',
      'prediction.value': { $gte: Number(threshold) },
    })
      .sort({ 'prediction.value': -1 })
      .limit(Number(limit))
      .lean();

    res.json({
      success: true,
      data: predictions,
      summary: {
        total: predictions.length,
        highRisk: predictions.filter(p => p.prediction.value >= 0.7).length,
        mediumRisk: predictions.filter(p => p.prediction.value >= 0.5 && p.prediction.value < 0.7).length,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== TREND ANALYSIS ENDPOINTS ====================

export const getTrendAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { metric, period = 'monthly', months = 12 } = req.query;

    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - Number(months));

    const snapshots = await AnalyticsSnapshot.find({
      tenantId,
      type: period,
      date: { $gte: startDate },
    })
      .sort({ date: 1 })
      .lean();

    if (snapshots.length === 0) {
      res.json({ success: true, data: null, message: 'No data available' });
      return;
    }

    // Extract the specific metric data
    const data = snapshots.map(s => {
      let value = 0;
      const metricPath = (metric as string).split('.');
      let obj: any = s;
      for (const key of metricPath) {
        obj = obj?.[key];
      }
      value = typeof obj === 'number' ? obj : 0;
      return { date: s.date, value };
    });

    const trend = calculateTrend(data);
    const anomalies = detectAnomalies(data.map(d => d.value));
    const seasonality = detectSeasonality(data, period as 'weekly' | 'monthly' | 'quarterly');

    res.json({
      success: true,
      data: {
        metric,
        period,
        dataPoints: data,
        trend: {
          direction: trend.direction,
          slope: trend.slope,
          r2: trend.r2,
          nextPeriodPrediction: trend.prediction,
        },
        anomalies: anomalies.map(a => ({
          date: data[a.index].date,
          value: a.value,
          zscore: a.zscore,
        })),
        seasonality,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== COMPARISON ENDPOINTS ====================

export const getDepartmentComparison = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;
    const { metrics } = req.query;

    const latestSnapshot = await AnalyticsSnapshot.findOne({ tenantId, type: 'monthly' })
      .sort({ date: -1 })
      .lean();

    if (!latestSnapshot) {
      res.json({ success: true, data: [] });
      return;
    }

    const requestedMetrics = (metrics as string)?.split(',') || ['attendance', 'payroll'];
    const comparison: any[] = [];

    // Gather department data from snapshot
    const departments = new Set<string>();
    latestSnapshot.workforce?.byDepartment?.forEach(d => departments.add(d.name));
    latestSnapshot.attendance?.byDepartment?.forEach(d => departments.add(d.name));
    latestSnapshot.payroll?.byDepartment?.forEach(d => departments.add(d.name));

    departments.forEach(deptName => {
      const deptData: any = { department: deptName };

      if (requestedMetrics.includes('attendance')) {
        const attData = latestSnapshot.attendance?.byDepartment?.find(d => d.name === deptName);
        deptData.attendanceRate = attData?.rate || 0;
      }

      if (requestedMetrics.includes('payroll')) {
        const payData = latestSnapshot.payroll?.byDepartment?.find(d => d.name === deptName);
        deptData.averageSalary = payData?.average || 0;
        deptData.totalPayroll = payData?.total || 0;
      }

      if (requestedMetrics.includes('headcount')) {
        const wfData = latestSnapshot.workforce?.byDepartment?.find(d => d.name === deptName);
        deptData.headcount = wfData?.count || 0;
      }

      comparison.push(deptData);
    });

    res.json({ success: true, data: comparison });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==================== EXECUTIVE SUMMARY ====================

export const getExecutiveSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    // Get latest snapshots
    const [latestDaily, latestMonthly, previousMonthly] = await Promise.all([
      AnalyticsSnapshot.findOne({ tenantId, type: 'daily' }).sort({ date: -1 }).lean(),
      AnalyticsSnapshot.findOne({ tenantId, type: 'monthly' }).sort({ date: -1 }).lean(),
      AnalyticsSnapshot.find({ tenantId, type: 'monthly' }).sort({ date: -1 }).skip(1).limit(1).lean(),
    ]);

    const prevMonth = previousMonthly[0];

    // Get high-risk predictions
    const highRiskCount = await Prediction.countDocuments({
      tenantId,
      type: 'attrition',
      status: 'active',
      'prediction.value': { $gte: 0.7 },
    });

    const summary = {
      workforce: {
        totalEmployees: latestMonthly?.workforce?.totalEmployees || 0,
        change: prevMonth
          ? ((latestMonthly?.workforce?.totalEmployees || 0) - (prevMonth?.workforce?.totalEmployees || 0))
          : 0,
        turnoverRate: latestMonthly?.workforce?.turnoverRate || 0,
        newHires: latestMonthly?.workforce?.newHires || 0,
      },
      attendance: {
        rate: latestDaily?.attendance?.averageAttendanceRate || 0,
        absenteeism: latestMonthly?.attendance?.absenteeismRate || 0,
        averageOvertime: latestMonthly?.attendance?.averageOvertime || 0,
      },
      payroll: {
        total: latestMonthly?.payroll?.totalPayroll || 0,
        change: prevMonth
          ? (((latestMonthly?.payroll?.totalPayroll || 0) - (prevMonth?.payroll?.totalPayroll || 0)) /
             (prevMonth?.payroll?.totalPayroll || 1)) * 100
          : 0,
        averageSalary: latestMonthly?.payroll?.averageSalary || 0,
      },
      performance: {
        averageRating: latestMonthly?.performance?.averageRating || 0,
        reviewsCompleted: latestMonthly?.performance?.reviewsCompleted || 0,
        topPerformers: latestMonthly?.performance?.topPerformers || 0,
      },
      recruitment: {
        openPositions: latestMonthly?.recruitment?.openPositions || 0,
        timeToHire: latestMonthly?.recruitment?.averageTimeToHire || 0,
        conversionRate: latestMonthly?.recruitment?.conversionRate || 0,
      },
      risks: {
        highAttritionRisk: highRiskCount,
        pendingLeaves: latestMonthly?.leave?.pendingRequests || 0,
        pendingReviews: latestMonthly?.performance?.pendingReviews || 0,
      },
      predictions: latestMonthly?.predictions || {},
    };

    res.json({ success: true, data: summary });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
