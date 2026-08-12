import { Schema, model } from 'mongoose';

const followUpContactSchema = new Schema(
  {
    // Tarjeta de conexión a la que pertenece el contacto
    welcomeCard: { type: Schema.Types.ObjectId, ref: 'WelcomeCard', required: true },
    // Persona vinculada (si la tarjeta tiene persona asignada)
    person: { type: Schema.Types.ObjectId, ref: 'Person' },

    // Datos del contacto
    contactDate: { type: Date, required: true },
    channel: {
      type: String,
      enum: ['whatsapp', 'phone', 'email', 'in_person'],
      default: 'whatsapp',
    },
    result: {
      type: String,
      enum: [
        'interested', // quiere seguir en el proceso
        'not_interested', // pidió que no lo contacten más → detiene seguimiento
        'accepted_invitation', // aceptó ir al evento de conexión
        'declined_invitation', // rechazó invitación pero quizá sigue interesado
        'no_response', // no contestó, reintentar luego
      ],
      required: true,
    },
    notes: { type: String, trim: true },

    // Evento de conexión al que aceptó la invitación (obligatorio si result=accepted_invitation)
    connectionEvent: { type: Schema.Types.ObjectId, ref: 'Event' },

    // Quién registró el contacto
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Índices para el historial por tarjeta y por persona
followUpContactSchema.index({ welcomeCard: 1, contactDate: -1 });
followUpContactSchema.index({ person: 1, contactDate: -1 });

followUpContactSchema.methods.toJSON = function () {
  const obj = this.toObject();
  return obj;
};

export const FollowUpContact = model('FollowUpContact', followUpContactSchema);