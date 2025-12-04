import mongoose, { Document, Schema } from 'mongoose';

export interface IAsset extends Document {
  tenantId: mongoose.Types.ObjectId;
  assetTag: string;
  name: string;
  category: 'laptop' | 'desktop' | 'mobile' | 'tablet' | 'monitor' | 'keyboard' | 'mouse' | 'headset' | 'furniture' | 'vehicle' | 'software_license' | 'access_card' | 'other';
  type: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  purchaseDate?: Date;
  purchasePrice?: number;
  currency: string;
  vendor?: string;
  warrantyExpiry?: Date;
  status: 'available' | 'assigned' | 'in_repair' | 'retired' | 'lost' | 'disposed';
  condition: 'new' | 'good' | 'fair' | 'poor';
  location?: string;
  assignedTo?: mongoose.Types.ObjectId;
  assignedAt?: Date;
  assignmentHistory: {
    employeeId: mongoose.Types.ObjectId;
    assignedAt: Date;
    returnedAt?: Date;
    condition: string;
    notes?: string;
  }[];
  maintenanceHistory: {
    date: Date;
    type: 'repair' | 'upgrade' | 'maintenance';
    description: string;
    cost?: number;
    vendor?: string;
    performedBy?: string;
  }[];
  specifications?: Record<string, string>;
  documents?: { name: string; url: string; type: string }[];
  notes?: string;
  depreciationRate?: number;
  currentValue?: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const assetSchema = new Schema<IAsset>(
  {
    tenantId: { type: Schema.Types.ObjectId, required: true, index: true },
    assetTag: { type: String, required: true },
    name: { type: String, required: true },
    category: {
      type: String,
      enum: ['laptop', 'desktop', 'mobile', 'tablet', 'monitor', 'keyboard', 'mouse', 'headset', 'furniture', 'vehicle', 'software_license', 'access_card', 'other'],
      required: true,
    },
    type: String,
    brand: String,
    model: String,
    serialNumber: String,
    purchaseDate: Date,
    purchasePrice: Number,
    currency: { type: String, default: 'USD' },
    vendor: String,
    warrantyExpiry: Date,
    status: {
      type: String,
      enum: ['available', 'assigned', 'in_repair', 'retired', 'lost', 'disposed'],
      default: 'available',
    },
    condition: {
      type: String,
      enum: ['new', 'good', 'fair', 'poor'],
      default: 'new',
    },
    location: String,
    assignedTo: { type: Schema.Types.ObjectId, ref: 'Employee' },
    assignedAt: Date,
    assignmentHistory: [{
      employeeId: Schema.Types.ObjectId,
      assignedAt: Date,
      returnedAt: Date,
      condition: String,
      notes: String,
    }],
    maintenanceHistory: [{
      date: Date,
      type: { type: String, enum: ['repair', 'upgrade', 'maintenance'] },
      description: String,
      cost: Number,
      vendor: String,
      performedBy: String,
    }],
    specifications: Schema.Types.Mixed,
    documents: [{ name: String, url: String, type: String }],
    notes: String,
    depreciationRate: Number,
    currentValue: Number,
    isActive: { type: Boolean, default: true },
    createdBy: Schema.Types.ObjectId,
  },
  { timestamps: true }
);

assetSchema.index({ tenantId: 1, assetTag: 1 }, { unique: true });
assetSchema.index({ tenantId: 1, status: 1 });
assetSchema.index({ tenantId: 1, assignedTo: 1 });
assetSchema.index({ tenantId: 1, category: 1 });

export default mongoose.model<IAsset>('Asset', assetSchema);
