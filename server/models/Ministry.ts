import { Schema, model } from 'mongoose';

const ministrySchema = new Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, trim: true },
  description: { type: String, trim: true },
  // Tipo de elegibilidad automática
  eligibilityType: {
    type: String,
    enum: ['age', 'gender', 'marital', 'general', 'none'],
    default: 'none',
  },
  // Rango de edad (aplica si eligibilityType = 'age')
  minAge: { type: Number },
  maxAge: { type: Number },
  // Salones / grupos por rango de edad (ej. RocaKids: 1-2, 3-4, 5-7, 8-10)
  ageGroups: [
    {
      name: { type: String, trim: true },
      minAge: { type: Number },
      maxAge: { type: Number },
    },
  ],
  // Género (aplica si eligibilityType = 'gender')
  gender: { type: String, enum: ['male', 'female'] },
  // Estado civil (aplica si eligibilityType = 'marital')
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed'],
  },
  icon: { type: String, trim: true }, // mdi icon name
  color: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

ministrySchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const Ministry = model('Ministry', ministrySchema);