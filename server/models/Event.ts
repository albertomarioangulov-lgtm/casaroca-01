import { Schema, model } from 'mongoose';

const eventSchema = new Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  date: { type: Date, required: true },
  startTime: { type: String, trim: true }, // HH:mm
  endTime: { type: String, trim: true }, // HH:mm
  location: { type: String, trim: true },
  ministry: { type: Schema.Types.ObjectId, ref: 'Ministry' }, // ministerio al que pertenece el evento
  parentEvent: { type: Schema.Types.ObjectId, ref: 'Event', default: null }, // evento padre (ej. RokaKids es satélite del servicio de domingo)
  welcomeEnabled: { type: Boolean, default: true }, // si el ministerio de Bienvenida (Nicodemo) recibe nuevos en este evento
  type: {
    type: String,
    enum: ['regular', 'welcome', 'baptism', 'outreach'],
    default: 'regular',
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'finished', 'cancelled'],
    default: 'scheduled',
  },
}, { timestamps: true });

eventSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const Event = model('Event', eventSchema);