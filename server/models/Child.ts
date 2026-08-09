import { Schema, model } from 'mongoose';

const childSchema = new Schema({
  name: { type: String, required: true, trim: true },
  birthDate: { type: Date },
  caregivers: [
    {
      caregiver: { type: Schema.Types.ObjectId, ref: 'Caregiver' },
      relationship: { type: String, trim: true }, // padre, madre, tío, abuela, etc.
    },
  ],
}, { timestamps: true });

childSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const Child = model('Child', childSchema);