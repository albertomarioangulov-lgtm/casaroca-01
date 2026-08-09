import { Schema, model } from 'mongoose';

const caregiverSchema = new Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, trim: true },
}, { timestamps: true });

caregiverSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const Caregiver = model('Caregiver', caregiverSchema);