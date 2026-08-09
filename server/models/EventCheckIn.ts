import { Schema, model } from 'mongoose';

const eventCheckInSchema = new Schema({
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  person: { type: Schema.Types.ObjectId, ref: 'Person', required: true }, // quien asiste (niño o adulto)
  checkInMethod: {
    type: String,
    enum: ['wristband', 'manual', 'qr'],
    default: 'manual',
  },
  // Solo aplica para check-in de niños con pulsera (RocaKids)
  caregiver: { type: Schema.Types.ObjectId, ref: 'Person' }, // quien entrega/recoge
  wristbandNumber: { type: String, trim: true },
  enrollment: { type: Schema.Types.ObjectId, ref: 'EventEnrollment' }, // vino de una pre-inscripción
  checkInTime: { type: Date, default: Date.now },
  checkOutTime: { type: Date },
  allowedPickups: [{ type: Schema.Types.ObjectId, ref: 'Person' }], // autorizados a recoger
}, { timestamps: true });

// Índice único: una persona no puede estar registrada dos veces en el mismo evento
eventCheckInSchema.index({ event: 1, person: 1 }, { unique: true });

eventCheckInSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const EventCheckIn = model('EventCheckIn', eventCheckInSchema);