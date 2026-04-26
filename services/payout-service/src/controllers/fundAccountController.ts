import { Request, Response } from 'express';
import mongoose from 'mongoose';
import EmployeeFundAccount from '../models/EmployeeFundAccount';
import PayoutAuditLog from '../models/PayoutAuditLog';
import razorpayPayoutService from '../services/razorpayPayoutService';
import { hash, maskAccountNumber } from '../utils/encryption';
import axios from 'axios';

/**
 * Create fund account for an employee
 */
export const createFundAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const { employeeId, bankName, accountNumber, ifscCode, accountHolderName, accountType, email, phone } = req.body;

    if (!employeeId || !bankName || !accountNumber || !ifscCode || !accountHolderName) {
      res.status(400).json({
        success: false,
        message: 'Employee ID, bank name, account number, IFSC code, and account holder name are required',
      });
      return;
    }

    // Check if active fund account already exists
    const existingAccount = await EmployeeFundAccount.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      employeeId: new mongoose.Types.ObjectId(employeeId),
      isActive: true,
    });

    if (existingAccount) {
      res.status(400).json({
        success: false,
        message: 'Active fund account already exists for this employee. Deactivate it first.',
      });
      return;
    }

    // Create contact in Razorpay
    const contact = await razorpayPayoutService.createContact(tenantId, {
      name: accountHolderName,
      email: email || '',
      phone: phone || '',
      referenceId: employeeId,
      notes: { tenantId, employeeId },
    });

    // Create fund account in Razorpay
    const razorpayFundAccount = await razorpayPayoutService.createFundAccount(tenantId, {
      contactId: contact.id,
      accountHolderName,
      accountNumber,
      ifscCode,
    });

    // Save fund account locally
    const fundAccount = new EmployeeFundAccount({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      employeeId: new mongoose.Types.ObjectId(employeeId),
      razorpayContactId: contact.id,
      razorpayFundAccountId: razorpayFundAccount.id,
      bankName,
      accountNumber: maskAccountNumber(accountNumber),
      accountNumberHash: hash(accountNumber),
      ifscCode,
      accountHolderName,
      accountType: accountType || 'savings',
      verificationStatus: 'pending',
      isActive: true,
    });

    await fundAccount.save();

    // Create audit log
    await PayoutAuditLog.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      fundAccountId: fundAccount._id,
      action: 'fund_account_created',
      performedBy: new mongoose.Types.ObjectId(userId),
      newStatus: 'pending',
      details: {
        employeeId,
        bankName,
        maskedAccountNumber: fundAccount.accountNumber,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Fund account created successfully',
      data: {
        _id: fundAccount._id,
        employeeId: fundAccount.employeeId,
        bankName: fundAccount.bankName,
        accountNumber: fundAccount.accountNumber,
        ifscCode: fundAccount.ifscCode,
        accountHolderName: fundAccount.accountHolderName,
        verificationStatus: fundAccount.verificationStatus,
      },
    });
  } catch (error: any) {
    console.error('Error creating fund account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get fund account by employee ID
 */
export const getFundAccountByEmployee = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const employeeId = String(req.params.employeeId || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const fundAccount = await EmployeeFundAccount.findOne({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      employeeId: new mongoose.Types.ObjectId(employeeId),
      isActive: true,
    });

    if (!fundAccount) {
      res.status(404).json({ success: false, message: 'Fund account not found' });
      return;
    }

    res.json({ success: true, data: fundAccount });
  } catch (error: any) {
    console.error('Error fetching fund account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * List all fund accounts for tenant
 */
export const listFundAccounts = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const { page = 1, limit = 20, status, search } = req.query;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const query: any = { tenantId: new mongoose.Types.ObjectId(tenantId), isActive: true };

    if (status) {
      query.verificationStatus = status;
    }

    if (search) {
      query.$or = [
        { accountHolderName: { $regex: search, $options: 'i' } },
        { bankName: { $regex: search, $options: 'i' } },
        { ifscCode: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [fundAccounts, total] = await Promise.all([
      EmployeeFundAccount.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      EmployeeFundAccount.countDocuments(query),
    ]);

    res.json({
      success: true,
      data: {
        fundAccounts,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error listing fund accounts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Trigger bank account verification (penny drop)
 */
export const verifyFundAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');
    const id = String(req.params.id || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const fundAccount = await EmployeeFundAccount.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!fundAccount) {
      res.status(404).json({ success: false, message: 'Fund account not found' });
      return;
    }

    if (fundAccount.verificationStatus === 'verified') {
      res.status(400).json({ success: false, message: 'Fund account is already verified' });
      return;
    }

    // Trigger validation via Razorpay
    const validation = await razorpayPayoutService.validateFundAccount(
      tenantId,
      fundAccount.razorpayFundAccountId
    );

    fundAccount.verificationDetails = {
      method: 'penny_drop',
      transactionId: validation.id,
    };

    // Razorpay validation is async, status will be updated via webhook
    await fundAccount.save();

    res.json({
      success: true,
      message: 'Verification initiated. Status will be updated shortly.',
      data: {
        validationId: validation.id,
        status: validation.status,
      },
    });
  } catch (error: any) {
    console.error('Error verifying fund account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Deactivate fund account
 */
export const deactivateFundAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');
    const id = String(req.params.id || '');
    const { reason } = req.body;

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    const fundAccount = await EmployeeFundAccount.findOne({
      _id: id,
      tenantId: new mongoose.Types.ObjectId(tenantId),
    });

    if (!fundAccount) {
      res.status(404).json({ success: false, message: 'Fund account not found' });
      return;
    }

    fundAccount.isActive = false;
    fundAccount.deactivatedAt = new Date();
    fundAccount.deactivationReason = reason || 'Manually deactivated';

    await fundAccount.save();

    // Create audit log
    await PayoutAuditLog.create({
      tenantId: new mongoose.Types.ObjectId(tenantId),
      fundAccountId: fundAccount._id,
      action: 'fund_account_deactivated',
      performedBy: new mongoose.Types.ObjectId(userId),
      details: { reason },
    });

    res.json({
      success: true,
      message: 'Fund account deactivated successfully',
    });
  } catch (error: any) {
    console.error('Error deactivating fund account:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Sync fund accounts from employee bank details
 */
export const syncFromEmployees = async (req: Request, res: Response): Promise<void> => {
  try {
    const tenantId = String(req.headers['x-tenant-id'] || '');
    const userId = String(req.headers['x-user-id'] || '');

    if (!tenantId) {
      res.status(400).json({ success: false, message: 'Tenant ID is required' });
      return;
    }

    // Fetch employees with bank details from employee service
    const employeeServiceUrl = process.env.EMPLOYEE_SERVICE_URL || 'http://localhost:3003';
    const response = await axios.get(`${employeeServiceUrl}/api/employees`, {
      headers: { 'x-tenant-id': tenantId },
      params: { limit: 1000 },
    });

    const employees = response.data.data?.employees || [];

    let created = 0;
    let skipped = 0;
    let errors: string[] = [];

    for (const employee of employees) {
      if (!employee.bankDetails?.accountNumber || !employee.bankDetails?.ifscCode) {
        skipped++;
        continue;
      }

      try {
        // Check if fund account already exists
        const existing = await EmployeeFundAccount.findOne({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          employeeId: new mongoose.Types.ObjectId(employee._id),
          isActive: true,
        });

        if (existing) {
          // Check if bank details have changed
          const newHash = hash(employee.bankDetails.accountNumber);
          if (existing.accountNumberHash === newHash) {
            skipped++;
            continue;
          }

          // Deactivate old account
          existing.isActive = false;
          existing.deactivatedAt = new Date();
          existing.deactivationReason = 'Bank details updated';
          await existing.save();
        }

        // Create contact in Razorpay
        const contact = await razorpayPayoutService.createContact(tenantId, {
          name: employee.bankDetails.accountHolderName || `${employee.firstName} ${employee.lastName}`,
          email: employee.email || '',
          phone: employee.phone || '',
          referenceId: employee._id,
        });

        // Create fund account in Razorpay
        const razorpayFundAccount = await razorpayPayoutService.createFundAccount(tenantId, {
          contactId: contact.id,
          accountHolderName: employee.bankDetails.accountHolderName || `${employee.firstName} ${employee.lastName}`,
          accountNumber: employee.bankDetails.accountNumber,
          ifscCode: employee.bankDetails.ifscCode,
        });

        // Save locally
        const fundAccount = new EmployeeFundAccount({
          tenantId: new mongoose.Types.ObjectId(tenantId),
          employeeId: new mongoose.Types.ObjectId(employee._id),
          razorpayContactId: contact.id,
          razorpayFundAccountId: razorpayFundAccount.id,
          bankName: employee.bankDetails.bankName || 'Unknown',
          accountNumber: maskAccountNumber(employee.bankDetails.accountNumber),
          accountNumberHash: hash(employee.bankDetails.accountNumber),
          ifscCode: employee.bankDetails.ifscCode,
          accountHolderName: employee.bankDetails.accountHolderName || `${employee.firstName} ${employee.lastName}`,
          accountType: 'savings',
          verificationStatus: 'pending',
          isActive: true,
        });

        await fundAccount.save();
        created++;

      } catch (error: any) {
        errors.push(`${employee.firstName} ${employee.lastName}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      message: `Sync completed. Created: ${created}, Skipped: ${skipped}, Errors: ${errors.length}`,
      data: {
        created,
        skipped,
        errors: errors.slice(0, 10), // Show first 10 errors
      },
    });
  } catch (error: any) {
    console.error('Error syncing fund accounts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
