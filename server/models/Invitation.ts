import { Schema, model } from 'mongoose';

const invitationSchema = new Schema({
  person: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
  ministry: { type: Schema.Types.ObjectId, ref: 'Ministry', required: true },
  event: { type: Schema.Types.ObjectId, ref: 'Event' }, // opcional: evento específico al que se invita
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }, // quién hizo la invitación
  channel: {
    type: String,
    enum: ['in_person', 'whatsapp', 'phone', 'email', 'portal'],
    default: 'in_person',
  },
  message: { type: String, trim: true },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined', 'no_response', 'cancelled'],
    default: 'pending',
  },
  invitedAt: { type: Date, default: Date.now },
  respondedAt: { type: Date },
}, { timestamps: true });

invitationSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const Invitation = model('Invitation', invitationSchema);