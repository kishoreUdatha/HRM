import { Router } from 'express';
import {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  executeReport,
  getReportExecutions,
  getEmployeeReport,
  getAttendanceReport,
  getLeaveReport,
  getPayrollReport,
  getRecruitmentReport,
  getPerformanceReport,
  getTrainingReport,
} from '../controllers/reportController';
import {
  createDashboard,
  getDashboards,
  getDashboardById,
  updateDashboard,
  deleteDashboard,
  setDefaultDashboard,
  addWidget,
  updateWidget,
  removeWidget,
  getWidgetData,
  shareDashboard,
  duplicateDashboard,
} from '../controllers/dashboardController';

const router = Router();

// ==================== STANDARD REPORTS ====================
router.get('/standard/employees', getEmployeeReport);
router.get('/standard/attendance', getAttendanceReport);
router.get('/standard/leaves', getLeaveReport);
router.get('/standard/payroll', getPayrollReport);
router.get('/standard/recruitment', getRecruitmentReport);
router.get('/standard/performance', getPerformanceReport);
router.get('/standard/training', getTrainingReport);

// ==================== CUSTOM REPORTS ====================
router.get('/custom', getReports);
router.get('/custom/:id', getReportById);
router.post('/custom', createReport);
router.put('/custom/:id', updateReport);
router.delete('/custom/:id', deleteReport);
router.post('/custom/:id/execute', executeReport);
router.get('/executions', getReportExecutions);

// ==================== DASHBOARDS ====================
router.get('/dashboards', getDashboards);
router.get('/dashboards/:id', getDashboardById);
router.post('/dashboards', createDashboard);
router.put('/dashboards/:id', updateDashboard);
router.delete('/dashboards/:id', deleteDashboard);
router.post('/dashboards/:id/set-default', setDefaultDashboard);
router.post('/dashboards/:id/duplicate', duplicateDashboard);
router.post('/dashboards/:id/share', shareDashboard);

// Widget operations
router.post('/dashboards/:id/widgets', addWidget);
router.put('/dashboards/:id/widgets/:widgetId', updateWidget);
router.delete('/dashboards/:id/widgets/:widgetId', removeWidget);
router.get('/dashboards/:id/widgets/:widgetId/data', getWidgetData);

export default router;
