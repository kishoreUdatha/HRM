import mongoose, { Document, Schema } from 'mongoose';

export interface IFaceEmbeddingData {
  vector: number[];
  capturedAt: Date;
  quality: number;
  angle: 'front' | 'left' | 'right' | 'up' | 'down';
  imageHash?: string;
}

export interface IFaceEmbedding extends Document {
  _id: mongoose.Types.ObjectId;
  tenantId: mongoose.Types.ObjectId;
  employeeId: mongoose.Types.ObjectId;
  employeeName: string;
  embeddings: IFaceEmbeddingData[];
  averageEmbedding: number[];
  enrolledAt: Date;
  enrolledBy?: mongoose.Types.ObjectId;
  isActive: boolean;
  version: number;
  lastMatchedAt?: Date;
  matchCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const faceEmbeddingSchema = new Schema<IFaceEmbedding>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Tenant ID is required'],
      index: true,
    },
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID is required'],
    },
    employeeName: {
      type: String,
      required: [true, 'Employee name is required'],
    },
    embeddings: [
      {
        vector: {
          type: [Number],
          required: true,
        },
        capturedAt: {
          type: Date,
          default: Date.now,
        },
        quality: {
          type: Number,
          min: 0,
          max: 1,
          default: 0,
        },
        angle: {
          type: String,
          enum: ['front', 'left', 'right', 'up', 'down'],
          default: 'front',
        },
        imageHash: String,
      },
    ],
    averageEmbedding: {
      type: [Number],
      default: [],
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
    },
    enrolledBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    version: {
      type: Number,
      default: 1,
    },
    lastMatchedAt: Date,
    matchCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for faster lookups
faceEmbeddingSchema.index({ tenantId: 1, employeeId: 1 }, { unique: true });
faceEmbeddingSchema.index({ tenantId: 1, isActive: 1 });

// Method to calculate average embedding from all stored embeddings
faceEmbeddingSchema.methods.calculateAverageEmbedding = function (): number[] {
  if (!this.embeddings || this.embeddings.length === 0) {
    return [];
  }

  const vectorLength = this.embeddings[0].vector.length;
  const avgVector = new Array(vectorLength).fill(0);

  for (const embedding of this.embeddings) {
    for (let i = 0; i < vectorLength; i++) {
      avgVector[i] += embedding.vector[i];
    }
  }

  for (let i = 0; i < vectorLength; i++) {
    avgVector[i] /= this.embeddings.length;
  }

  // Normalize the vector
  const magnitude = Math.sqrt(avgVector.reduce((sum, val) => sum + val * val, 0));
  if (magnitude > 0) {
    for (let i = 0; i < vectorLength; i++) {
      avgVector[i] /= magnitude;
    }
  }

  return avgVector;
};

// Pre-save hook to update average embedding
faceEmbeddingSchema.pre('save', function (next) {
  if (this.isModified('embeddings') && this.embeddings.length > 0) {
    this.averageEmbedding = (this as any).calculateAverageEmbedding();
  }
  next();
});

const FaceEmbedding = mongoose.model<IFaceEmbedding>('FaceEmbedding', faceEmbeddingSchema);

export default FaceEmbedding;
