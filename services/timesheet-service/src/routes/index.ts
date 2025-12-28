import { Router } from 'express';
import * as timesheetController from '../controllers/timesheetController';

const router = Router();

// Projects (tenant ID from x-tenant-id header)
router.post('/projects', timesheetController.createProject);
router.get('/projects', timesheetController.getProjects);
router.get('/projects/:id', timesheetController.getProjectById);
router.put('/projects/:id', timesheetController.updateProject);
router.post('/projects/:id/members', timesheetController.addProjectMember);

// Timesheets (tenant ID from x-tenant-id header)
router.get('/', timesheetController.getTimesheets);
router.get('/current', timesheetController.getOrCreateTimesheet);
router.get('/:id', timesheetController.getTimesheetById);
router.post('/:id/entries', timesheetController.addTimesheetEntry);
router.put('/:id/entries/:entryId', timesheetController.updateTimesheetEntry);
router.delete('/:id/entries/:entryId', timesheetController.deleteTimesheetEntry);
router.post('/:id/submit', timesheetController.submitTimesheet);
router.post('/:id/approve', timesheetController.approveTimesheet);
router.post('/:id/reject', timesheetController.rejectTimesheet);

// Time Entries (Timer)
router.post('/time-entries/start', timesheetController.startTimer);
router.post('/time-entries/:id/stop', timesheetController.stopTimer);
router.get('/time-entries', timesheetController.getTimeEntries);

// Reports
router.get('/stats', timesheetController.getTimesheetStats);
router.get('/utilization', timesheetController.getUtilizationReport);

// Generate/Sync from Attendance
router.post('/generate-from-attendance', timesheetController.generateTimesheetsFromAttendance);
router.post('/sync-from-attendance', timesheetController.syncTimesheetsFromAttendance);

export default router;
