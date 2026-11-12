import mongoose from 'mongoose';
import { ROLE_VALUES, PERMISSION_ACTIONS, PERMISSION_SCOPES } from '../utils/constants.js';

// One row = "this role may do this action on this resource, within this scope".
// Example: { roleKey: 'hod', resource: 'teachingPlans', action: 'approve', scope: 'department' }
// The rows themselves come from the permission matrix (still to be decided by the team).
const permissionSchema = new mongoose.Schema(
  {
    roleKey: { type: String, required: true, enum: ROLE_VALUES },
    // camelCase name of the thing being protected: teachingPlans, notices, admissions ...
    resource: {
      type: String,
      required: true,
      trim: true,
      match: [/^[a-z][A-Za-z0-9]*$/, 'Resource must be camelCase, like teachingPlans'],
    },
    action: { type: String, required: true, enum: PERMISSION_ACTIONS },
    scope: { type: String, required: true, enum: PERMISSION_SCOPES },
  },
  { timestamps: true }
);

// A role has at most one rule for each resource and action.
permissionSchema.index({ roleKey: 1, resource: 1, action: 1 }, { unique: true });

export default mongoose.model('Permission', permissionSchema);
