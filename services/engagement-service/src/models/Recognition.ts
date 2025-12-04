import mongoose, { Document, Schema } from 'mongoose';

export interface IRecognition extends Document {
  tenantId: mongoose.Types.ObjectId;
  fromEmployeeId: mongoose.Types.ObjectId;
  toEmployeeId: mongoose.Types.ObjectId;
  type: 'kudos' | 'appreciation' | 'achievement' | 'milestone' | 'peer_award' | 'manager_award';
  category?: string;
  title: string;
  message: string;
  values?: string[];
  points: number;
  isPublic: boolean;
  reactions: { employeeId: mongoose.Types.ObjectId; type: string; at: Date }[];
  comments: { employeeId: mongoose.Types.ObjectId; text: string; at: Date }[];
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const recognitionSchema = new Schema<IRecognition>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    fromEmployeeId: { type: Schema.Types.ObjectId, required: true, ref: 'Employee' },
    toEmployeeId: { type: Schema.Types.ObjectId, required: true, ref: 'Employee' },
    type: { type: String, enum: ['kudos', 'appreciation', 'achievement', 'milestone', 'peer_award', 'manager_award'], required: true },
    category: String,
    title: { type: String, required: true },
    message: { type: String, required: true },
    values: [String],
    points: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
    reactions: [{ employeeId: Schema.Types.ObjectId, type: String, at: Date }],
    comments: [{ employeeId: Schema.Types.ObjectId, text: String, at: Date }],
    approvedBy: Schema.Types.ObjectId,
    approvedAt: Date,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  },
  { timestamps: true }
);

recognitionSchema.index({ tenantId: 1, toEmployeeId: 1 });
recognitionSchema.index({ tenantId: 1, fromEmployeeId: 1 });
recognitionSchema.index({ tenantId: 1, createdAt: -1 });
export default mongoose.model<IRecognition>('Recognition', recognitionSchema);
