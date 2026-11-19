import {
  DOCUMENT_TYPES as T, RESERVED_CASTE_CATEGORIES, CONCESSION_CASTE_CATEGORIES, FOREIGN_FEES_CATEGORIES, OTHER_STATE_FEES_CATEGORY,
} from './constants.js';

/**
 * The documents an applicant must upload, from the college "Documents to be attached with the online admission form" list.
 * Pure: pass what the application says, get back [{ type, why }].
 *  - Everyone: photo, SSC and HSC mark sheets, leaving/transfer certificate, eligibility form, anti-raging form, undertaking form, Aadhaar.
 *    (Foreign students need the leaving/transfer/birth certificate instead of the Aadhaar.)
 *  - A gap certificate / affidavit only when there is a gap.
 *  - Reserved categories (SC/ST/NT/SBC/OBC/SEBC/VJ): scholarship form, caste certificate, caste validity, income certificate, bank passbook, domicile.
 *  - Economically weaker (EWS): concession form, income certificate, bank passbook, domicile.
 *  - Other state: migration certificate (PROPOSED: always, because the form does not say which board).
 *  - Foreign / SAARC / N.R.I.: university admission letter, passport and visa, residential proof, police registration, C-form.
 * The portal also takes a signature; it is allowed but not required.
 */
function requiredDocuments({ casteCategory, feesCategory, hasGap } = {}) {
  const out = [];
  const add = (type, why) => { if (!out.some((d) => d.type === type)) out.push({ type, why }); };
  const foreign = FOREIGN_FEES_CATEGORIES.includes(feesCategory);

  add(T.PHOTO, 'everyone');
  add(T.MARKSHEET_10, 'everyone');
  add(T.MARKSHEET_12, 'everyone');
  add(T.ORIGINAL_LC, 'everyone');
  add(T.ELIGIBILITY_FORM, 'everyone');
  add(T.ANTI_RAGING_FORM, 'everyone');
  add(T.UNDERTAKING_FORM, 'everyone');
  if (!foreign) add(T.AADHAAR, 'everyone');
  if (hasGap) add(T.GAP_CERTIFICATE, 'there is a gap');

  if (RESERVED_CASTE_CATEGORIES.includes(casteCategory)) {
    for (const t of [T.SCHOLARSHIP_FORM, T.CASTE_CERTIFICATE, T.CASTE_VALIDITY_CERTIFICATE, T.INCOME_CERTIFICATE, T.BANK_PASSBOOK, T.DOMICILE_CERTIFICATE]) add(t, 'reserved category');
  }
  if (CONCESSION_CASTE_CATEGORIES.includes(casteCategory)) {
    for (const t of [T.CONCESSION_FORM, T.INCOME_CERTIFICATE, T.BANK_PASSBOOK, T.DOMICILE_CERTIFICATE]) add(t, 'concession category');
  }
  if (feesCategory === OTHER_STATE_FEES_CATEGORY) add(T.MIGRATION_CERTIFICATE, 'student from another state');
  if (foreign) {
    for (const t of [T.UNIVERSITY_ADMISSION_LETTER, T.PASSPORT_VISA, T.RESIDENTIAL_PROOF, T.POLICE_REGISTRATION, T.C_FORM]) add(t, 'foreign student');
  }
  return out;
}

export { requiredDocuments };
