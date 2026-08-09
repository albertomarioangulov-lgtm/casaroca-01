import { Schema, model } from 'mongoose';

const relationshipSchema = new Schema({
  person: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
  relatedPerson: { type: Schema.Types.ObjectId, ref: 'Person', required: true },
  relationshipType: {
    type: String,
    enum: [
      'padre', 'madre', 'hijo', 'hija',
      'hermano', 'hermana', 'tio', 'tia',
      'sobrino', 'sobrina', 'abuelo', 'abuela',
      'nieto', 'nieta', 'primo', 'prima',
      'cuñado', 'cuñada', 'suegro', 'suegra',
      'yerno', 'nuera', 'otro',
    ],
    required: true,
  },
}, { timestamps: true });

// Una persona no puede tener la misma relación duplicada con la misma persona
relationshipSchema.index(
  { person: 1, relatedPerson: 1, relationshipType: 1 },
  { unique: true }
);

relationshipSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return obj
}

export const Relationship = model('Relationship', relationshipSchema);