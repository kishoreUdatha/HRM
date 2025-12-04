import mongoose, { Document, Schema } from 'mongoose';

export interface IAnalyticsSnapshot extends Document {
  tenantId: string;
  type: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  date: Date;
  period: {
    start: Date;
    end: Date;
  };
  workforce: {
    totalEmployees: number;
    activeEmployees: number;
    newHires: number;
    terminations: number;
    turnoverRate: number;
    averageTenure: number;
    byDepartment: { departmentId: string; name: string; count: number }[];
    byEmploymentType: { type: string; count: number }[];
    byGender: { gender: string; count: number }[];
    ageDistribution: { range: string; count: number }[];
  };
  attendance: {
    averageAttendanceRate: number;
    totalWorkingDays: number;
    averageLateArrivals: number;
    averageEarlyDepartures: number;
    averageOvertime: number;
    absenteeismRate: number;
    byDepartment: { departmentId: string; name: string; rate: number }[];
  };
  leave: {
    totalLeavesTaken: number;
    averageLeavesPerEmployee: number;
    byType: { type: string; count: number; days: number }[];
    pendingRequests: number;
    approvalRate: number;
  };
  payroll: {
    totalPayroll: number;
    averageSalary: number;
    medianSalary: number;
    salaryRange: { min: number; max: number };
    totalOvertime: number;
    totalDeductions: number;
    byDepartment: { departmentId: string; name: string; total: number; average: number }[];
  };
  performance: {
    averageRating: number;
    ratingDistribution: { rating: number; count: number }[];
    reviewsCompleted: number;
    pendingReviews: number;
    topPerformers: number;
    lowPerformers: number;
  };
  recruitment: {
    openPositions: number;
    applicationsReceived: number;
    interviewsConducted: number;
    offersExtended: number;
    offersAccepted: number;
    averageTimeToHire: number;
    conversionRate: number;
    sourceBreakdown: { source: string; count: number }[];
  };
  training: {
    totalEnrollments: number;
    completionRate: number;
    averageScore: number;
    hoursCompleted: number;
    byCategory: { category: string; enrollments: number; completions: number }[];
  };
  engagement: {
    averageScore?: number;
    surveyParticipation?: number;
    recognitionsGiven?: number;
    goalsCompleted?: number;
  };
  predictions: {
    attritionRisk: {
      high: number;
      medium: number;
      low: number;
    };
    expectedTurnover: number;
    expectedHires: number;
  };
  createdAt: Date;
}

const AnalyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>(
  {
    tenantId: {
      type: String,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    period: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    workforce: {
      totalEmployees: Number,
      activeEmployees: Number,
      newHires: Number,
      terminations: Number,
      turnoverRate: Number,
      averageTenure: Number,
      byDepartment: [{ departmentId: String, name: String, count: Number }],
      byEmploymentType: [{ type: String, count: Number }],
      byGender: [{ gender: String, count: Number }],
      ageDistribution: [{ range: String, count: Number }],
    },
    attendance: {
      averageAttendanceRate: Number,
      totalWorkingDays: Number,
      averageLateArrivals: Number,
      averageEarlyDepartures: Number,
      averageOvertime: Number,
      absenteeismRate: Number,
      byDepartment: [{ departmentId: String, name: String, rate: Number }],
    },
    leave: {
      totalLeavesTaken: Number,
      averageLeavesPerEmployee: Number,
      byType: [{ type: String, count: Number, days: Number }],
      pendingRequests: Number,
      approvalRate: Number,
    },
    payroll: {
      totalPayroll: Number,
      averageSalary: Number,
      medianSalary: Number,
      salaryRange: { min: Number, max: Number },
      totalOvertime: Number,
      totalDeductions: Number,
      byDepartment: [{ departmentId: String, name: String, total: Number, average: Number }],
    },
    performance: {
      averageRating: Number,
      ratingDistribution: [{ rating: Number, count: Number }],
      reviewsCompleted: Number,
      pendingReviews: Number,
      topPerformers: Number,
      lowPerformers: Number,
    },
    recruitment: {
      openPositions: Number,
      applicationsReceived: Number,
      interviewsConducted: Number,
      offersExtended: Number,
      offersAccepted: Number,
      averageTimeToHire: Number,
      conversionRate: Number,
      sourceBreakdown: [{ source: String, count: Number }],
    },
    training: {
      totalEnrollments: Number,
      completionRate: Number,
      averageScore: Number,
      hoursCompleted: Number,
      byCategory: [{ category: String, enrollments: Number, completions: Number }],
    },
    engagement: {
      averageScore: Number,
      surveyParticipation: Number,
      recognitionsGiven: Number,
      goalsCompleted: Number,
    },
    predictions: {
      attritionRisk: {
        high: Number,
        medium: Number,
        low: Number,
      },
      expectedTurnover: Number,
      expectedHires: Number,
    },
  },
  {
    timestamps: true,
  }
);

AnalyticsSnapshotSchema.index({ tenantId: 1, type: 1, date: -1 });
AnalyticsSnapshotSchema.index({ tenantId: 1, 'period.start': 1, 'period.end': 1 });

export default mongoose.model<IAnalyticsSnapshot>('AnalyticsSnapshot', AnalyticsSnapshotSchema);
