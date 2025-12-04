import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getEmployeeStats,
  getNextEmployeeCode,
} from '../controllers/employeeController';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from '../controllers/departmentController';
import { getDashboardStats } from '../controllers/dashboardController';
import {
  createJobPosting,
  getJobPostings,
  getJobPostingById,
  updateJobPosting,
  publishJobPosting,
  closeJobPosting,
  createJobApplication,
  getJobApplications,
  getJobApplicationById,
  updateApplicationStatus,
  scheduleInterview,
  makeOffer,
  getRecruitmentStats,
} from '../controllers/recruitmentController';
import {
  createPerformanceReview,
  getPerformanceReviews,
  getPerformanceReviewById,
  updatePerformanceReview,
  submitSelfReview,
  submitManagerReview,
  acknowledgeReview,
  getEmployeePerformanceHistory,
  getPerformanceStats,
} from '../controllers/performanceController';
import {
  createTraining,
  getTrainings,
  getTrainingById,
  updateTraining,
  deleteTraining,
  enrollEmployee,
  getEnrollments,
  updateEnrollmentProgress,
  completeTraining,
  dropEnrollment,
  getTrainingStats,
} from '../controllers/trainingController';
import {
  uploadDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  uploadNewVersion,
  deleteDocument,
  acknowledgeDocument,
  getEmployeeDocuments,
  getPolicyDocuments,
  getDocumentStats,
} from '../controllers/documentController';
import {
  getOrgChart,
  getDepartmentOrgChart,
  getEmployeeHierarchy,
  getDirectReports,
  updateReportingManager,
  getOrgStats,
} from '../controllers/orgChartController';
import {
  upload,
  downloadTemplate,
  bulkUploadEmployees,
  validateUpload,
} from '../controllers/bulkUploadController';
import {
  getAllShifts,
  getShiftById,
  createShift,
  updateShift,
  deleteShift,
  setDefaultShift,
  getEmployeesByShift,
  bulkAssignShift,
  getShiftStats,
  seedDefaultShifts,
} from '../controllers/shiftController';

const router = Router();

// Validation middleware
const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }
  next();
};

// Employee validation
const employeeValidation = [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('dateOfBirth').notEmpty().withMessage('Date of birth is required'),
  body('gender').isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
  body('departmentId').notEmpty().withMessage('Department is required'),
  body('designation').notEmpty().withMessage('Designation is required'),
  body('joiningDate').notEmpty().withMessage('Joining date is required'),
];

// Department validation
const departmentValidation = [
  body('name').notEmpty().withMessage('Department name is required'),
  body('code').notEmpty().withMessage('Department code is required'),
];

// Dashboard routes
router.get('/dashboard/stats', getDashboardStats);

// Employee routes
router.get('/employees', getAllEmployees);
router.get('/employees/stats', getEmployeeStats);
router.get('/employees/next-code', getNextEmployeeCode);
router.get('/employees/bulk-upload/template', downloadTemplate);
router.post('/employees/bulk-upload', upload.single('file'), bulkUploadEmployees);
router.post('/employees/bulk-upload/validate', upload.single('file'), validateUpload);
router.get('/employees/:id', getEmployeeById);
router.post('/employees', employeeValidation, validate, createEmployee);
router.put('/employees/:id', updateEmployee);
router.delete('/employees/:id', deleteEmployee);

// Department routes
router.get('/departments', getAllDepartments);
router.get('/departments/:id', getDepartmentById);
router.post('/departments', departmentValidation, validate, createDepartment);
router.put('/departments/:id', updateDepartment);
router.delete('/departments/:id', deleteDepartment);

// ==================== RECRUITMENT ROUTES ====================

// Job Posting validation
const jobPostingValidation = [
  body('title').notEmpty().withMessage('Job title is required'),
  body('code').notEmpty().withMessage('Job code is required'),
  body('departmentId').notEmpty().withMessage('Department is required'),
  body('employmentType').isIn(['full_time', 'part_time', 'contract', 'internship']).withMessage('Invalid employment type'),
];

// Job Application validation
const jobApplicationValidation = [
  body('jobPostingId').notEmpty().withMessage('Job posting is required'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
];

// Job Posting routes
router.get('/recruitment/stats', getRecruitmentStats);
router.get('/recruitment/jobs', getJobPostings);
router.get('/recruitment/jobs/:id', getJobPostingById);
router.post('/recruitment/jobs', jobPostingValidation, validate, createJobPosting);
router.put('/recruitment/jobs/:id', updateJobPosting);
router.post('/recruitment/jobs/:id/publish', publishJobPosting);
router.post('/recruitment/jobs/:id/close', closeJobPosting);

// Job Application routes
router.get('/recruitment/applications', getJobApplications);
router.get('/recruitment/applications/:id', getJobApplicationById);
router.post('/recruitment/applications', jobApplicationValidation, validate, createJobApplication);
router.put('/recruitment/applications/:id/status', updateApplicationStatus);
router.post('/recruitment/applications/:id/schedule-interview', scheduleInterview);
router.post('/recruitment/applications/:id/make-offer', makeOffer);

// ==================== PERFORMANCE ROUTES ====================

// Performance Review validation
const performanceReviewValidation = [
  body('employeeId').notEmpty().withMessage('Employee is required'),
  body('period.startDate').notEmpty().withMessage('Period start date is required'),
  body('period.endDate').notEmpty().withMessage('Period end date is required'),
  body('type').isIn(['annual', 'quarterly', 'probation', 'mid_year', 'project']).withMessage('Invalid review type'),
];

// Performance Review routes
router.get('/performance/stats', getPerformanceStats);
router.get('/performance/reviews', getPerformanceReviews);
router.get('/performance/reviews/:id', getPerformanceReviewById);
router.post('/performance/reviews', performanceReviewValidation, validate, createPerformanceReview);
router.put('/performance/reviews/:id', updatePerformanceReview);
router.post('/performance/reviews/:id/self-review', submitSelfReview);
router.post('/performance/reviews/:id/manager-review', submitManagerReview);
router.post('/performance/reviews/:id/acknowledge', acknowledgeReview);
router.get('/performance/employees/:employeeId/history', getEmployeePerformanceHistory);

// ==================== TRAINING ROUTES ====================

// Training validation
const trainingValidation = [
  body('title').notEmpty().withMessage('Training title is required'),
  body('code').notEmpty().withMessage('Training code is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('duration').isNumeric().withMessage('Duration is required'),
];

// Training routes
router.get('/training/stats', getTrainingStats);
router.get('/training/programs', getTrainings);
router.get('/training/programs/:id', getTrainingById);
router.post('/training/programs', trainingValidation, validate, createTraining);
router.put('/training/programs/:id', updateTraining);
router.delete('/training/programs/:id', deleteTraining);

// Enrollment routes
router.get('/training/enrollments', getEnrollments);
router.post('/training/enrollments', enrollEmployee);
router.put('/training/enrollments/:id/progress', updateEnrollmentProgress);
router.post('/training/enrollments/:id/complete', completeTraining);
router.post('/training/enrollments/:id/drop', dropEnrollment);

// ==================== DOCUMENT ROUTES ====================

// Document validation
const documentValidation = [
  body('name').notEmpty().withMessage('Document name is required'),
  body('type').notEmpty().withMessage('Document type is required'),
  body('fileUrl').notEmpty().withMessage('File URL is required'),
  body('fileSize').isNumeric().withMessage('File size is required'),
  body('mimeType').notEmpty().withMessage('MIME type is required'),
];

// Document routes
router.get('/documents/stats', getDocumentStats);
router.get('/documents/policies', getPolicyDocuments);
router.get('/documents', getDocuments);
router.get('/documents/:id', getDocumentById);
router.post('/documents', documentValidation, validate, uploadDocument);
router.put('/documents/:id', updateDocument);
router.post('/documents/:id/new-version', uploadNewVersion);
router.delete('/documents/:id', deleteDocument);
router.post('/documents/:id/acknowledge', acknowledgeDocument);
router.get('/documents/employee/:employeeId', getEmployeeDocuments);

// ==================== ORGANIZATION CHART ROUTES ====================
router.get('/org-chart', getOrgChart);
router.get('/org-chart/departments', getDepartmentOrgChart);
router.get('/org-chart/stats', getOrgStats);
router.get('/org-chart/employees/:id/hierarchy', getEmployeeHierarchy);
router.get('/org-chart/employees/:id/direct-reports', getDirectReports);
router.put('/org-chart/employees/:id/manager', updateReportingManager);

// ==================== SHIFT ROUTES ====================

// Shift validation
const shiftValidation = [
  body('name').notEmpty().withMessage('Shift name is required'),
  body('code').notEmpty().withMessage('Shift code is required'),
  body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Start time must be in HH:mm format'),
  body('endTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('End time must be in HH:mm format'),
];

// Shift routes
router.get('/shifts', getAllShifts);
router.get('/shifts/stats', getShiftStats);
router.post('/shifts/seed', seedDefaultShifts);
router.get('/shifts/:id', getShiftById);
router.get('/shifts/:id/employees', getEmployeesByShift);
router.post('/shifts', shiftValidation, validate, createShift);
router.put('/shifts/:id', updateShift);
router.delete('/shifts/:id', deleteShift);
router.post('/shifts/:id/set-default', setDefaultShift);
router.post('/shifts/bulk-assign', bulkAssignShift);

export default router;
