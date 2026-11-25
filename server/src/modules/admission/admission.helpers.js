const ok = (req, res, data, status = 200, meta = {}) =>
  res.status(status).json({ success: true, data, meta: { ...meta, requestId: req.id } });

const paged = ({ total, page, limit }) => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});

const skipOf = ({ page, limit }) => (page - 1) * limit;

const both = (client, scope) => ({ $and: [client, scope] });

const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

function summary(application) {
  const student = application.student || {};
  return {
    id: String(application._id),
    applicationNumber: application.applicationNumber,
    status: application.status,
    applicantUserId: application.applicantUserId,
    academicYearId: application.academicYearId,
    programId: application.programId,
    yearOfStudy: application.yearOfStudy,
    student: {
      fullName: student.fullName,
      surname: student.surname,
      firstName: student.firstName,
    },
    feesCategory: application.feesCategory,
    feeAmountPaise: application.feeAmountPaise,
    feeDueAt: application.feeDueAt,
    hardCopyDueAt: application.hardCopyDueAt,
    submittedAt: application.submittedAt,
    approvedAt: application.approvedAt,
    createdAt: application.createdAt,
    updatedAt: application.updatedAt,
  };
}

function detail(application) {
  const data = application.toObject ? application.toObject() : { ...application };
  delete data.aadhaarNumber;
  if (data.student) delete data.student.mobileHash;
  delete data.__v;
  data.isEditable = application.isEditable ? application.isEditable() : false;
  if (!application.isSelected || application.isSelected('aadhaarNumber')) {
    data.missingForSubmit = application.missingForSubmit ? application.missingForSubmit() : [];
  } else {
    delete data.missingForSubmit;
  }
  return data;
}

function documentView(document) {
  const data = document.toObject ? document.toObject() : { ...document };
  delete data.__v;
  return data;
}

export { ok, paged, skipOf, both, clean, summary, detail, documentView };
