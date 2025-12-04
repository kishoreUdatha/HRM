import { Router } from 'express';
import { body, query } from 'express-validator';
import * as attendanceController from '../controllers/attendanceController';
import * as shiftController from '../controllers/shiftController';

const router = Router();

// ==================== ATTENDANCE ROUTES ====================

// Check in
router.post(
  '/check-in',
  [
    body('location.latitude').optional().isFloat(),
    body('location.longitude').optional().isFloat(),
  ],
  attendanceController.checkIn
);

// Check out
router.post(
  '/check-out',
  [
    body('location.latitude').optional().isFloat(),
    body('location.longitude').optional().isFloat(),
  ],
  attendanceController.checkOut
);

// Get attendance records
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  attendanceController.getAttendance
);

// Get today's status for an employee
router.get('/today/:employeeId', attendanceController.getTodayStatus);

// Get attendance summary
router.get(
  '/summary',
  [
    query('month').isInt({ min: 1, max: 12 }),
    query('year').isInt({ min: 2000 }),
  ],
  attendanceController.getAttendanceSummary
);

// Mark attendance (admin)
router.post(
  '/mark',
  [
    body('employeeId').notEmpty().withMessage('Employee ID is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
    body('status').isIn(['present', 'absent', 'late', 'half_day', 'on_leave', 'holiday', 'weekend']),
  ],
  attendanceController.markAttendance
);

// Bulk mark attendance
router.post('/bulk-mark', attendanceController.bulkMarkAttendance);

// ==================== SHIFT ROUTES ====================

// Create shift
router.post(
  '/shifts',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('code').notEmpty().trim().withMessage('Code is required'),
    body('startTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid start time required (HH:mm)'),
    body('endTime').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Valid end time required (HH:mm)'),
  ],
  shiftController.createShift
);

// Get all shifts
router.get('/shifts', shiftController.getShifts);

// Get shift by ID
router.get('/shifts/:id', shiftController.getShiftById);

// Update shift
router.put('/shifts/:id', shiftController.updateShift);

// Delete shift
router.delete('/shifts/:id', shiftController.deleteShift);

export default router;
