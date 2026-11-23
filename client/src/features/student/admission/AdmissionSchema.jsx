/* ------------------------------------------------------------------ */
/* Admission form schema — the 104 fields, grouped in the 8 steps.     */
/* The dropdown lists below are SAMPLE values: replace them with the   */
/* lists from your database / API.                                     */
/* ------------------------------------------------------------------ */

export const CLASSES = [
  { name: "F.Y.B.A.", section: "Arts" },
  { name: "M.A. Part I", section: "Arts" },
  { name: "F.Y.B.Com.", section: "Commerce" },
  { name: "F.Y.B.B.A.", section: "Commerce" },
  { name: "F.Y.B.B.A.(C.A.)", section: "Commerce" },
  { name: "M.Com. Part I", section: "Commerce" },
  { name: "F.Y.B.Sc.", section: "Science" },
  { name: "F.Y.B.C.A.(Science)", section: "Science" },
  { name: "M.Sc. Part I", section: "Science" },
];

// Same departments as the college website's Departments pages
export const DEPARTMENTS = {
  Arts: ["English", "Political Science", "Sociology", "Psychology", "Economics", "Marathi", "Hindi", "Urdu", "Arabic", "History"],
  Commerce: ["B.Com.", "BBA", "BBA (CA)", "M.Com."],
  Science: ["BCA (Science)", "Computer Science", "Chemistry", "Microbiology", "Statistics", "Electronics", "Physics", "Zoology", "Biotechnology", "Mathematics", "Botany", "Environmental Science"],
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YN = ["Yes", "No"];
const COUNTRIES = ["India", "Other"];
const TALUKAS = ["Haveli", "Pune City", "Mulshi", "Maval", "Khed", "Baramati", "Other"];
const LOCATIONS = ["Urban", "Rural"];

const P12 = /^\d{12}$/, P10 = /^[6-9]\d{9}$/, P6 = /^\d{6}$/, P4 = /^\d{4}$/;
const EMAIL = /^\S+@\S+\.\S+$/;

const f = (id, label, type = "text", o = {}) => ({ id, label, type, req: true, ...o });
const sel = (id, label, options, o = {}) => f(id, label, "select", { options, ...o });
const dt = (id, label, o = {}) => f(id, label, "date", o);
const file = (id, label, o = {}) => f(id, label, "file", o);

export const sectionOf = (v) => CLASSES.find((c) => c.name === v.class)?.section || "";
const composeName = (v) => {
  const parts = v.nameFormat === "First Middle Surname"
    ? [v.firstName, v.noMiddle ? "" : v.middleName, v.surname]
    : [v.surname, v.firstName, v.noMiddle ? "" : v.middleName];
  return parts.filter(Boolean).join(" ").trim();
};

const notNA = (v) => !v.passportNA;
const pp = (field) => ({ ...field, showIf: notNA });

export const STEPS = [
  {
    id: "admission", title: "Admission Form Information", short: "Admission",
    fields: [
      sel("class", "Select Class", CLASSES.map((c) => c.name)),
      sel("admissionType", "Admission Type", ["New Admission", "Re-admission", "Transfer / Migration", "Direct Second Year"]),
      f("section", "Section", "text", { readOnly: true, auto: (v) => sectionOf(v) }),
      f("classShown", "Class", "text", { readOnly: true, auto: (v) => v.class || "" }),
      sel("divisionType", "Division Type", ["Regular", "Self Finance", "Evening"]),
      sel("feesCategory", "Fees Category", ["Open", "OBC", "SC", "ST", "VJ/NT", "SBC", "EWS", "Minority"]),
      f("abcId", "Acad. Bank of Credits (ABC ID) / APAAR ID", "text", { req: false, pattern: P12, msg: "ABC ID must be 12 digits", inputMode: "numeric", maxLength: 12 }),
      f("aadhaar", "Aadhaar Card Number", "text", { pattern: P12, msg: "Aadhaar must be 12 digits", inputMode: "numeric", maxLength: 12 }),
    ],
  },
  {
    id: "student", title: "Student's Information", short: "Student",
    fields: [
      f("surname", "Student's Surname"),
      f("firstName", "Student's First Name"),
      f("middleName", "Student's Middle Name", "text", { reqIf: (v) => !v.noMiddle, disabledIf: (v) => v.noMiddle }),
      f("noMiddle", "I don't have middle name", "checkbox", { req: false }),
      sel("nameFormat", "Full Name Format", ["Surname First Middle", "First Middle Surname"]),
      f("fullName", "Student's Full Name (As per last mark sheet)", "text", { auto: composeName, hint: "Filled automatically — edit if it differs from your mark sheet" }),
      sel("gender", "Gender", ["Female", "Male", "Other"]),
      f("addr1", "Student's Address Line One (Local Address)", "text", { wide: true }),
      f("addr2", "Student's Address Line Two (Local Address)", "text", { wide: true }),
      sel("country", "Country", COUNTRIES),
      f("pincode", "Pincode", "text", { pattern: P6, msg: "Pincode must be 6 digits", inputMode: "numeric", maxLength: 6 }),
      f("state", "State"),
      f("district", "District"),
      sel("taluka", "Taluka", TALUKAS),
      sel("location", "Location", LOCATIONS),
      f("mobile", "Student's Mobile No.", "tel", { pattern: P10, msg: "Enter a valid 10-digit mobile number", inputMode: "numeric", maxLength: 10 }),
      f("email", "Student's Email ID", "email", { pattern: EMAIL, msg: "Enter a valid email address" }),
      dt("dob", "Birth Date"),
      f("birthPlace", "Birth Place"),
      sel("birthCountry", "Birth Place Country", COUNTRIES),
      sel("nationality", "Nationality", ["Indian", "Other"]),
      sel("motherTongue", "Mother Tongue", ["Marathi", "Hindi", "Urdu", "English", "Gujarati", "Kannada", "Other"]),
      sel("marital", "Marital Status", ["Unmarried", "Married"]),
      sel("bloodGroup", "Blood Group", ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]),
      sel("handicap", "Handicap", ["No", "Yes"]),
      sel("religion", "Religion", ["Islam", "Hinduism", "Christianity", "Buddhism", "Jainism", "Sikhism", "Other"]),
      sel("caste", "Caste", ["Not Applicable", "Other (as per certificate)"]),
      sel("subCaste", "Sub Caste", ["Not Applicable", "Other (as per certificate)"]),
      sel("casteCategory", "Caste Category", ["Open", "OBC", "SC", "ST", "VJ/NT", "SBC", "EWS", "Other"]),
      f("casteValidity", "Caste Validity No.", "text", { hint: "Enter NA if not applicable" }),
      sel("isMinority", "Is Minority?", YN),
      sel("minorityDetail", "Minority Detail", ["Muslim", "Christian", "Sikh", "Buddhist", "Jain", "Parsi"], { showIf: (v) => v.isMinority === "Yes" }),
    ],
  },
  {
    id: "parent", title: "Parent's Information", short: "Parent",
    fields: [
      f("fatherName", "Father's Full Name (As per documents)"),
      f("motherName", "Student's Mother Name (Only First Name)"),
      f("sameAddress", "Click here if Same as Student's Address Details", "checkbox", { req: false }),
      f("pAddr1", "Parent Address (Permanent Address) Line 1", "text", { wide: true, copyFrom: "addr1" }),
      f("pAddr2", "Parent Address (Permanent Address) Line 2", "text", { wide: true, req: false, copyFrom: "addr2" }),
      sel("pCountry", "Country", COUNTRIES, { copyFrom: "country" }),
      f("pPincode", "Pincode", "text", { pattern: P6, msg: "Pincode must be 6 digits", inputMode: "numeric", maxLength: 6, copyFrom: "pincode" }),
      f("pState", "State", "text", { copyFrom: "state" }),
      f("pDistrict", "District", "text", { copyFrom: "district" }),
      sel("pTaluka", "Taluka", TALUKAS, { copyFrom: "taluka" }),
      sel("pLocation", "Location", LOCATIONS, { copyFrom: "location" }),
      f("fatherMobile", "Father's Mobile No.", "tel", { pattern: P10, msg: "Enter a valid 10-digit mobile number", inputMode: "numeric", maxLength: 10 }),
      f("motherMobile", "Mother's Mobile No.", "tel", { pattern: P10, msg: "Enter a valid 10-digit mobile number", inputMode: "numeric", maxLength: 10 }),
      f("parentEmail", "Parent Email Id", "email", { pattern: EMAIL, msg: "Enter a valid email address" }),
      f("parentAlumni", "Is Parent Alumni?", "radio", { options: YN }),
    ],
  },
  {
    id: "last", title: "Last Year's Details (TC/LC) / Migration / Eligibility", short: "Last Year",
    fields: [
      f("lastClass", "Last Attended Class"),
      f("lastInstitute", "Last Attended Institute Name", "text", { wide: true }),
      f("lastBoard", "Last Attended Board/University Name", "text", { wide: true }),
      sel("eligibility", "Eligibility", ["Eligible", "Provisionally Eligible", "Not Applicable"]),
      sel("stateOfResidence", "State Of Residence", ["Maharashtra", "Karnataka", "Gujarat", "Goa", "Madhya Pradesh", "Uttar Pradesh", "Other"]),
      f("lastExam", "Last Qualified Examination"),
      sel("passMonth", "Last Exam Passing Month", MONTHS),
      f("passYear", "Last Exam Passing Year", "text", { pattern: P4, msg: "Enter a 4-digit year", inputMode: "numeric", maxLength: 4 }),
      f("obtained", "Last Exam Obtained Marks", "text", { inputMode: "decimal", pattern: /^\d+(\.\d+)?$/, msg: "Enter marks as a number" }),
      f("outOf", "Last Exam Out of Marks", "text", { inputMode: "decimal", pattern: /^\d+(\.\d+)?$/, msg: "Enter marks as a number" }),
      f("percentage", "Last Exam Percentage", "text", {
        readOnly: true,
        auto: (v) => (+v.outOf > 0 && v.obtained !== undefined && v.obtained !== "" ? ((+v.obtained / +v.outOf) * 100).toFixed(2) + "%" : ""),
      }),
      sel("result", "Last Exam Result", ["Pass", "Pass with ATKT", "Fail"]),
      sel("attempt", "Last Exam Attempt", ["First", "Second", "Third", "More than three"]),
      f("seatNo", "Last Exam Seat No."),
      f("tcNo", "T.C/L.C. No.", "text", { req: false }),
      dt("tcDate", "T.C/L.C. Issue Date", { req: false }),
      f("migNo", "Migration Cert. No.", "text", { req: false }),
      dt("migDate", "Migration Issue Date", { req: false }),
      sel("gap", "Gap", ["No Gap", "1 Year", "2 Years", "3 Years", "More than 3 Years"]),
    ],
  },
  {
    id: "passport", title: "Passport Information", short: "Passport",
    fields: [
      f("passportNA", "Click Here if Not Applicable to You", "checkbox", { req: false }),
      pp(sel("passportType", "Passport Type", ["Ordinary", "Official", "Diplomatic"])),
      pp(sel("passCountry", "Country", COUNTRIES)),
      pp(f("countryCode", "Country Code")),
      pp(f("passportNo", "Passport Number")),
      pp(f("placeOfIssue", "Place Of Issue")),
      pp(dt("ppIssue", "Issue Date")),
      pp(dt("ppExpiry", "Expiry Date")),
      pp(f("visaNo", "Visa No.")),
      pp(sel("visaNature", "Nature Of Visa", ["Student", "Tourist", "Other"])),
      pp(f("visaIssuedAt", "Issued At")),
      pp(sel("visaEntries", "No. Of Entries", ["Single", "Double", "Multiple"])),
      pp(dt("visaIssue", "Visa Issue Date")),
      pp(dt("visaExpiry", "Visa Expiry Date")),
      pp(f("uniLetterNo", "University Letter No.")),
      pp(dt("uniLetterDate", "University Letter Date")),
      pp(f("uniIdNo", "University ID No.")),
      pp(f("rpNo", "R.P. No.")),
      pp(dt("rpFrom", "R.P. Valid From")),
      pp(dt("rpTill", "R.P. Valid Till")),
      pp(f("fsisId", "FSIS ID")),
    ],
  },
  {
    id: "subjects", title: "Subject's Information", short: "Subjects",
    fields: [
      sel("mainGroup", "Main Group", (v) => DEPARTMENTS[sectionOf(v)] || [], { hint: "Select your class first" }),
      sel("majorGroup", "Major Groups", (v) => (DEPARTMENTS[sectionOf(v)] || []).filter((d) => d !== v.mainGroup)),
      sel("minorGroup", "Minor Groups", (v) => (DEPARTMENTS[sectionOf(v)] || []).filter((d) => d !== v.mainGroup && d !== v.majorGroup)),
    ],
  },
  {
    id: "documents", title: "Upload Required Documents", short: "Documents",
    fields: [
      file("docAadhaar", "1) Aadhar Card", { req: false }),
      file("docAddress", "2) Local Address Proof", { req: false }),
      file("docLc", "3) Original L.C."),
      file("docMark10", "4) Xerox Mark Sheet (10th)"),
      file("docMark12", "5) Xerox Mark Sheet (12th)"),
    ],
  },
  {
    id: "photo", title: "Photo & Signature", short: "Photo",
    fields: [
      file("photo", "Upload Passport Size Photo", { req: false, photo: true }),
      file("signature", "Upload Scanned Signature", { req: false, photo: true }),
    ],
  },
];

export const INITIAL_VALUES = {
  country: "India", birthCountry: "India", nationality: "Indian", marital: "Unmarried", handicap: "No",
  nameFormat: "Surname First Middle", passportNA: true, sameAddress: false, noMiddle: false,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const isVisible = (fld, v) => !fld.showIf || fld.showIf(v);
export const optionsOf = (fld, v) => (typeof fld.options === "function" ? fld.options(v) : fld.options || []);
export const isRequired = (fld, v) => fld.req && !fld.readOnly && (!fld.reqIf || fld.reqIf(v));
export const isDisabled = (fld, v) => !!(fld.readOnly || fld.disabledIf?.(v) || (fld.copyFrom && v.sameAddress));

export function getValue(fld, v) {
  if (fld.copyFrom && v.sameAddress) return v[fld.copyFrom] ?? "";
  if (fld.readOnly && fld.auto) return fld.auto(v);
  if (fld.auto) return v[fld.id] ?? fld.auto(v);
  if (fld.type === "checkbox") return !!v[fld.id];
  return v[fld.id] ?? "";
}

export const stepFields = (step, v) => step.fields.filter((x) => isVisible(x, v));
const empty = (val) => val === "" || val == null || val === false;

export function validateStep(step, v) {
  const errors = {};
  for (const fld of stepFields(step, v)) {
    if (fld.type === "checkbox" || isDisabled(fld, v)) continue;
    const val = getValue(fld, v);
    if (isRequired(fld, v) && empty(val)) {
      errors[fld.id] = fld.type === "file" ? "Please upload this document" : "This field is required";
      continue;
    }
    if (empty(val)) continue;
    if (fld.pattern && !fld.pattern.test(String(val).replace(/\s/g, ""))) errors[fld.id] = fld.msg || "Invalid value";
    else if (fld.type === "select" && !optionsOf(fld, v).includes(val)) errors[fld.id] = "Please select a valid option";
    else if (fld.id === "dob" && new Date(val) >= new Date()) errors[fld.id] = "Birth date must be in the past";
  }
  if (step.id === "last" && !errors.obtained && !errors.outOf && +v.obtained > +v.outOf) {
    errors.obtained = "Obtained marks cannot exceed total marks";
  }
  return errors;
}

export const validateAll = (v) => STEPS.reduce((acc, s) => ({ ...acc, ...validateStep(s, v) }), {});

export function completion(v) {
  let filled = 0, total = 0;
  for (const s of STEPS) {
    for (const fld of stepFields(s, v)) {
      if (fld.type === "checkbox" || fld.readOnly || isDisabled(fld, v)) continue;
      total += 1;
      if (!empty(getValue(fld, v))) filled += 1;
    }
  }
  return { filled, total, pct: total ? Math.round((filled / total) * 100) : 0 };
}

/** Human-readable rows for the print / download sheet and the review step. */
export function sheetRows(values) {
  return STEPS.map((s) => ({
    id: s.id,
    title: s.title,
    rows: stepFields(s, values)
      .filter((x) => x.type !== "checkbox" && x.type !== "file")
      .map((x) => [x.label, getValue(x, values) || "—"]),
    files: stepFields(s, values).filter((x) => x.type === "file").map((x) => [x.label, values[x.id] || null]),
  }));
}