import mongoose, { Document, Schema } from 'mongoose';

export interface ITravelRequest extends Document {
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  requestNumber: string;
  purpose: string;
  travelType: 'domestic' | 'international';
  destinations: {
    city: string;
    country: string;
    arrivalDate: Date;
    departureDate: Date;
  }[];
  startDate: Date;
  endDate: Date;
  totalDays: number;
  estimatedBudget: {
    transportation: number;
    accommodation: number;
    meals: number;
    other: number;
    total: number;
  };
  currency: string;
  transportation: {
    type: 'flight' | 'train' | 'bus' | 'car' | 'other';
    details?: string;
    bookingRequired: boolean;
    estimatedCost: number;
  }[];
  accommodation: {
    type: 'hotel' | 'airbnb' | 'company_apartment' | 'other';
    preferredHotel?: string;
    bookingRequired: boolean;
    estimatedCost: number;
    nights: number;
  };
  advanceRequired: boolean;
  advanceAmount?: number;
  advanceStatus?: 'pending' | 'approved' | 'disbursed' | 'settled';
  projectId?: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId;
  isBillable: boolean;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  approvalWorkflow: {
    level: number;
    approverId: mongoose.Types.ObjectId;
    status: 'pending' | 'approved' | 'rejected';
    actionDate?: Date;
    comments?: string;
  }[];
  bookings?: {
    type: 'flight' | 'hotel' | 'car' | 'other';
    confirmationNumber: string;
    details: string;
    cost: number;
    url?: string;
  }[];
  expenseReportId?: mongoose.Types.ObjectId;
  attachments?: string[];
  submittedAt?: Date;
  approvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const travelRequestSchema = new Schema<ITravelRequest>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Employee',
    },
    requestNumber: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      required: true,
    },
    travelType: {
      type: String,
      enum: ['domestic', 'international'],
      required: true,
    },
    destinations: [{
      city: String,
      country: String,
      arrivalDate: Date,
      departureDate: Date,
    }],
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    totalDays: Number,
    estimatedBudget: {
      transportation: { type: Number, default: 0 },
      accommodation: { type: Number, default: 0 },
      meals: { type: Number, default: 0 },
      other: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },
    currency: {
      type: String,
      default: 'USD',
    },
    transportation: [{
      type: {
        type: String,
        enum: ['flight', 'train', 'bus', 'car', 'other'],
      },
      details: String,
      bookingRequired: { type: Boolean, default: true },
      estimatedCost: Number,
    }],
    accommodation: {
      type: {
        type: String,
        enum: ['hotel', 'airbnb', 'company_apartment', 'other'],
      },
      preferredHotel: String,
      bookingRequired: { type: Boolean, default: true },
      estimatedCost: Number,
      nights: Number,
    },
    advanceRequired: { type: Boolean, default: false },
    advanceAmount: Number,
    advanceStatus: {
      type: String,
      enum: ['pending', 'approved', 'disbursed', 'settled'],
    },
    projectId: Schema.Types.ObjectId,
    clientId: Schema.Types.ObjectId,
    isBillable: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'cancelled', 'completed'],
      default: 'draft',
    },
    approvalWorkflow: [{
      level: Number,
      approverId: Schema.Types.ObjectId,
      status: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
      },
      actionDate: Date,
      comments: String,
    }],
    bookings: [{
      type: { type: String, enum: ['flight', 'hotel', 'car', 'other'] },
      confirmationNumber: String,
      details: String,
      cost: Number,
      url: String,
    }],
    expenseReportId: Schema.Types.ObjectId,
    attachments: [String],
    submittedAt: Date,
    approvedAt: Date,
  },
  {
    timestamps: true,
  }
);

travelRequestSchema.index({ tenantId: 1, requestNumber: 1 }, { unique: true });
travelRequestSchema.index({ tenantId: 1, employeeId: 1 });
travelRequestSchema.index({ tenantId: 1, status: 1 });

// Calculate total days before saving
travelRequestSchema.pre('save', function (next) {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate.getTime() - this.startDate.getTime());
    this.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  }
  // Calculate total budget
  if (this.estimatedBudget) {
    this.estimatedBudget.total =
      (this.estimatedBudget.transportation || 0) +
      (this.estimatedBudget.accommodation || 0) +
      (this.estimatedBudget.meals || 0) +
      (this.estimatedBudget.other || 0);
  }
  next();
});

export default mongoose.model<ITravelRequest>('TravelRequest', travelRequestSchema);
