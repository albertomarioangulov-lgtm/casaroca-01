import { Schema, model } from 'mongoose';

const courseSessionSchema = new Schema({
  course: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
  date: { type: Date, required: true },
  topic: { type: String, trim: true },
  location: { type: String, trim: true },
}, { timestamps: true });

courseSessionSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const CourseSession = model('CourseSession', courseSessionSchema);