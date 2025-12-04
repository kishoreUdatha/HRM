import mongoose, { Schema } from 'mongoose';

export interface ICounter {
  _id: string;  // Format: "tenantId_collectionName"
  seq: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model<ICounter>('Counter', counterSchema);

export const getNextSequence = async (tenantId: string, collectionName: string): Promise<number> => {
  const counterId = `${tenantId}_${collectionName}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  return counter.seq;
};

// Peek at next sequence without incrementing (for preview purposes)
export const peekNextSequence = async (tenantId: string, collectionName: string): Promise<number> => {
  const counterId = `${tenantId}_${collectionName}`;

  const counter = await Counter.findById(counterId);

  // If no counter exists yet, next will be 1
  return counter ? counter.seq + 1 : 1;
};

export default Counter;
