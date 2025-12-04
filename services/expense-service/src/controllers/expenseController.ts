import { Request, Response } from 'express';
import Expense from '../models/Expense';
import ExpenseReport from '../models/ExpenseReport';
import ExpenseCategory from '../models/ExpenseCategory';
import TravelRequest from '../models/TravelRequest';
import mongoose from 'mongoose';

// Helper to generate report number
const generateReportNumber = async (tenantId: string, prefix: string = 'EXP'): Promise<string> => {
  const count = await ExpenseReport.countDocuments({ tenantId });
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
};

const generateTravelNumber = async (tenantId: string): Promise<string> => {
  const count = await TravelRequest.countDocuments({ tenantId });
  const year = new Date().getFullYear();
  return `TR-${year}-${String(count + 1).padStart(5, '0')}`;
};

// Category Controllers
export const createCategory = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const category = new ExpenseCategory({
      ...req.body,
      tenantId,
      createdBy: req.body.userId,
    });
    await category.save();
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getCategories = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { isActive } = req.query;

    const query: any = { tenantId };
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const categories = await ExpenseCategory.find(query).sort({ name: 1 });
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const category = await ExpenseCategory.findOneAndUpdate(
      { _id: id, tenantId },
      req.body,
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.json({ success: true, data: category });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Expense Controllers
export const createExpense = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;

    // Check policy violations
    const category = await ExpenseCategory.findById(req.body.categoryId);
    const policyViolations: any[] = [];

    if (category) {
      if (category.policy.maxAmount && req.body.amount > category.policy.maxAmount) {
        policyViolations.push({
          type: 'amount_exceeded',
          description: `Amount exceeds maximum limit of ${category.policy.maxAmount}`,
          severity: 'violation',
        });
      }
      if (category.policy.requiresReceipt && req.body.amount > category.policy.receiptThreshold && (!req.body.receipts || req.body.receipts.length === 0)) {
        policyViolations.push({
          type: 'receipt_missing',
          description: `Receipt required for amounts over ${category.policy.receiptThreshold}`,
          severity: 'warning',
        });
      }
    }

    const expense = new Expense({
      ...req.body,
      tenantId,
      policyViolations,
    });

    await expense.save();
    res.status(201).json({ success: true, data: expense });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, status, categoryId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;
    if (categoryId) query.categoryId = categoryId;
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [expenses, total] = await Promise.all([
      Expense.find(query)
        .populate('employeeId', 'firstName lastName email')
        .populate('categoryId', 'name code')
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Expense.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: expenses,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpenseById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const expense = await Expense.findOne({ _id: id, tenantId })
      .populate('employeeId')
      .populate('categoryId');

    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.json({ success: true, data: expense });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const expense = await Expense.findOneAndUpdate(
      { _id: id, tenantId, status: 'draft' },
      req.body,
      { new: true }
    );
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found or not editable' });
    }
    res.json({ success: true, data: expense });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const expense = await Expense.findOneAndDelete({ _id: id, tenantId, status: 'draft' });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found or not deletable' });
    }
    res.json({ success: true, message: 'Expense deleted' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const uploadReceipt = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { url, fileName } = req.body;

    const expense = await Expense.findOne({ _id: id, tenantId });
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    expense.receipts.push({
      url,
      fileName,
      uploadedAt: new Date(),
    });

    await expense.save();
    res.json({ success: true, data: expense });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Expense Report Controllers
export const createExpenseReport = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const reportNumber = await generateReportNumber(tenantId);

    const report = new ExpenseReport({
      ...req.body,
      tenantId,
      reportNumber,
    });

    await report.save();

    // Update expenses to link to this report
    if (req.body.expenses && req.body.expenses.length > 0) {
      await Expense.updateMany(
        { _id: { $in: req.body.expenses }, tenantId },
        { expenseReportId: report._id }
      );
    }

    res.status(201).json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpenseReports = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, status, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [reports, total] = await Promise.all([
      ExpenseReport.find(query)
        .populate('employeeId', 'firstName lastName email')
        .populate('expenses')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      ExpenseReport.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: reports,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getExpenseReportById = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const report = await ExpenseReport.findOne({ _id: id, tenantId })
      .populate('employeeId')
      .populate({
        path: 'expenses',
        populate: { path: 'categoryId' },
      });

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const submitExpenseReport = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;

    const report = await ExpenseReport.findOne({ _id: id, tenantId }).populate('expenses');
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // Calculate total
    const expenses = await Expense.find({ expenseReportId: id });
    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

    report.totalAmount = totalAmount;
    report.status = 'submitted';
    report.submittedAt = new Date();

    // Update expense statuses
    await Expense.updateMany(
      { expenseReportId: id },
      {
        status: 'submitted',
        $push: {
          approvalHistory: {
            action: 'submitted',
            by: req.body.userId,
            at: new Date(),
          },
        },
      }
    );

    await report.save();
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveExpenseReport = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { approvedBy, comments, approvedAmount } = req.body;

    const report = await ExpenseReport.findOne({ _id: id, tenantId });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = 'approved';
    report.approvedAt = new Date();
    report.approvedAmount = approvedAmount || report.totalAmount;

    // Update expenses
    await Expense.updateMany(
      { expenseReportId: id },
      {
        status: 'approved',
        $push: {
          approvalHistory: {
            action: 'approved',
            by: approvedBy,
            at: new Date(),
            comments,
          },
        },
      }
    );

    await report.save();
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const rejectExpenseReport = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { rejectedBy, reason } = req.body;

    const report = await ExpenseReport.findOne({ _id: id, tenantId });
    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    report.status = 'rejected';

    // Update expenses
    await Expense.updateMany(
      { expenseReportId: id },
      {
        status: 'rejected',
        $push: {
          approvalHistory: {
            action: 'rejected',
            by: rejectedBy,
            at: new Date(),
            comments: reason,
          },
        },
      }
    );

    await report.save();
    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const processReimbursement = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { paymentDetails } = req.body;

    const report = await ExpenseReport.findOneAndUpdate(
      { _id: id, tenantId, status: 'approved' },
      {
        status: 'paid',
        paidAt: new Date(),
        paymentDetails,
      },
      { new: true }
    );

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found or not approved' });
    }

    // Update expenses
    await Expense.updateMany(
      { expenseReportId: id },
      {
        status: 'reimbursed',
        reimbursement: {
          date: new Date(),
          amount: paymentDetails.amount,
          reference: paymentDetails.reference,
          method: paymentDetails.method,
        },
      }
    );

    res.json({ success: true, data: report });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Travel Request Controllers
export const createTravelRequest = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const requestNumber = await generateTravelNumber(tenantId);

    const request = new TravelRequest({
      ...req.body,
      tenantId,
      requestNumber,
    });

    await request.save();
    res.status(201).json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getTravelRequests = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { employeeId, status, page = 1, limit = 20 } = req.query;

    const query: any = { tenantId };
    if (employeeId) query.employeeId = employeeId;
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [requests, total] = await Promise.all([
      TravelRequest.find(query)
        .populate('employeeId', 'firstName lastName email')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      TravelRequest.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveTravelRequest = async (req: Request, res: Response) => {
  try {
    const { tenantId, id } = req.params;
    const { approvedBy, comments } = req.body;

    const request = await TravelRequest.findOneAndUpdate(
      { _id: id, tenantId },
      {
        status: 'approved',
        approvedAt: new Date(),
        $push: {
          approvalWorkflow: {
            level: 1,
            approverId: approvedBy,
            status: 'approved',
            actionDate: new Date(),
            comments,
          },
        },
      },
      { new: true }
    );

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    res.json({ success: true, data: request });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Stats
export const getExpenseStats = async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate && endDate) {
      dateFilter.date = {
        $gte: new Date(startDate as string),
        $lte: new Date(endDate as string),
      };
    }

    const expensesByCategory = await Expense.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          status: { $in: ['approved', 'reimbursed'] },
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: '$categoryId',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'expensecategories',
          localField: '_id',
          foreignField: '_id',
          as: 'category',
        },
      },
      { $unwind: '$category' },
      {
        $project: {
          categoryName: '$category.name',
          totalAmount: 1,
          count: 1,
        },
      },
    ]);

    const totalPending = await ExpenseReport.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          status: { $in: ['submitted', 'under_review'] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalReimbursed = await ExpenseReport.aggregate([
      {
        $match: {
          tenantId: new mongoose.Types.ObjectId(tenantId),
          status: 'paid',
          ...dateFilter,
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$approvedAmount' },
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        expensesByCategory,
        pendingApproval: totalPending[0] || { total: 0, count: 0 },
        reimbursed: totalReimbursed[0] || { total: 0, count: 0 },
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
};
