import mongoose, { Document, Schema } from 'mongoose';

export interface IRewardPoints extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  totalPoints: number;
  availablePoints: number;
  lifetimePoints: number;
  transactions: {
    type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
    points: number;
    description: string;
    referenceType?: string;
    referenceId?: mongoose.Types.ObjectId;
    at: Date;
    by?: mongoose.Types.ObjectId;
  }[];
  level?: { name: string; minPoints: number; maxPoints: number };
  createdAt: Date;
  updatedAt: Date;
}

const rewardPointsSchema = new Schema<IRewardPoints>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, required: true, ref: 'Employee', unique: true },
    totalPoints: { type: Number, default: 0 },
    availablePoints: { type: Number, default: 0 },
    lifetimePoints: { type: Number, default: 0 },
    transactions: [{
      type: { type: String, enum: ['earned', 'redeemed', 'expired', 'adjusted'] },
      points: Number,
      description: String,
      referenceType: String,
      referenceId: Schema.Types.ObjectId,
      at: { type: Date, default: Date.now },
      by: Schema.Types.ObjectId,
    }],
    level: { name: String, minPoints: Number, maxPoints: Number },
  },
  { timestamps: true }
);

rewardPointsSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
export default mongoose.model<IRewardPoints>('RewardPoints', rewardPointsSchema);
