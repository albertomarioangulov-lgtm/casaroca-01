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
  // Si el check-in de este evento requiere asignar número de manilla/pulsera por persona
  requireWristband: { type: Boolean, default: false },
  // Si el check-in de este evento registra salida (concepto dentro/fuera)
  trackCheckOut: { type: Boolean, default: false },
  // Snapshot de los salones/rangos de edad usados en ESTE evento (congelado al crear/activar).
  // Permite reconstruir la distribución histórica aunque el ministerio cambie los rangos después.
  ageGroupsSnapshot: [
    {
      name: { type: String, trim: true },
      minAge: { type: Number },
      maxAge: { type: Number },
    },
  ],
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

// Índice único: un evento principal no puede tener dos satélites del mismo ministerio
eventSchema.index(
  { parentEvent: 1, ministry: 1 },
  {
    unique: true,
    partialFilterExpression: {
      parentEvent: { $type: 'objectId' },
      ministry: { $type: 'objectId' },
    },
  }
);

eventSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const Event = model('Event', eventSchema);