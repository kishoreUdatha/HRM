import mongoose, { Document, Schema } from 'mongoose';

export interface ITrainingEnrollment extends Document {
  tenantId: mongoose.Types.ObjectId;
  trainingId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  enrolledBy: mongoose.Types.ObjectId;
  enrolledAt: Date;
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped' | 'failed';
  progress: number;
  startedAt?: Date;
  completedAt?: Date;
  score?: number;
  certificateUrl?: string;
  feedback?: string;
  rating?: number;
  attendance?: {
    date: Date;
    present: boolean;
  }[];
  quizScores?: {
    quizId: string;
    score: number;
    maxScore: number;
    attemptedAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const trainingEnrollmentSchema = new Schema<ITrainingEnrollment>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    trainingId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Training',
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Employee',
    },
    enrolledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['enrolled', 'in_progress', 'completed', 'dropped', 'failed'],
      default: 'enrolled',
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    startedAt: Date,
    completedAt: Date,
    score: {
      type: Number,
      min: 0,
      max: 100,
    },
    certificateUrl: String,
    feedback: String,
    rating: {
      type: Number,
      min: 1,
      max: 5,
    },
    attendance: [{
      date: Date,
      present: Boolean,
    }],
    quizScores: [{
      quizId: String,
      score: Number,
      maxScore: Number,
      attemptedAt: Date,
    }],
  },
  {
    timestamps: true,
  }
);

trainingEnrollmentSchema.index({ tenantId: 1, trainingId: 1, employeeId: 1 }, { unique: true });
trainingEnrollmentSchema.index({ tenantId: 1, employeeId: 1 });
trainingEnrollmentSchema.index({ tenantId: 1, status: 1 });

export default mongoose.model<ITrainingEnrollment>('TrainingEnrollment', trainingEnrollmentSchema);
