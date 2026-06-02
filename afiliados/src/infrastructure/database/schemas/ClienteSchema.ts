import mongoose, { Schema } from 'mongoose';

const ClienteSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  tarjetaCliente: { type: String, required: true, unique: true },
  empresasAfiliadas: { type: [{ type: Schema.Types.ObjectId, ref: 'Empresa' }], default: [] },
  active: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: {
    transform: (_: any, ret: any) => {
      ret.id = ret._id.toString();
      ret.empresasAfiliadas = ret.empresasAfiliadas.map((id: any) => id.toString());
      delete ret._id;
      delete ret.__v;
    }
  }
});

export const ClienteModel = mongoose.models.Cliente || mongoose.model('Cliente', ClienteSchema);
