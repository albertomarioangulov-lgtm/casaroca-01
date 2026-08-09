import { Schema, model } from 'mongoose';

const courseEnrollmentSchema = new Schema({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  person: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending',
  },
  requestDate: { type: Date, default: Date.now },
  decisionDate: { type: Date },
  decidedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // quien aprobó/rechazó
}, { timestamps: true });

courseEnrollmentSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const CourseEnrollment = model('CourseEnrollment', courseEnrollmentSchema);