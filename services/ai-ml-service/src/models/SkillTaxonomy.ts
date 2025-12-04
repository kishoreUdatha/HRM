import mongoose, { Schema, Document } from 'mongoose';

export interface ISkillTaxonomy extends Document {
  tenantId: string;
  name: string;
  normalizedName: string;
  category: 'technical' | 'soft' | 'domain' | 'tool' | 'language' | 'certification';
  subcategory?: string;
  aliases: string[];
  relatedSkills: string[];
  parentSkill?: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  demandScore: number;
  marketValue: number;
  description?: string;
  learningResources?: Array<{
    type: 'course' | 'certification' | 'book' | 'tutorial';
    name: string;
    url: string;
    provider: string;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SkillTaxonomySchema = new Schema({
  tenantId: { type: String, required: true, index: true },
  name: { type: String, required: true },
  normalizedName: { type: String, required: true },
  category: { type: String, enum: ['technical', 'soft', 'domain', 'tool', 'language', 'certification'], required: true },
  subcategory: String,
  aliases: [String],
  relatedSkills: [String],
  parentSkill: String,
  level: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'expert'] },
  demandScore: { type: Number, default: 50 },
  marketValue: { type: Number, default: 50 },
  description: String,
  learningResources: [{
    type: { type: String, enum: ['course', 'certification', 'book', 'tutorial'] },
    name: String,
    url: String,
    provider: String
  }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

SkillTaxonomySchema.index({ tenantId: 1, normalizedName: 1 }, { unique: true });
SkillTaxonomySchema.index({ tenantId: 1, aliases: 1 });

export default mongoose.model<ISkillTaxonomy>('SkillTaxonomy', SkillTaxonomySchema);
