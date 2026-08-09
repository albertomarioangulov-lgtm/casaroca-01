import { Schema, model } from 'mongoose';

const marriageSchema = new Schema({
  spouse1: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
  spouse2: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
  marriageDate: { type: Date },
  status: {
    type: String,
    enum: ['active', 'divorced', 'widowed'],
    default: 'active',
  },
}, { timestamps: true });

// Una persona no puede estar en dos matrimonios activos al mismo tiempo
marriageSchema.index({ spouse1: 1, status: 1 });
marriageSchema.index({ spouse2: 1, status: 1 });

marriageSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const Marriage = model('Marriage', marriageSchema);