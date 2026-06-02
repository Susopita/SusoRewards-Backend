import mongoose, { Schema } from 'mongoose';

const ProgramaSchema = new Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  pointsRule: { type: Number, required: true },
  active: { type: Boolean, default: true },
  beneficios: { type: String },
  requisitos: { type: String },
  restaurantes: { type: [String], default: [] }
});

const EmpresaSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  active: { type: Boolean, default: true },
  programas: { type: [ProgramaSchema], default: [] }
}, {
  timestamps: true,
  toJSON: {
    transform: (_: any, ret: any) => {
      ret.id = ret._id.toString();
      delete ret._id;
      delete ret.__v;
    }
  }
});

export const EmpresaModel = mongoose.models.Empresa || mongoose.model('Empresa', EmpresaSchema);
