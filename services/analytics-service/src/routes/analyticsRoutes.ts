import { Router } from 'express';
import * as analyticsController from '../controllers/analyticsController';

const router = Router();

// KPI Routes
router.post('/kpis', analyticsController.createKPI);
router.get('/kpis', analyticsController.getKPIs);
router.get('/kpis/defaults', analyticsController.getDefaultKPIs);
router.get('/kpis/:kpiId', analyticsController.getKPI);
router.put('/kpis/:kpiId', analyticsController.updateKPI);
router.delete('/kpis/:kpiId', analyticsController.deleteKPI);

// Dashboard Routes
router.post('/dashboards', analyticsController.createDashboard);
router.get('/dashboards', analyticsController.getDashboards);
router.get('/dashboards/:dashboardId', analyticsController.getDashboard);
router.put('/dashboards/:dashboardId', analyticsController.updateDashboard);
router.delete('/dashboards/:dashboardId', analyticsController.deleteDashboard);

// Analytics Snapshot Routes
router.get('/snapshots', analyticsController.getSnapshots);
router.get('/snapshots/latest', analyticsController.getLatestSnapshot);

// Prediction Routes
router.get('/predictions', analyticsController.getPredictions);
router.get('/predictions/attrition/:employeeId', analyticsController.getEmployeeAttritionRisk);
router.get('/predictions/high-risk', analyticsController.getHighRiskEmployees);

// Trend Analysis Routes
router.get('/trends', analyticsController.getTrendAnalysis);

// Comparison Routes
router.get('/comparison/departments', analyticsController.getDepartmentComparison);

// Executive Summary
router.get('/executive-summary', analyticsController.getExecutiveSummary);

export default router;
