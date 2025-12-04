import mongoose, { Schema, Document } from 'mongoose';

export interface IPayrollAudit extends Document {
  tenantId: string;
  entityType: 'payroll' | 'paystub' | 'salary' | 'loan' | 'reimbursement' | 'bonus' | 'tax_declaration' | 'form16' | 'salary_revision' | 'batch';
  entityId: string;
  action: 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'process' | 'pay' | 'cancel' | 'generate' | 'submit' | 'disburse' | 'close';
  performedBy: string;
  performedByName?: string;
  performedByRole?: string;
  performedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  changes?: Array<{
    field: string;
    previousValue: any;
    newValue: any;
  }>;
  metadata?: {
    employeeId?: string;
    employeeName?: string;
    month?: number;
    year?: number;
    amount?: number;
    batchId?: string;
    reason?: string;
    comments?: string;
  };
  sessionId?: string;
  requestId?: string;
  createdAt: Date;
}

const PayrollAuditSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  entityType: {
    type: String,
    enum: ['payroll', 'paystub', 'salary', 'loan', 'reimbursement', 'bonus', 'tax_declaration', 'form16', 'salary_revision', 'batch'],
    required: true
  },
  entityId: { type: String, required: true, index: true },
  action: {
    type: String,
    enum: ['create', 'update', 'delete', 'approve', 'reject', 'process', 'pay', 'cancel', 'generate', 'submit', 'disburse', 'close'],
    required: true
  },
  performedBy: { type: String, required: true, index: true },
  performedByName: String,
  performedByRole: String,
  performedAt: { type: Date, default: Date.now, index: true },
  ipAddress: String,
  userAgent: String,
  previousState: Schema.Types.Mixed,
  newState: Schema.Types.Mixed,
  changes: [{
    field: String,
    previousValue: Schema.Types.Mixed,
    newValue: Schema.Types.Mixed
  }],
  metadata: {
    employeeId: String,
    employeeName: String,
    month: Number,
    year: Number,
    amount: Number,
    batchId: String,
    reason: String,
    comments: String
  },
  sessionId: String,
  requestId: String
}, { timestamps: { createdAt: true, updatedAt: false } });

PayrollAuditSchema.index({ tenantId: 1, entityType: 1, entityId: 1 });
PayrollAuditSchema.index({ tenantId: 1, performedAt: -1 });
PayrollAuditSchema.index({ tenantId: 1, action: 1, performedAt: -1 });
PayrollAuditSchema.index({ tenantId: 1, 'metadata.employeeId': 1, performedAt: -1 });

export default mongoose.model<IPayrollAudit>('PayrollAudit', PayrollAuditSchema);
