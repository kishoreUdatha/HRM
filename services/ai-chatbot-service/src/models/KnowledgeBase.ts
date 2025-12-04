import mongoose, { Schema, Document } from 'mongoose';

export interface IKnowledgeArticle extends Document {
  tenantId: string;
  category: 'policy' | 'faq' | 'procedure' | 'benefit' | 'leave' | 'payroll' | 'general';
  title: string;
  content: string;
  keywords: string[];
  tags: string[];
  intent: string;
  variations: string[];
  response: {
    text: string;
    richContent?: {
      type: 'card' | 'list' | 'button' | 'link';
      data: Record<string, any>;
    }[];
    followUpQuestions?: string[];
  };
  metadata: {
    effectiveDate?: Date;
    expiryDate?: Date;
    department?: string;
    roles?: string[];
    priority: number;
  };
  analytics: {
    viewCount: number;
    helpfulCount: number;
    notHelpfulCount: number;
    lastAccessedAt?: Date;
  };
  status: 'draft' | 'published' | 'archived';
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KnowledgeArticleSchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  category: { type: String, enum: ['policy', 'faq', 'procedure', 'benefit', 'leave', 'payroll', 'general'], required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  keywords: [String],
  tags: [String],
  intent: { type: String, required: true, index: true },
  variations: [String],
  response: {
    text: { type: String, required: true },
    richContent: [{
      type: { type: String, enum: ['card', 'list', 'button', 'link'] },
      data: Schema.Types.Mixed
    }],
    followUpQuestions: [String]
  },
  metadata: {
    effectiveDate: Date,
    expiryDate: Date,
    department: String,
    roles: [String],
    priority: { type: Number, default: 0 }
  },
  analytics: {
    viewCount: { type: Number, default: 0 },
    helpfulCount: { type: Number, default: 0 },
    notHelpfulCount: { type: Number, default: 0 },
    lastAccessedAt: Date
  },
  status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },
  createdBy: { type: String, required: true },
  updatedBy: String
}, { timestamps: true });

KnowledgeArticleSchema.index({ tenantId: 1, intent: 1 });
KnowledgeArticleSchema.index({ tenantId: 1, keywords: 1 });
KnowledgeArticleSchema.index({ tenantId: 1, '$**': 'text' });

export default mongoose.model<IKnowledgeArticle>('KnowledgeArticle', KnowledgeArticleSchema);
