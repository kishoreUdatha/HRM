import mongoose, { Document, Schema } from 'mongoose';

export interface ITranslation extends Document {
  tenantId?: string;
  languageCode: string;
  namespace: string;
  key: string;
  value: string;
  pluralForms?: {
    zero?: string;
    one?: string;
    two?: string;
    few?: string;
    many?: string;
    other?: string;
  };
  context?: string;
  isCustom: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const translationSchema = new Schema<ITranslation>(
  {
    tenantId: { type: String, index: true },
    languageCode: { type: String, required: true, index: true },
    namespace: { type: String, required: true, default: 'common' },
    key: { type: String, required: true },
    value: { type: String, required: true },
    pluralForms: {
      zero: String,
      one: String,
      two: String,
      few: String,
      many: String,
      other: String,
    },
    context: String,
    isCustom: { type: Boolean, default: false },
  },
  { timestamps: true }
);

translationSchema.index({ languageCode: 1, namespace: 1, key: 1, tenantId: 1 }, { unique: true });

export default mongoose.model<ITranslation>('Translation', translationSchema);
