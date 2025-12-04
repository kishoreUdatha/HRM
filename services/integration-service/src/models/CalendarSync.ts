import mongoose, { Document, Schema } from 'mongoose';

export interface ICalendarSync extends Document {
  tenantId: string;
  employeeId: mongoose.Types.ObjectId;
  provider: 'google' | 'outlook' | 'apple';
  isEnabled: boolean;
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  calendarId?: string;
  syncSettings: {
    syncLeaves: boolean;
    syncMeetings: boolean;
    syncHolidays: boolean;
    syncBirthdays: boolean;
    leaveVisibility: 'free' | 'busy' | 'tentative';
    meetingVisibility: 'default' | 'private';
  };
  lastSyncAt?: Date;
  lastError?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CalendarSyncSchema = new Schema<ICalendarSync>(
  {
    tenantId: { type: String, required: true, index: true },
    employeeId: { type: Schema.Types.ObjectId, required: true, ref: 'Employee' },
    provider: { type: String, enum: ['google', 'outlook', 'apple'], required: true },
    isEnabled: { type: Boolean, default: true },
    accessToken: { type: String, required: true, select: false },
    refreshToken: { type: String, required: true, select: false },
    expiresAt: Date,
    calendarId: String,
    syncSettings: {
      syncLeaves: { type: Boolean, default: true },
      syncMeetings: { type: Boolean, default: true },
      syncHolidays: { type: Boolean, default: true },
      syncBirthdays: { type: Boolean, default: false },
      leaveVisibility: { type: String, enum: ['free', 'busy', 'tentative'], default: 'busy' },
      meetingVisibility: { type: String, enum: ['default', 'private'], default: 'default' },
    },
    lastSyncAt: Date,
    lastError: String,
  },
  { timestamps: true }
);

CalendarSyncSchema.index({ tenantId: 1, employeeId: 1, provider: 1 }, { unique: true });

export default mongoose.model<ICalendarSync>('CalendarSync', CalendarSyncSchema);
