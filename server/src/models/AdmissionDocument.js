import mongoose from 'mongoose';
import * as C from '../utils/constants.js';

// One uploaded file of an application: Aadhaar, address proof, L.C., marksheets, photo or signature.
// The file itself lives in file storage (decided later); this record keeps its details and review state.
const admissionDocumentSchema = new mongoose.Schema(
  {
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    type: { type: String, required: true, enum: C.DOCUMENT_TYPES_VALUES },
    fileName: { type: String, required: true, trim: true },
    mimeType: { type: String, required: true, enum: C.DOCUMENT_RULES.mimeTypes },
    sizeBytes: { type: Number, required: true, min: 1, max: C.DOCUMENT_RULES.maxBytes },
    width: { type: Number, min: 1 }, // pixels, checked for photo and signature
    height: { type: Number, min: 1 },
    storageKey: { type: String, required: true, trim: true }, // where the file is kept
    status: { type: String, enum: C.DOCUMENT_STATUS_VALUES, default: C.DOCUMENT_STATUS.PENDING },
    reviewedByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: Date,
    reviewNote: { type: String, trim: true }, // reason when rejected
  },
  { timestamps: true }
);

// One file per kind per application. Uploading again replaces the old record.
admissionDocumentSchema.index({ applicationId: 1, type: 1 }, { unique: true });

admissionDocumentSchema.pre('validate', function checkImageSize() {
  const rule = C.DOCUMENT_RULES.size[this.type];
  if (rule && this.width != null && this.height != null && (this.width !== rule.width || this.height !== rule.height)) {
    this.invalidate('width', `${this.type} must be ${rule.width}x${rule.height} pixels`);
  }
  if (this.status === C.DOCUMENT_STATUS.REJECTED && !this.reviewNote) {
    this.invalidate('reviewNote', 'Say why the document was rejected');
  }
});

/** Which required documents an application still lacks. */
admissionDocumentSchema.statics.missingRequired = async function missingRequired(applicationId) {
  const have = await this.find({ applicationId }).distinct('type');
  return C.REQUIRED_DOCUMENT_TYPES.filter((t) => !have.includes(t));
};

export default mongoose.model('AdmissionDocument', admissionDocumentSchema);
