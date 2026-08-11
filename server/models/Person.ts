import { Schema, model } from 'mongoose';

const personSchema = new Schema({
  name: { type: String, required: true, trim: true },
  birthDate: { type: Date },
  phone: { type: String, trim: true },
  email: { type: String, trim: true, lowercase: true },
  gender: { type: String, enum: ['male', 'female'] },
  address: { type: String, trim: true },
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed'],
  },
  membershipDate: { type: Date },
  baptismDate: { type: Date },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

personSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

// Índices para búsqueda rápida por nombre, teléfono y email
personSchema.index({ name: 1 })
personSchema.index({ phone: 1 })
personSchema.index({ email: 1 })
personSchema.index({ isActive: 1 })

export const Person = model('Person', personSchema);
