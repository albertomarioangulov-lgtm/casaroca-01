import { Schema, model } from 'mongoose';

const courseAttendanceSchema = new Schema({
  session: { type: Schema.Types.ObjectId, ref: 'CourseSession', required: true },
  person: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
  present: { type: Boolean, default: true },
}, { timestamps: true });

// Una persona no puede tener dos registros en la misma sesión
courseAttendanceSchema.index({ session: 1, person: 1 }, { unique: true });

courseAttendanceSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const CourseAttendance = model('CourseAttendance', courseAttendanceSchema);