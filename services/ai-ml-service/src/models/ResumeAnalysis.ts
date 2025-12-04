import mongoose, { Schema, Document } from 'mongoose';

export interface IResumeAnalysis extends Document {
  tenantId: string;
  candidateId?: string;
  employeeId?: string;
  fileName: string;
  fileUrl?: string;
  rawText: string;
  parsedData: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    summary?: string;
    experience: Array<{
      company: string;
      title: string;
      duration: string;
      startDate?: string;
      endDate?: string;
      description: string;
      skills: string[];
    }>;
    education: Array<{
      institution: string;
      degree: string;
      field: string;
      year?: string;
      gpa?: string;
    }>;
    skills: {
      technical: string[];
      soft: string[];
      languages: string[];
      certifications: string[];
    };
    totalExperienceYears: number;
  };
  aiAnalysis: {
    skillsScore: number;
    experienceScore: number;
    educationScore: number;
    overallScore: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
    cultureFitScore?: number;
    leadershipPotential?: number;
  };
  jobMatches: Array<{
    jobId: string;
    jobTitle: string;
    matchScore: number;
    matchedSkills: string[];
    missingSkills: string[];
    recommendation: string;
  }>;
  status: 'processing' | 'completed' | 'failed';
  processingTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const ResumeAnalysisSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  candidateId: { type: String, index: true },
  employeeId: { type: String, index: true },
  fileName: { type: String, required: true },
  fileUrl: String,
  rawText: String,
  parsedData: {
    name: String,
    email: String,
    phone: String,
    location: String,
    summary: String,
    experience: [{
      company: String,
      title: String,
      duration: String,
      startDate: String,
      endDate: String,
      description: String,
      skills: [String]
    }],
    education: [{
      institution: String,
      degree: String,
      field: String,
      year: String,
      gpa: String
    }],
    skills: {
      technical: [String],
      soft: [String],
      languages: [String],
      certifications: [String]
    },
    totalExperienceYears: Number
  },
  aiAnalysis: {
    skillsScore: Number,
    experienceScore: Number,
    educationScore: Number,
    overallScore: Number,
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    cultureFitScore: Number,
    leadershipPotential: Number
  },
  jobMatches: [{
    jobId: String,
    jobTitle: String,
    matchScore: Number,
    matchedSkills: [String],
    missingSkills: [String],
    recommendation: String
  }],
  status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'processing' },
  processingTime: Number
}, { timestamps: true });

export default mongoose.model<IResumeAnalysis>('ResumeAnalysis', ResumeAnalysisSchema);
