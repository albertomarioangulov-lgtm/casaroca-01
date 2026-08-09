import { Schema, model } from 'mongoose';

const familySchema = new Schema({
  name: { type: String, required: true, trim: true },
  members: [
    {
      person: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
      roleInFamily: { type: String, trim: true }, // padre, madre, hijo, abuelo, etc.
    },
  ],
}, { timestamps: true });

familySchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const Family = model('Family', familySchema);