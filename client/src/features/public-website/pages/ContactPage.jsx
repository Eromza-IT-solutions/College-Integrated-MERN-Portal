import { useState } from "react";
import { ArrowLeft, Mail, Phone, MapPin, Clock, Send, CheckCircle2, ExternalLink } from "lucide-react";

/* ------------------------------------------------------------------ */
/* DATA — edit here                                                    */
/* ------------------------------------------------------------------ */

const MAP_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d30266.72907381085!2d73.83818006112234!3d18.513480214864344!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bc2c039c3502135%3A0xf10067d6406e4db0!2sAbeda+Inamdar+Senior+College!5e0!3m2!1sen!2sin!4v1543909293843";
const MAP_LINK = "https://www.google.com/maps/search/?api=1&query=Abeda+Inamdar+Senior+College+Pune";

const VIDEOS = ["SrlJRVh8hVY", "9YPTo19zkQU", "qA0jiAKohmE", "9yRqfdUhlcw"];

// Subjects shown in the enquiry form. Change to match your college's departments.
const SUBJECTS = ["Admission", "Examination", "Fees / Payment", "Scholarship", "IGNOU", "Anti Ragging", "Other"];

/* ------------------------------------------------------------------ */

function Contact({ icon: Icon, children }) {
  return (
    <p className="line">
      <Icon size={15} />
      <span>{children}</span>
    </p>
  );
}

function EnquiryForm({ onSubmit }) {
  const [values, setValues] = useState({ name: "", email: "", phone: "", subject: "", message: "" });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => {
    setValues({ ...values, [k]: e.target.value });
    if (errors[k]) setErrors({ ...errors, [k]: undefined });
  };

  const validate = () => {
    const er = {};
    if (!values.name.trim()) er.name = "Please enter your name";
    if (!/^\S+@\S+\.\S+$/.test(values.email)) er.email = "Enter a valid email address";
    if (!/^[6-9]\d{9}$/.test(values.phone.replace(/\s/g, ""))) er.phone = "Enter a valid 10-digit mobile number";
    if (!values.subject) er.subject = "Please select a subject";
    if (!values.message.trim()) er.message = "Please write your message";
    return er;
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;
    // Hook up your backend here (receives the form values).
    if (onSubmit) await onSubmit(values);
    setSent(true);
    setValues({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  if (sent) {
    return (
      <div className="sent" role="status">
        <CheckCircle2 size={34} />
        <h4>Thank you!</h4>
        <p>Your enquiry has been received. The college will get back to you soon.</p>
        <button type="button" className="btn ghost" onClick={() => setSent(false)}>Send another enquiry</button>
      </div>
    );
  }

  const field = (k, label, props = {}) => (
    <div className={"f" + (errors[k] ? " bad" : "")}>
      <label htmlFor={`c-${k}`}>{label} <b>*</b></label>
      <input id={`c-${k}`} value={values[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <small>{errors[k]}</small>}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate className="form">
      <div className="row">
        {field("name", "Name", { autoComplete: "name", placeholder: "Your full name" })}
        {field("email", "Email", { type: "email", autoComplete: "email", placeholder: "you@example.com" })}
      </div>
      <div className="row">
        {field("phone", "Mobile Number", { type: "tel", inputMode: "numeric", autoComplete: "tel", placeholder: "10-digit mobile number" })}
        <div className={"f" + (errors.subject ? " bad" : "")}>
          <label htmlFor="c-subject">Select Subject <b>*</b></label>
          <select id="c-subject" value={values.subject} onChange={set("subject")} aria-invalid={!!errors.subject}>
            <option value="">Select Subject</option>
            {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
          </select>
          {errors.subject && <small>{errors.subject}</small>}
        </div>
      </div>
      <div className={"f" + (errors.message ? " bad" : "")}>
        <label htmlFor="c-message">Message <b>*</b></label>
        <textarea id="c-message" rows={4} value={values.message} onChange={set("message")} placeholder="Write your enquiry…" aria-invalid={!!errors.message} />
        {errors.message && <small>{errors.message}</small>}
      </div>
      <button type="submit" className="btn">Submit <Send size={15} /></button>
    </form>
  );
}

export default function ContactPage({ onBack, onSubmit }) {
  const goHome = (e) => {
    if (onBack) {
      e.preventDefault();
      onBack();
    }
  };

  return (
    <div className="contact">
      <style>{css}</style>

      <header className="banner">
        <a href="/" className="back" onClick={goHome}><ArrowLeft size={14} /> Back to Home</a>
        <h1>CONTACT US</h1>
      </header>

      <div className="map">
        <iframe title="Abeda Inamdar Senior College on Google Maps" src={MAP_EMBED} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
        <a className="map-link" href={MAP_LINK} target="_blank" rel="noopener noreferrer">
          Open in Maps <ExternalLink size={13} />
        </a>
      </div>

      <main className="wrap">
        <h2 className="title">Address and Contact Details</h2>

        <div className="cols">
          <article className="col">
            <h3>Abeda Inamdar College,</h3>
            <Contact icon={MapPin}>
              2390-B, K.B. Hidayatullah Road,<br />Azam Campus, Camp,<br />Pune 411001<br />Maharashtra, India.
            </Contact>
          </article>

          <article className="col">
            <div className="person">
              <h3>Dr. Shaila Bootwala</h3>
              <p className="role">Principal</p>
              <Contact icon={Mail}><a href="mailto:prin-aisc@azamcampus.org">prin-aisc@azamcampus.org</a></Contact>
            </div>
            <div className="person">
              <h3>Ms. Vaisahli Prabhune,</h3>
              <p className="role">Convenor, Anti Ragging Cell</p>
              <Contact icon={Phone}><a href="tel:+919850093225">9850093225</a></Contact>
              <Contact icon={Mail}><a href="mailto:vaishaliprabhune@azamcampus.org">vaishaliprabhune@azamcampus.org</a></Contact>
            </div>
            <div className="person">
              <h3>Prof. Gauri Devasthale</h3>
              <p className="role">Nodal Officer</p>
              <Contact icon={Phone}><a href="tel:+919822418705">+91-9822418705</a></Contact>
              <Contact icon={Mail}><a href="mailto:dgauri1972@yahoo.co.in">dgauri1972@yahoo.co.in</a></Contact>
            </div>
          </article>

          <article className="col">
            <h3>IGNOU CENTER</h3>
            <p className="role">Office</p>
            <p className="alert">FOR IGNOU RELATED QUERIES CONTACT ONLY : DR IBRAHIM JAHAGIRDAR : <a href="tel:+919209194303">9209194303</a></p>
            <Contact icon={Phone}><a href="tel:+912026441644">020-26441644</a></Contact>
            <Contact icon={Clock}>Contact between : 12:00 Noon to 03:00 PM</Contact>
          </article>
        </div>

        <section className="enquiry">
          <h2 className="title sm">Enquiry form</h2>
          <EnquiryForm onSubmit={onSubmit} />
        </section>

        <section className="videos" aria-label="College videos">
          {VIDEOS.map((id, i) => (
            <div className="video" key={id}>
              <iframe
                title={`College video ${i + 1}`}
                src={`https://www.youtube-nocookie.com/embed/${id}`}
                loading="lazy"
                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

const css = `
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
.contact{--navy:#1d3567;--red:#e11d48;--ink:#2a2f40;--mut:#5f6578;--line:#e3e6ef;
  font-family:'Open Sans',system-ui,sans-serif;color:var(--ink);background:#fff;min-height:100vh}
.contact *{box-sizing:border-box}
.contact a{color:inherit}
.contact a:focus-visible,.contact button:focus-visible,.contact input:focus-visible,.contact select:focus-visible,.contact textarea:focus-visible{outline:3px solid #e3b82b;outline-offset:2px}

.banner{position:relative;height:126px;display:grid;place-items:center;
  background:linear-gradient(rgba(20,25,50,.78),rgba(20,25,50,.78)),linear-gradient(115deg,#5b3a1e,#2b2f3a 45%,#6a4a2a)}
.banner h1{margin:0;color:#fff;font:700 36px 'Open Sans',sans-serif;letter-spacing:.01em}
.back{position:absolute;top:16px;left:16px;display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:999px;
  color:#fff!important;text-decoration:none;font:600 12px 'Open Sans',sans-serif;background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.45);backdrop-filter:blur(4px);transition:background .15s}
.back:hover{background:rgba(255,255,255,.24)}

.map{position:relative;height:250px;background:#e8ecf5}
.map iframe{width:100%;height:100%;border:0;display:block}
.map-link{position:absolute;top:12px;left:12px;display:inline-flex;align-items:center;gap:6px;padding:8px 12px;background:#fff;
  box-shadow:0 2px 8px rgba(0,0,0,.25);font:600 12.5px 'Open Sans',sans-serif;color:#1a5fd0!important;text-decoration:none;border-radius:2px}

.wrap{width:min(1180px,100%);margin:0 auto;padding:34px 20px 72px}
.title{margin:0 0 24px;font:700 31px 'Open Sans',sans-serif;color:#2a2f40}
.title.sm{font-size:24px;padding-bottom:10px;border-bottom:3px solid var(--red);display:inline-block}

.cols{display:grid;grid-template-columns:1fr 1.15fr 1.2fr;gap:36px;padding-bottom:40px;border-bottom:1px solid var(--line)}
.col h3{margin:0 0 4px;font-size:14.5px;font-weight:700;color:#3a3f4f}
.role{margin:0 0 4px;font-size:14px;font-weight:700;color:#3a3f4f}
.col .person{margin-bottom:18px}
.line{display:flex;gap:9px;align-items:flex-start;margin:2px 0;font-size:14px;line-height:1.7;color:var(--mut);overflow-wrap:anywhere}
.line svg{flex-shrink:0;margin-top:5px;color:var(--navy)}
.line a:hover{color:var(--navy);text-decoration:underline}
.alert{margin:8px 0;font-size:14px;font-weight:700;line-height:1.6;color:#e00000}
.alert a{text-decoration:underline}

.enquiry{margin-top:40px;max-width:760px}
.form{display:grid;gap:16px}
.row{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.f{display:flex;flex-direction:column;gap:6px}
.f label{font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#3a3f4f}
.f label b{color:var(--red)}
.f input,.f select,.f textarea{width:100%;padding:11px 14px;border:1px solid #cfd5e6;background:#f6f8fe;border-radius:8px;
  font:400 14px 'Open Sans',sans-serif;color:var(--ink)}
.f textarea{resize:vertical}
.f.bad input,.f.bad select,.f.bad textarea{border-color:#d92d20;background:#fff6f5}
.f small{font-size:12px;color:#d92d20}

.btn{display:inline-flex;align-items:center;gap:8px;justify-self:start;padding:12px 26px;border:0;border-radius:8px;cursor:pointer;
  background:linear-gradient(180deg,#b01836,#9b1230);color:#fff;font:600 14px 'Open Sans',sans-serif;box-shadow:0 8px 18px rgba(155,18,48,.3);transition:transform .15s}
.btn:hover{transform:translateY(-1px)}
.btn.ghost{background:#fff;color:var(--navy);border:1px solid var(--navy);box-shadow:none}
.sent{max-width:520px;padding:26px;text-align:center;background:#f0f9f3;border:1px solid #bfe3cb;border-radius:12px;color:#1b5e36}
.sent h4{margin:8px 0 4px;font-size:20px}
.sent p{margin:0 0 14px;font-size:14px}

.videos{margin-top:48px;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px}
.video{position:relative;aspect-ratio:16/9;background:#111;border-radius:8px;overflow:hidden}
.video iframe{position:absolute;inset:0;width:100%;height:100%;border:0}

@media(max-width:900px){
  .cols{grid-template-columns:1fr;gap:26px}
  .row{grid-template-columns:1fr}
  .banner h1{font-size:28px;margin-top:24px}
  .map{height:220px}
  .title{font-size:25px}
}
@media(prefers-reduced-motion:reduce){.btn,.back{transition:none}}
`;