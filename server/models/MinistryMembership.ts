import { Schema, model } from 'mongoose';

const ministryMembershipSchema = new Schema({
  person: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
  ministry: { type: Schema.Types.ObjectId, ref: 'Ministry', required: true },
  roleInMinistry: {
    type: String,
    enum: ['member', 'leader', 'director'],
    default: 'member',
  },
  // Funciones específicas que la persona puede desempeñar en el ministerio
  specialties: [{ type: Schema.Types.ObjectId, ref: 'MinistryRole' }],
  // Cómo se vinculó
  source: {
    type: String,
    enum: ['voluntary', 'invitation'],
    default: 'voluntary',
  },
  invitation: { type: Schema.Types.ObjectId, ref: 'Invitation' },
  joinedAt: { type: Date, default: Date.now },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
}, { timestamps: true });

// Una persona no puede tener dos membresías activas en el mismo ministerio
ministryMembershipSchema.index(
  { person: 1, ministry: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

ministryMembershipSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const MinistryMembership = model('MinistryMembership', ministryMembershipSchema);