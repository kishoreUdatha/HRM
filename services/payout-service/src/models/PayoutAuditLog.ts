import mongoose, { Document, Schema } from 'mongoose';

export type PayoutAuditAction =
  | 'config_created'
  | 'config_updated'
  | 'fund_account_created'
  | 'fund_account_verified'
  | 'fund_account_failed'
  | 'fund_account_deactivated'
  | 'batch_created'
  | 'batch_approved'
  | 'batch_rejected'
  | 'batch_processing'
  | 'batch_completed'
  | 'batch_failed'
  | 'batch_cancelled'
  | 'payout_created'
  | 'payout_initiated'
  | 'payout_processing'
  | 'payout_completed'
  | 'payout_failed'
  | 'payout_reversed'
  | 'payout_cancelled'
  | 'payout_retry';

export interface IPayoutAuditLog extends Document {
  tenantId: mongoose.Types.ObjectId;
  payoutId?: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  fundAccountId?: mongoose.Types.ObjectId;

  action: PayoutAuditAction;

  performedBy: mongoose.Types.ObjectId;
  performedAt: Date;

  previousStatus?: string;
  newStatus?: string;

  details: Record<string, any>;

  ipAddress?: string;
  userAgent?: string;

  createdAt: Date;
}

const PayoutAuditLogSchema = new Schema<IPayoutAuditLog>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    payoutId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    fundAccountId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    action: {
      type: String,
      required: true,
      enum: [
        'config_created',
        'config_updated',
        'fund_account_created',
        'fund_account_verified',
        'fund_account_failed',
        'fund_account_deactivated',
        'batch_created',
        'batch_approved',
        'batch_rejected',
        'batch_processing',
        'batch_completed',
        'batch_failed',
        'batch_cancelled',
        'payout_created',
        'payout_initiated',
        'payout_processing',
        'payout_completed',
        'payout_failed',
        'payout_reversed',
        'payout_cancelled',
        'payout_retry',
      ],
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    performedAt: {
      type: Date,
      default: Date.now,
    },
    previousStatus: String,
    newStatus: String,
    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
    ipAddress: String,
    userAgent: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes for querying audit logs
PayoutAuditLogSchema.index({ tenantId: 1, action: 1 });
PayoutAuditLogSchema.index({ tenantId: 1, performedAt: -1 });
PayoutAuditLogSchema.index({ tenantId: 1, payoutId: 1 });
PayoutAuditLogSchema.index({ tenantId: 1, batchId: 1 });

export default mongoose.model<IPayoutAuditLog>('PayoutAuditLog', PayoutAuditLogSchema);
