import { Router } from 'express';
import { body, query } from 'express-validator';
import * as leaveRequestController from '../controllers/leaveRequestController';
import * as leaveTypeController from '../controllers/leaveTypeController';
import * as holidayController from '../controllers/holidayController';
import * as shiftController from '../controllers/shiftController';

const router = Router();

// ==================== LEAVE REQUEST ROUTES ====================

// Create leave request
router.post(
  '/requests',
  [
    body('leaveTypeId').notEmpty().withMessage('Leave type is required'),
    body('startDate').isISO8601().withMessage('Valid start date is required'),
    body('endDate').isISO8601().withMessage('Valid end date is required'),
    body('reason').notEmpty().trim().withMessage('Reason is required'),
  ],
  leaveRequestController.createLeaveRequest
);

// Get leave requests
router.get(
  '/requests',
  [
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 }),
  ],
  leaveRequestController.getLeaveRequests
);

// Get leave request by ID
router.get('/requests/:id', leaveRequestController.getLeaveRequestById);

// Approve leave request
router.patch('/requests/:id/approve', leaveRequestController.approveLeaveRequest);

// Reject leave request
router.patch(
  '/requests/:id/reject',
  [body('reason').optional().trim()],
  leaveRequestController.rejectLeaveRequest
);

// Cancel leave request
router.patch('/requests/:id/cancel', leaveRequestController.cancelLeaveRequest);

// ==================== LEAVE BALANCE ROUTES ====================

// Get leave balance
router.get('/balance/:employeeId', leaveRequestController.getLeaveBalance);

// Initialize leave balance
router.post('/balance/initialize', leaveRequestController.initializeLeaveBalance);

// ==================== LEAVE TYPE ROUTES ====================

// Create leave type
router.post(
  '/types',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('code').notEmpty().trim().withMessage('Code is required'),
    body('defaultDays').isInt({ min: 0 }).withMessage('Default days must be a positive number'),
  ],
  leaveTypeController.createLeaveType
);

// Get all leave types
router.get('/types', leaveTypeController.getLeaveTypes);

// Seed default leave types
router.post('/types/seed', leaveTypeController.seedLeaveTypes);

// Get leave type by ID
router.get('/types/:id', leaveTypeController.getLeaveTypeById);

// Update leave type
router.put('/types/:id', leaveTypeController.updateLeaveType);

// Delete leave type
router.delete('/types/:id', leaveTypeController.deleteLeaveType);

// ==================== HOLIDAY ROUTES ====================

// Create holiday
router.post(
  '/holidays',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('date').isISO8601().withMessage('Valid date is required'),
  ],
  holidayController.createHoliday
);

// Get holidays
router.get('/holidays', holidayController.getHolidays);

// Bulk create holidays
router.post('/holidays/bulk', holidayController.bulkCreateHolidays);

// Check if date is holiday
router.get('/holidays/check/:date', holidayController.isHoliday);

// Get holiday by ID
router.get('/holidays/:id', holidayController.getHolidayById);

// Update holiday
router.put('/holidays/:id', holidayController.updateHoliday);

// Delete holiday
router.delete('/holidays/:id', holidayController.deleteHoliday);

// ==================== SHIFT ROUTES ====================

// Shift management
router.post('/shifts', shiftController.createShift);
router.get('/shifts', shiftController.getShifts);
router.put('/shifts/:id', shiftController.updateShift);

// Shift assignments
router.post('/shifts/assign', shiftController.assignShift);
router.post('/shifts/assign/bulk', shiftController.bulkAssignShifts);
router.get('/shifts/schedule', shiftController.getShiftSchedule);
router.get('/shifts/schedule/:employeeId', shiftController.getEmployeeSchedule);

// ==================== SHIFT SWAP ROUTES ====================

// Swap requests
router.post('/shifts/swap', shiftController.createSwapRequest);
router.get('/shifts/swap', shiftController.getSwapRequests);
router.get('/shifts/swap/open', shiftController.getOpenSwapRequests);
router.get('/shifts/swap/employee/:employeeId', shiftController.getMyPendingSwaps);

// Swap actions
router.post('/shifts/swap/:id/respond', shiftController.respondToSwapRequest);
router.post('/shifts/swap/:id/interest', shiftController.expressInterest);
router.post('/shifts/swap/:id/select', shiftController.selectInterest);
router.post('/shifts/swap/:id/approve', shiftController.approveSwapRequest);
router.post('/shifts/swap/:id/reject', shiftController.rejectSwapRequest);
router.post('/shifts/swap/:id/cancel', shiftController.cancelSwapRequest);

export default router;
