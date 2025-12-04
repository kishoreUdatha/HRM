import mongoose, { Schema, Document } from 'mongoose';

export interface IPointsLedger extends Document {
  tenantId: string;
  employeeId: string;
  balance: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  transactions: Array<{
    id: string;
    type: 'earned' | 'redeemed' | 'expired' | 'adjusted';
    amount: number;
    balance: number;
    source: 'recognition' | 'achievement' | 'milestone' | 'redemption' | 'admin';
    referenceId?: string;
    referenceType?: string;
    description: string;
    createdAt: Date;
    expiresAt?: Date;
  }>;
  achievements: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: Date;
    points: number;
  }>;
  level: {
    current: number;
    name: string;
    pointsToNextLevel: number;
    totalPointsForLevel: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

const TransactionSchema = new Schema({
  id: { type: String, required: true },
  type: { type: String, enum: ['earned', 'redeemed', 'expired', 'adjusted'], required: true },
  amount: { type: Number, required: true },
  balance: { type: Number, required: true },
  source: { type: String, enum: ['recognition', 'achievement', 'milestone', 'redemption', 'admin'], required: true },
  referenceId: String,
  referenceType: String,
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date
}, { _id: false });

const AchievementSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  description: String,
  icon: String,
  earnedAt: { type: Date, default: Date.now },
  points: { type: Number, default: 0 }
}, { _id: false });

const PointsLedgerSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true },
  balance: { type: Number, default: 0 },
  lifetimeEarned: { type: Number, default: 0 },
  lifetimeRedeemed: { type: Number, default: 0 },
  transactions: [TransactionSchema],
  achievements: [AchievementSchema],
  level: {
    current: { type: Number, default: 1 },
    name: { type: String, default: 'Newcomer' },
    pointsToNextLevel: { type: Number, default: 100 },
    totalPointsForLevel: { type: Number, default: 100 }
  }
}, { timestamps: true });

PointsLedgerSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
PointsLedgerSchema.index({ tenantId: 1, balance: -1 });

export default mongoose.model<IPointsLedger>('PointsLedger', PointsLedgerSchema);
