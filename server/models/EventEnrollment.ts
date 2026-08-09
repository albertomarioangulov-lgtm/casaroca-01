import { Schema, model } from 'mongoose';

const eventEnrollmentSchema = new Schema({
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  person: { type: Schema.Types.ObjectId, ref: 'Person', required: true }, // quien asistirá (ej: hijo)
  enrolledBy: { type: Schema.Types.ObjectId, ref: 'Person', required: true }, // quien inscribió (ej: padre)
  status: {
    type: String,
    enum: ['registered', 'cancelled'],
    default: 'registered',
  },
  registeredAt: { type: Date, default: Date.now },
}, { timestamps: true });

// Una persona no puede pre-inscribirse dos veces al mismo evento
eventEnrollmentSchema.index(
  { event: 1, person: 1 },
  { unique: true, partialFilterExpression: { status: 'registered' } }
);

eventEnrollmentSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const EventEnrollment = model('EventEnrollment', eventEnrollmentSchema);