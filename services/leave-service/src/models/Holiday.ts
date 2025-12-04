import mongoose, { Document, Schema } from 'mongoose';

export interface IHoliday extends Document {
  tenantId: mongoose.Types.ObjectId;
  name: string;
  date: Date;
  type: 'public' | 'company' | 'optional';
  isRecurring: boolean;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const holidaySchema = new Schema<IHoliday>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ['public', 'company', 'optional'],
      default: 'public',
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    description: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

holidaySchema.index({ tenantId: 1, date: 1 });

export default mongoose.model<IHoliday>('Holiday', holidaySchema);
