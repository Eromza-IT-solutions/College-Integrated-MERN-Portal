import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Loader from "../../components/ui/Loader";
import Modal from "../../components/ui/Modal";
import {
  continueExamForm,
  fetchExamForm,
  saveExamFormSubjects,
  startExamForm,
} from "../../services/studentApi";
import { formatPaise } from "../../utils/format";
import { formatStatus, getStatusVariant } from "../../utils/status";

// Subjects can be changed only while the form is a draft or waiting for payment.
const EDITABLE = ["draft", "pendingPayment"];

// Show the server's field-by-field errors when there are any.
const describe = (err) => {
  const list = err.cause?.response?.data?.error?.errors;
  return list?.length
    ? list.map((e) => `${e.field}: ${e.message}`).join(" | ")
    : err.message;
};

/**
 * The student's exam form for one exam: start it, tick subjects, continue to payment.
 * exam = a row from GET /exams/eligibility ({ _id, name, form: { _id, status } | null })
 */
export default function ExamFormModal({ exam, onClose, onChanged }) {
  const [form, setForm] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!exam) return undefined;
    let alive = true;
    setLoading(true);
    setError("");
    setSaved(false);
    setForm(null);

    // An existing form is just opened; a first visit creates the form.
    const load = exam.form?._id
      ? fetchExamForm(exam.form._id)
      : startExamForm(exam._id);

    load
      .then((loaded) => {
        if (!alive) return;
        setForm(loaded);
        setSelected(new Set((loaded.subjects ?? []).map((s) => String(s.subjectId))));
        if (!exam.form?._id) onChanged?.();
      })
      .catch((err) => alive && setError(describe(err)))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam]);

  const editable = form ? EDITABLE.includes(form.status) : false;
  const offered = form?.offered ?? [];

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function submit(andContinue) {
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      let updated = await saveExamFormSubjects(form._id, [...selected]);
      if (andContinue) updated = await continueExamForm(form._id);
      setForm((current) => ({ ...current, ...updated }));
      setSaved(true);
      onChanged?.();
    } catch (err) {
      setError(describe(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={Boolean(exam)}
      onClose={onClose}
      title={exam ? `Exam form: ${exam.name}` : "Exam form"}
      size="lg"
      footer={
        editable ? (
          <>
            <Button variant="secondary" onClick={onClose}>Close</Button>
            <Button
              variant="secondary"
              disabled={busy || selected.size === 0}
              onClick={() => submit(false)}
            >
              Save subjects
            </Button>
            <Button
              disabled={busy || selected.size === 0}
              onClick={() => submit(true)}
            >
              {busy ? "Please wait..." : "Continue"}
            </Button>
          </>
        ) : (
          <Button variant="secondary" onClick={onClose}>Close</Button>
        )
      }
    >
      {loading ? <Loader label="Loading your exam form..." /> : null}

      {form ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-eromza-muted">
            <span>{form.details?.fullName}</span>
            <span>Enrollment: {form.details?.enrollmentNumber}</span>
            <span>Semester {form.details?.semester}</span>
            <Badge variant={getStatusVariant(form.status)}>{formatStatus(form.status)}</Badge>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold text-eromza-text">
              {editable ? "Tick the subjects you are appearing for" : "Subjects in your form"}
            </p>
            {offered.length === 0 ? (
              <p className="text-xs text-eromza-muted">
                No enrolled subjects found for this semester. Please contact the college office.
              </p>
            ) : (
              <ul className="divide-y divide-eromza-border rounded-lg border border-eromza-border">
                {offered.map((subject) => {
                  const id = String(subject._id);
                  return (
                    <li key={id}>
                      <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-xs">
                        <input
                          type="checkbox"
                          checked={selected.has(id)}
                          disabled={!editable}
                          onChange={() => toggle(id)}
                        />
                        <span className="font-medium text-eromza-text">{subject.code}</span>
                        <span className="text-eromza-muted">{subject.name}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            {editable ? (
              <p className="mt-2 text-[11px] text-eromza-subtle">{selected.size} selected</p>
            ) : null}
          </div>

          {form.feeAmountPaise != null ? (
            <p className="text-xs text-eromza-muted">
              Exam fee: <span className="font-semibold text-eromza-text">{formatPaise(form.feeAmountPaise)}</span>
            </p>
          ) : null}

          {form.status === "pendingPayment" ? (
            <p className="text-xs text-amber-700" role="status">
              Subjects saved. Pay the exam fee on the{" "}
              <Link className="underline" to="/student/fees" onClick={onClose}>Fees page</Link>{" "}
              to submit your form.
            </p>
          ) : null}
          {form.status === "submitted" ? (
            <p className="text-xs text-emerald-700" role="status">
              Your form is submitted. The exam office will approve it.
            </p>
          ) : null}
          {form.status === "approved" ? (
            <p className="text-xs text-emerald-700" role="status">Your form is approved.</p>
          ) : null}
          {form.status === "rejected" ? (
            <p className="text-xs text-eromza-error" role="status">
              Your form was rejected{form.decisionNote ? `: ${form.decisionNote}` : "."}
            </p>
          ) : null}
          {saved && form.status === "draft" ? (
            <p className="text-xs text-emerald-700" role="status">Subjects saved.</p>
          ) : null}
        </div>
      ) : null}

      {error ? <p role="alert" className="mt-3 text-xs text-eromza-error">{error}</p> : null}
    </Modal>
  );
}
