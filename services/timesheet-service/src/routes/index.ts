import { Router } from 'express';
import * as timesheetController from '../controllers/timesheetController';

const router = Router();

// Projects
router.post('/:tenantId/projects', timesheetController.createProject);
router.get('/:tenantId/projects', timesheetController.getProjects);
router.get('/:tenantId/projects/:id', timesheetController.getProjectById);
router.put('/:tenantId/projects/:id', timesheetController.updateProject);
router.post('/:tenantId/projects/:id/members', timesheetController.addProjectMember);

// Timesheets
router.get('/:tenantId/timesheets', timesheetController.getTimesheets);
router.get('/:tenantId/timesheets/current', timesheetController.getOrCreateTimesheet);
router.get('/:tenantId/timesheets/:id', timesheetController.getTimesheetById);
router.post('/:tenantId/timesheets/:id/entries', timesheetController.addTimesheetEntry);
router.put('/:tenantId/timesheets/:id/entries/:entryId', timesheetController.updateTimesheetEntry);
router.delete('/:tenantId/timesheets/:id/entries/:entryId', timesheetController.deleteTimesheetEntry);
router.post('/:tenantId/timesheets/:id/submit', timesheetController.submitTimesheet);
router.post('/:tenantId/timesheets/:id/approve', timesheetController.approveTimesheet);
router.post('/:tenantId/timesheets/:id/reject', timesheetController.rejectTimesheet);

// Time Entries (Timer)
router.post('/:tenantId/time-entries/start', timesheetController.startTimer);
router.post('/:tenantId/time-entries/:id/stop', timesheetController.stopTimer);
router.get('/:tenantId/time-entries', timesheetController.getTimeEntries);

// Reports
router.get('/:tenantId/stats', timesheetController.getTimesheetStats);
router.get('/:tenantId/utilization', timesheetController.getUtilizationReport);

export default router;
