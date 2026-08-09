import { Schema, model } from 'mongoose';

const courseSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  startDate: { type: Date },
  endDate: { type: Date },
  ministry: { type: Schema.Types.ObjectId, ref: 'Ministry' }, // opcional: curso específico de un ministerio
  status: {
    type: String,
    enum: ['draft', 'active', 'finished'],
    default: 'draft',
  },
}, { timestamps: true });

courseSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const Course = model('Course', courseSchema);