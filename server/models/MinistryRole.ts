import { Schema, model } from 'mongoose';

const ministryRoleSchema = new Schema({
  ministry: { type: Schema.Types.ObjectId, ref: 'Ministry', required: true },
  name: { type: String, required: true, trim: true }, // Recepción, Cuidado de niños, Logística...
  description: { type: String, trim: true },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

// Una función no puede repetirse en el mismo ministerio
ministryRoleSchema.index({ ministry: 1, name: 1 }, { unique: true });

ministryRoleSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const MinistryRole = model('MinistryRole', ministryRoleSchema);