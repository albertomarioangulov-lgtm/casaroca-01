import { Schema, model } from 'mongoose';

const welcomeCardSchema = new Schema(
  {
    // Referencia a Persona (si existe o se creó) y snapshot de los datos
    person: { type: Schema.Types.ObjectId, ref: 'Person' },
    personSnapshot: {
      name: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true, lowercase: true },
    },

    // Evento donde se registró (opcional)
    event: { type: Schema.Types.ObjectId, ref: 'Event' },

    // Datos del visitante
    registrationDate: { type: Date, default: Date.now },
    visitorType: {
      type: String,
      enum: ['first_time', 'update_info'],
    },
    name: { type: String, trim: true, required: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    motivations: [{ type: String }], // valores de VisitMotivation
    motivationOther: { type: String, trim: true },

    // Datos de interés
    acceptedJesus: { type: String, enum: ['yes', 'no'] },
    connectionInterest: {
      type: String,
      enum: ['casa_roca_home', 'just_visiting'],
    },
    // Si se desea conectar en otra sede
    wantsOtherCampus: { type: String, enum: ['yes', 'no'] },
    campus: { type: String, trim: true }, // una de CHURCH_CAMPUSES
    followUpInterests: [{ type: String }],
    affinityGroup: { type: String, trim: true }, // una de AFFINITY_GROUPS
    spouseName: { type: String, trim: true },

    // Datos internos
    registrationOrigin: { type: String, trim: true }, // una de REGISTRATION_ORIGINS
    prayerRequest: { type: String, trim: true },

    // Consentimiento
    acceptsDataPolicy: { type: String, enum: ['yes', 'no'] },

    // ===== Seguimiento =====
    // Estado actual del seguimiento después de la tarjeta de conexión
    followUpStatus: {
      type: String,
      enum: ['not_started', 'active', 'no_interested', 'stopped'],
      default: 'not_started',
    },
    followUpStoppedAt: { type: Date }, // cuándo se detuvo (no interesado o manual)
    followUpStoppedReason: { type: String, trim: true }, // motivo si se detuvo manualmente
    connectionEvent: { type: Schema.Types.ObjectId, ref: 'Event' }, // último evento de conexión al que fue invitado
    connectionEventInvitedAt: { type: Date }, // cuándo se le invitó
  },
  { timestamps: true }
);

// Índice compuesto para acelerar la búsqueda de tarjetas por evento (listado en detalle del evento)
welcomeCardSchema.index({ event: 1, createdAt: -1 });

// Índice para filtrar tarjetas por estado de seguimiento + antigüedad
welcomeCardSchema.index({ followUpStatus: 1, createdAt: -1 });

welcomeCardSchema.methods.toJSON = function () {
  const obj = this.toObject();
  return obj;
};

export const WelcomeCard = model('WelcomeCard', welcomeCardSchema);