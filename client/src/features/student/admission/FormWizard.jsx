import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Save, CheckCircle2, UploadCloud, Printer, Download, Eye, X } from "lucide-react";
import {
  STEPS, getValue, isDisabled, isRequired, optionsOf, stepFields, validateStep, validateAll, completion, sheetRows,
} from "./AdmissionSchema";
import { Card, Notice, useAdmission } from "./AdmissionShared";

/* ------------------------------------------------------------------ */
/* One form field                                                      */
/* ------------------------------------------------------------------ */

function FileField({ fld, v, set, error, label }) {
  const val = v[fld.id];
  const input = useRef();
  const [msg, setMsg] = useState("");

  const pick = (file) => {
    if (!file) return;
    if (!/^image\/jpe?g$/.test(file.type)) return setMsg("Only JPEG / JPG files are accepted");
    if (file.size > 500 * 1024) return setMsg("File must be smaller than 500 KB");
    const r = new FileReader();
    r.onload = () => {
      setMsg("");
      set(fld.id, { name: file.name, size: Math.round(file.size / 1024), data: r.result });
    };
    r.readAsDataURL(file);
  };

  const problem = error || msg;
  return (
    <div className={"field wide" + (problem ? " bad" : "")}>
      <span className="lbl">{label}</span>
      <div className="drop">
        {val ? <img className="thumb" src={val.data} alt="" /> : <span className="thumb"><UploadCloud size={22} /></span>}
        <div className="meta">
          <b>{val ? val.name : "No file chosen"}</b>
          <small>{val ? `${val.size} KB` : "JPEG / JPG · under 500 KB"}</small>
        </div>
        <input ref={input} type="file" accept="image/jpeg" hidden onChange={(e) => { pick(e.target.files[0]); e.target.value = ""; }} />
        <button type="button" id={`f-${fld.id}`} className="mini" onClick={() => input.current.click()}>{val ? "Replace" : "Choose file"}</button>
        {val && <button type="button" className="mini" aria-label={`Remove ${fld.label}`} onClick={() => set(fld.id, null)}><X size={14} /></button>}
      </div>
      {problem && <small className="e">{problem}</small>}
    </div>
  );
}

function Field({ fld, v, set, error }) {
  const val = getValue(fld, v);
  const disabled = isDisabled(fld, v);
  const req = isRequired(fld, v);
  const id = `f-${fld.id}`;
  const cls = "field" + (fld.wide ? " wide" : "") + (error ? " bad" : "");
  const label = <>{fld.label} {req && <span className="req" aria-hidden="true">*</span>}</>;

  if (fld.type === "checkbox") {
    return (
      <div className="field check-f">
        <label className={"check" + (disabled ? " disabled" : "")}>
          <input id={id} type="checkbox" checked={!!val} disabled={disabled} onChange={(e) => set(fld.id, e.target.checked)} />
          {fld.label}
        </label>
      </div>
    );
  }

  if (fld.type === "file") return <FileField fld={fld} v={v} set={set} error={error} label={label} />;

  if (fld.type === "radio") {
    return (
      <div className={cls}>
        <span className="lbl">{label}</span>
        <div className="radios" role="radiogroup" aria-label={fld.label}>
          {fld.options.map((o) => (
            <label key={o} className={val === o ? "on" : ""}>
              <input type="radio" name={fld.id} checked={val === o} onChange={() => set(fld.id, o)} /> {o}
            </label>
          ))}
        </div>
        {error && <small className="e">{error}</small>}
      </div>
    );
  }

  if (fld.type === "select") {
    const options = optionsOf(fld, v);
    return (
      <div className={cls}>
        <label htmlFor={id}>{label}</label>
        <select id={id} value={options.includes(val) ? val : ""} disabled={disabled} aria-invalid={!!error} onChange={(e) => set(fld.id, e.target.value)}>
          <option value="">Select</option>
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
        {error ? <small className="e">{error}</small> : !options.length && fld.hint ? <small className="h">{fld.hint}</small> : null}
      </div>
    );
  }

  return (
    <div className={cls}>
      <label htmlFor={id}>{label}</label>
      <input
        id={id} type={fld.type} value={val} disabled={disabled} aria-invalid={!!error}
        inputMode={fld.inputMode} maxLength={fld.maxLength} autoComplete="off"
        onChange={(e) => set(fld.id, fld.inputMode === "numeric" ? e.target.value.replace(/\D/g, "") : e.target.value)}
      />
      {error ? <small className="e">{error}</small> : fld.hint ? <small className="h">{fld.hint}</small> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Wizard                                                              */
/* ------------------------------------------------------------------ */

export default function FormWizard({ mode = "fill" }) {
  const { draft, setDraft, application, submitApplication, updateApplication, go } = useAdmission();
  const update = mode === "update";

  const [v, setV] = useState(() => (update && application ? application.values : draft));
  const [step, setStep] = useState(0);
  const [max, setMax] = useState(0);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState("");
  const [agree, setAgree] = useState(false);
  const [agreeErr, setAgreeErr] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const top = useRef(null);
  const mounted = useRef(false);

  const REVIEW = STEPS.length;
  const labels = [...STEPS.map((s) => s.short), "Review"];
  const comp = completion(v);

  // keep the draft in the shared state so it survives moving to another page
  useEffect(() => { if (!update) setDraft(v); }, [v]); // eslint-disable-line
  useEffect(() => {
    if (mounted.current) top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    mounted.current = true;
  }, [step]);

  /* ---- guards ---- */
  if (!done && !busy && !update && application) {
    return (
      <Card title="Application already submitted">
        <Notice tone="warn">
          You have already submitted your admission form (<b>{application.ref}</b>). Only one form should be submitted for a class —
          multiple forms for the same class are rejected. You can update your form instead.
        </Notice>
        <div className="btns" style={{ marginTop: 16 }}>
          <button type="button" className="btn" onClick={() => go("update")}>Update form</button>
          <button type="button" className="btn ghost" onClick={() => go("info")}>My admission info</button>
        </div>
      </Card>
    );
  }
  if (update && !application) {
    return (
      <Card title="Update form">
        <Notice tone="warn">You haven’t submitted an admission form yet, so there is nothing to update.</Notice>
        <div className="btns" style={{ marginTop: 16 }}>
          <button type="button" className="btn" onClick={() => go("fill")}>Fill form <ArrowRight size={15} /></button>
        </div>
      </Card>
    );
  }
  if (update && !done && !busy && application.statusIndex >= 2) {
    return (
      <Card title="Update form">
        <Notice tone="bad">Your application has already been approved, so the form can no longer be edited. Please contact the admission office for any correction.</Notice>
        <div className="btns" style={{ marginTop: 16 }}>
          <button type="button" className="btn ghost" onClick={() => go("info")}>My admission info</button>
        </div>
      </Card>
    );
  }

  if (done) {
    return (
      <Card>
        <div className="success">
          <div className="tick"><CheckCircle2 size={38} /></div>
          <h3>{done.updated ? "Form updated successfully" : "Application submitted!"}</h3>
          <p>{done.updated ? "Your changes have been saved." : "Your admission form has been submitted for review. Keep this reference number safe."}</p>
          <div className="refbox">{done.ref}</div>
          <div className="btns">
            <button type="button" className="btn" onClick={() => go("print")}><Printer size={16} /> Print form</button>
            <button type="button" className="btn ghost" onClick={() => go("download")}><Download size={16} /> Download form</button>
            <button type="button" className="btn ghost" onClick={() => go("info")}><Eye size={16} /> My admission info</button>
          </div>
        </div>
      </Card>
    );
  }

  /* ---- actions ---- */
  const set = (id, val) => {
    setV((p) => {
      const n = { ...p, [id]: val };
      if (id === "class") { n.mainGroup = ""; n.majorGroup = ""; n.minorGroup = ""; }
      if (id === "mainGroup") {
        if (n.majorGroup === val) n.majorGroup = "";
        if (n.minorGroup === val) n.minorGroup = "";
      }
      if (id === "majorGroup" && n.minorGroup === val) n.minorGroup = "";
      return n;
    });
    setErrors((e) => (e[id] ? { ...e, [id]: undefined } : e));
    setSavedAt(null);
  };

  const focusFirst = (er) => {
    const first = Object.keys(er).find((k) => er[k]);
    if (first) setTimeout(() => document.getElementById(`f-${first}`)?.focus(), 50);
  };

  const next = () => {
    const er = validateStep(STEPS[step], v);
    setErrors((p) => ({ ...p, ...er }));
    const n = Object.keys(er).length;
    if (n) {
      setNotice(`Please fix the ${n} highlighted field${n > 1 ? "s" : ""} to continue.`);
      return focusFirst(er);
    }
    setNotice("");
    setStep(step + 1);
    setMax((m) => Math.max(m, step + 1));
  };

  const goTo = (i) => {
    if (i > max) return;
    setNotice("");
    setStep(i);
  };

  const saveDraft = () => {
    setDraft(v);
    setSavedAt(new Date());
  };

  const submit = async () => {
    const er = validateAll(v);
    const n = Object.keys(er).length;
    if (n) {
      setErrors(er);
      const si = STEPS.findIndex((s) => s.fields.some((x) => er[x.id]));
      setStep(si);
      setNotice(`${n} field${n > 1 ? "s need" : " needs"} attention before you can submit.`);
      return focusFirst(er);
    }
    if (!agree) return setAgreeErr(true);
    setBusy(true);
    try {
      if (update) {
        await updateApplication(v);
        setDone({ ref: application.ref, updated: true });
      } else {
        const app = await submitApplication(v);
        setDone({ ref: app.ref });
      }
    } finally {
      setBusy(false);
    }
  };

  /* ---- render ---- */
  const cur = STEPS[step];
  return (
    <Card>
      <div ref={top} />
      <ol className="stepper" aria-label="Form steps">
        {labels.map((l, i) => (
          <li key={l} className={i < step ? "done" : i === step ? "cur" : ""}>
            <button type="button" disabled={i > max} onClick={() => goTo(i)} aria-current={i === step ? "step" : undefined}>
              <span className="n">{i < step ? <CheckCircle2 size={18} /> : i + 1}</span>
              {l}
            </button>
          </li>
        ))}
      </ol>
      <div className="prog">
        <div className="bar"><div style={{ width: `${comp.pct}%` }} /></div>
        <span><b>{comp.pct}%</b> · {comp.filled} of {comp.total} fields filled</span>
      </div>

      {notice && <div style={{ marginTop: 14 }}><Notice tone="bad" onClose={() => setNotice("")}>{notice}</Notice></div>}

      {step < REVIEW ? (
        <>
          <h3 className="step-h" style={{ marginTop: 20 }}>Step {step + 1}: {cur.title}</h3>
          <p className="lead" style={{ margin: "4px 0 0" }}>Fields marked <span style={{ color: "#9b1230" }}>*</span> are required.</p>
          <div className="fields">
            {stepFields(cur, v).map((fld) => (
              <Field key={fld.id} fld={fld} v={v} set={set} error={errors[fld.id]} />
            ))}
          </div>
        </>
      ) : (
        <>
          <h3 className="step-h" style={{ marginTop: 20 }}>Review &amp; {update ? "save" : "submit"}</h3>
          <p className="lead" style={{ margin: "4px 0 0" }}>Check your details carefully. Use <b>Edit</b> on any section to change it.</p>
          <div className="review">
            {sheetRows(v).map((sec, i) => (
              <section key={sec.id} className="review-sec">
                <header>
                  <h4>{i + 1}. {sec.title}</h4>
                  <button type="button" className="mini" onClick={() => goTo(i)}>Edit</button>
                </header>
                <dl>
                  {sec.rows.map(([l, val]) => <div key={l}><dt>{l}</dt><dd>{val}</dd></div>)}
                  {sec.files.map(([l, f]) => <div key={l}><dt>{l}</dt><dd>{f ? `✓ ${f.name}` : "Not uploaded"}</dd></div>)}
                </dl>
              </section>
            ))}
          </div>
          <label className="agree">
            <input type="checkbox" checked={agree} onChange={(e) => { setAgree(e.target.checked); setAgreeErr(false); }} />
            I declare that all the information provided is true and correct. I understand that wrong information may lead to cancellation of my admission.
          </label>
          {agreeErr && <small style={{ color: "#d92d20", fontSize: 12.5 }}>Please accept the declaration to continue.</small>}
        </>
      )}

      <div className="nav-row">
        <button type="button" className="btn ghost" onClick={() => goTo(step - 1)} disabled={step === 0}><ArrowLeft size={15} /> Back</button>
        <div className="btns" style={{ alignItems: "center" }}>
          {!update && (
            <>
              {savedAt && <span className="saved"><CheckCircle2 size={14} /> Draft saved {savedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
              <button type="button" className="btn ghost" onClick={saveDraft}><Save size={15} /> Save draft</button>
            </>
          )}
          {step < REVIEW ? (
            <button type="button" className="btn" onClick={next}>{step === REVIEW - 1 ? "Review" : "Next"} <ArrowRight size={15} /></button>
          ) : (
            <button type="button" className="btn" onClick={submit} disabled={busy}>
              {busy ? "Please wait…" : update ? "Save changes" : "Submit application"} <CheckCircle2 size={15} />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}