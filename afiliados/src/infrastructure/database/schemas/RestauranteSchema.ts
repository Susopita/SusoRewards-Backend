import mongoose, { Schema } from 'mongoose';

const RestauranteSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  empresasId: [{ type: Schema.Types.ObjectId, ref: 'Empresa', required: true }],
  code: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true }
}, {
  timestamps: true,
  toJSON: {
    transform: (_: any, ret: any) => {
      ret.id = ret._id.toString();
      if (ret.empresasId) {
        ret.empresasId = ret.empresasId.map((id: any) => id.toString());
      }
      delete ret._id;
      delete ret.__v;
    }
  }
});

export const RestauranteModel = mongoose.models.Restaurante || mongoose.model('Restaurante', RestauranteSchema);
