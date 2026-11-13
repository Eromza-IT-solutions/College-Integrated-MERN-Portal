import mongoose from 'mongoose';
import { ROLE_VALUES } from '../utils/constants.js';

// The fixed list of roles. Seeded once; the app does not create new roles.
const roleSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, enum: ROLE_VALUES },
    label: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model('Role', roleSchema);
