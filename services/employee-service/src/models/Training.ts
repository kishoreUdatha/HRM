import mongoose, { Document, Schema } from 'mongoose';

export interface ITraining extends Document {
  tenantId: mongoose.Types.ObjectId;
  title: string;
  code: string;
  description: string;
  category: 'technical' | 'soft_skills' | 'compliance' | 'leadership' | 'safety' | 'product' | 'other';
  type: 'online' | 'classroom' | 'workshop' | 'webinar' | 'self_paced';
  instructor?: string;
  instructorType: 'internal' | 'external';
  duration: number; // in hours
  maxParticipants?: number;
  startDate?: Date;
  endDate?: Date;
  location?: string;
  meetingLink?: string;
  materials?: {
    title: string;
    url: string;
    type: 'pdf' | 'video' | 'link' | 'document';
  }[];
  prerequisites?: string[];
  objectives?: string[];
  targetAudience?: string[];
  departmentIds?: mongoose.Types.ObjectId[];
  isMandatory: boolean;
  cost?: number;
  currency?: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdBy: mongoose.Types.ObjectId;
  enrollmentCount: number;
  completionCount: number;
  averageRating?: number;
  createdAt: Date;
  updatedAt: Date;
}

const trainingSchema = new Schema<ITraining>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ['technical', 'soft_skills', 'compliance', 'leadership', 'safety', 'product', 'other'],
      default: 'technical',
    },
    type: {
      type: String,
      enum: ['online', 'classroom', 'workshop', 'webinar', 'self_paced'],
      default: 'online',
    },
    instructor: String,
    instructorType: {
      type: String,
      enum: ['internal', 'external'],
      default: 'internal',
    },
    duration: {
      type: Number,
      required: true,
    },
    maxParticipants: Number,
    startDate: Date,
    endDate: Date,
    location: String,
    meetingLink: String,
    materials: [{
      title: String,
      url: String,
      type: { type: String, enum: ['pdf', 'video', 'link', 'document'] },
    }],
    prerequisites: [String],
    objectives: [String],
    targetAudience: [String],
    departmentIds: [{ type: Schema.Types.ObjectId, ref: 'Department' }],
    isMandatory: {
      type: Boolean,
      default: false,
    },
    cost: Number,
    currency: { type: String, default: 'USD' },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'draft',
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    enrollmentCount: {
      type: Number,
      default: 0,
    },
    completionCount: {
      type: Number,
      default: 0,
    },
    averageRating: Number,
  },
  {
    timestamps: true,
  }
);

trainingSchema.index({ tenantId: 1, code: 1 }, { unique: true });
trainingSchema.index({ tenantId: 1, status: 1 });
trainingSchema.index({ tenantId: 1, category: 1 });

export default mongoose.model<ITraining>('Training', trainingSchema);
