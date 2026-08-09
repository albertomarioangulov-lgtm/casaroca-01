import { Schema, model } from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String }, // Opcional para usuarios de Google
  name: String,
  avatar: String,
  googleId: String,
  roles: { type: [String] },
  personId: { type: Schema.Types.ObjectId, ref: 'Person' }, // Conexión opcional a la ficha de miembro
}, { timestamps: true });

// Hash de password antes de guardar
// userSchema.pre('save', async function(next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

userSchema.statics.encryptPassword = async (password) => {
  const salt = await bcrypt.genSalt(10)
  return await bcrypt.hash(password, salt)
}

userSchema.methods.comparePassword = async function(password: string) {
  return await bcrypt.compare(password, this.password)
}

userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  return obj
}

export const User = model('User', userSchema);