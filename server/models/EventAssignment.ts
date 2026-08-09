import { Schema, model } from 'mongoose';

const eventAssignmentSchema = new Schema({
  event: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  assignmentType: {
    type: String,
    enum: ['reception', 'child_care', 'teaching', 'logistics', 'group_leader', 'other'],
    required: true,
  },
  ministryRole: { type: Schema.Types.ObjectId, ref: 'MinistryRole' }, // función del catálogo
  roleName: { type: String, trim: true }, // nombre descriptivo: "Recepción", "Líder grupo 2-4 años"
  description: { type: String, trim: true },
  // Rango de edad del grupo asignado (aplica si assignmentType = 'group_leader' o 'child_care')
  minAge: { type: Number },
  maxAge: { type: Number },
  // Personas asignadas a este puesto
  assignedPersons: [{ type: Schema.Types.ObjectId, ref: 'Person' }],
}, { timestamps: true });

eventAssignmentSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const EventAssignment = model('EventAssignment', eventAssignmentSchema);