import { Router } from 'express';
import * as expenseController from '../controllers/expenseController';

const router = Router();

// Categories
router.post('/:tenantId/categories', expenseController.createCategory);
router.get('/:tenantId/categories', expenseController.getCategories);
router.put('/:tenantId/categories/:id', expenseController.updateCategory);

// Expenses
router.post('/:tenantId/expenses', expenseController.createExpense);
router.get('/:tenantId/expenses', expenseController.getExpenses);
router.get('/:tenantId/expenses/:id', expenseController.getExpenseById);
router.put('/:tenantId/expenses/:id', expenseController.updateExpense);
router.delete('/:tenantId/expenses/:id', expenseController.deleteExpense);
router.post('/:tenantId/expenses/:id/receipts', expenseController.uploadReceipt);

// Expense Reports
router.post('/:tenantId/expense-reports', expenseController.createExpenseReport);
router.get('/:tenantId/expense-reports', expenseController.getExpenseReports);
router.get('/:tenantId/expense-reports/:id', expenseController.getExpenseReportById);
router.post('/:tenantId/expense-reports/:id/submit', expenseController.submitExpenseReport);
router.post('/:tenantId/expense-reports/:id/approve', expenseController.approveExpenseReport);
router.post('/:tenantId/expense-reports/:id/reject', expenseController.rejectExpenseReport);
router.post('/:tenantId/expense-reports/:id/reimburse', expenseController.processReimbursement);

// Travel Requests
router.post('/:tenantId/travel-requests', expenseController.createTravelRequest);
router.get('/:tenantId/travel-requests', expenseController.getTravelRequests);
router.post('/:tenantId/travel-requests/:id/approve', expenseController.approveTravelRequest);

// Stats
router.get('/:tenantId/stats', expenseController.getExpenseStats);

export default router;
