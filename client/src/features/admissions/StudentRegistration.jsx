import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  User, Mail, Phone, CalendarDays, Lock, Eye, EyeOff, ShieldCheck, RefreshCw, ArrowRight,
  ArrowLeft, CheckCircle2, AlertCircle, Loader2, GraduationCap, Clock, RotateCcw, LogIn,
  KeyRound, Check, X, Smartphone, MailCheck, ListChecks,
} from "lucide-react";

/* ---------- content ---------- */
const INSTRUCTIONS = [
  "Please enter your mobile number and email id carefully.",
  "You will receive OTP on your mobile number and email id after filling this form to verify your details.",
  "After verifying your details with OTP, your account will be activated and you will receive SMS confirmation.",
  "OTP received on your mobile number and email id will get expired in 30 minutes.",
  "If you have received OTP & didn't use it within 30 minutes, use \"Forget ID\" link in Login Menu page to activate your account.",
  "Please keep your mobile switched on and in network range to receive OTP quickly, please check for OTP email in your email's inbox and spam folders.",
  "If you have already tried registering and did not receive any SMS/OTP, you can recover your account using \"Forget ID\" link in login menu.",
  "Special symbols such as (#, !, $, &, *, .,) are not allowed in password.",
];

const OTP_SECONDS = 30 * 60;
const FORBIDDEN = /[#!$&*.,^()]/;
const EMPTY = { name: "", email: "", mobile: "", dob: "", password: "", captcha: "" };

/* ---------- helpers ---------- */
const genCode = () => Array.from({ length: 5 }, () => Math.floor(Math.random() * 10)).join("");
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function maskDob(v) {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length > 4) return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
  if (d.length > 2) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return d;
}

function validDob(v) {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(v);
  if (!m) return false;
  const [, dd, mm, yyyy] = m.map(Number);
  const dt = new Date(yyyy, mm - 1, dd);
  return dt.getFullYear() === yyyy && dt.getMonth() === mm - 1 && dt.getDate() === dd && yyyy >= 1960 && dt <= new Date();
}

function validate(v, code) {
  const e = {};
  if (v.name.trim().length < 3 || !/^[A-Za-z .'-]+$/.test(v.name.trim())) e.name = "Enter your full name exactly as on your marks sheet.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = "Enter a valid email address.";
  if (!/^[6-9]\d{9}$/.test(v.mobile)) e.mobile = "Enter a valid 10-digit mobile number.";
  if (!validDob(v.dob)) e.dob = "Enter a valid birth date as DD/MM/YYYY.";
  if (v.password.length < 8 || !/[A-Za-z]/.test(v.password) || !/\d/.test(v.password) || FORBIDDEN.test(v.password))
    e.password = "Use 8+ characters with letters and numbers, and no special symbols.";
  if (v.captcha.trim() !== code) e.captcha = "Captcha does not match the image.";
  return e;
}

/* ---------- small components ---------- */
function Captcha({ code, onRefresh }) {
  const art = useMemo(() => {
    const r = (a, b) => a + Math.random() * (b - a);
    return {
      lines: Array.from({ length: 5 }, () => ({ x1: r(0, 220), y1: r(0, 64), x2: r(0, 220), y2: r(0, 64) })),
      dots: Array.from({ length: 70 }, () => ({ x: r(0, 220), y: r(0, 64), r: r(0.6, 1.6) })),
      chars: code.split("").map((c, i) => ({ c, x: 26 + i * 38, y: r(40, 48), rot: r(-22, 22), size: r(34, 42) })),
    };
  }, [code]);
  return (
    <div className="sr-captcha">
      <svg viewBox="0 0 220 64" role="img" aria-label="Captcha image">
        <rect width="220" height="64" rx="10" fill="#eef2fd" />
        {art.lines.map((l, i) => <line key={i} {...l} stroke="#1b2d6b" strokeOpacity=".28" strokeWidth="1.4" />)}
        {art.chars.map((ch, i) => (
          <text key={i} x={ch.x} y={ch.y} fontSize={ch.size} fontWeight="700" fill="#14214f" textAnchor="middle"
            fontFamily="Playfair Display, serif" transform={`rotate(${ch.rot} ${ch.x} ${ch.y - 12})`}>{ch.c}</text>
        ))}
        {art.dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="#a50d22" fillOpacity=".4" />)}
      </svg>
      <button type="button" className="sr-refresh" onClick={onRefresh}><RefreshCw size={14} /> Refresh Captcha</button>
    </div>
  );
}

function Field({ label, icon: Icon, error, ok, note, children, className = "" }) {
  return (
    <div className={`sr-field ${error ? "is-bad" : ""} ${ok ? "is-ok" : ""} ${className}`}>
      <label className="sr-label">{label} <b>*</b></label>
      <div className="sr-input">
        <Icon size={17} className="sr-ic" />
        {children}
        {ok && !error && <Check size={16} className="sr-tick" />}
      </div>
      {error ? <span className="sr-err"><AlertCircle size={13} /> {error}</span> : note}
    </div>
  );
}

function OtpInput({ value, onChange, disabled, label }) {
  const refs = useRef([]);
  const set = (i, ch) => {
    const arr = value.padEnd(6, " ").split("");
    arr[i] = ch || " ";
    onChange(arr.join("").trimEnd().replace(/ /g, ""));
  };
  return (
    <div className="sr-otp" role="group" aria-label={label}>
      {Array.from({ length: 6 }, (_, i) => (
        <input key={i} ref={(el) => (refs.current[i] = el)} inputMode="numeric" maxLength={1} disabled={disabled}
          value={value[i] || ""} aria-label={`${label} digit ${i + 1}`}
          onChange={(e) => {
            const ch = e.target.value.replace(/\D/g, "").slice(-1);
            set(i, ch);
            if (ch && i < 5) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !value[i] && i > 0) refs.current[i - 1]?.focus();
          }}
          onPaste={(e) => {
            const t = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
            if (t) { e.preventDefault(); onChange(t); refs.current[Math.min(t.length, 5)]?.focus(); }
          }} />
      ))}
    </div>
  );
}

/* ---------- page ---------- */
export default function StudentRegistration({
  logo, bgImage, onBack = () => {}, onLogin = () => {}, onRecover = () => {},
  // async (values) => {}  – call your API here; throw to show an error
  onRegister = async () => {}, onVerify = async () => {},
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState("form"); // form | otp | done
  const [v, setV] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [tried, setTried] = useState(false);
  const [show, setShow] = useState(false);
  const [code, setCode] = useState(genCode);
  const [busy, setBusy] = useState(false);
  const [apiErr, setApiErr] = useState("");
  const [shake, setShake] = useState(false);
  const [otp, setOtp] = useState({ mobile: "", email: "" });
  const [left, setLeft] = useState(OTP_SECONDS);

  const errors = useMemo(() => validate(v, code), [v, code]);
  const showErr = (k) => (touched[k] || tried) && errors[k];
  const isOk = (k) => touched[k] && !errors[k];
  const set = (k) => (e) => setV((p) => ({ ...p, [k]: k === "dob" ? maskDob(e.target.value) : k === "mobile" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value }));
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));
  const refresh = useCallback(() => { setCode(genCode()); setV((p) => ({ ...p, captcha: "" })); }, []);

  const pw = v.password;
  const rules = [
    { ok: pw.length >= 8, text: "At least 8 characters" },
    { ok: /[A-Za-z]/.test(pw) && /\d/.test(pw), text: "Letters and numbers" },
    { ok: pw.length > 0 && !FORBIDDEN.test(pw), text: "No special symbols (# ! $ & * . , ^ ( ))" },
  ];
  const strength = pw ? rules.filter((r) => r.ok).length + (pw.length >= 12 ? 1 : 0) : 0;

  /* OTP countdown */
  useEffect(() => {
    if (step !== "otp") return;
    const id = setInterval(() => setLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [step]);
  const expired = left === 0;

  const clearAll = () => { setV(EMPTY); setTouched({}); setTried(false); setApiErr(""); setCode(genCode()); };

  const submit = async (e) => {
    e.preventDefault();
    setTried(true); setApiErr("");
    if (Object.keys(errors).length) {
      setShake(true); setTimeout(() => setShake(false), 500);
      document.querySelector(".sr-field.is-bad input")?.focus();
      return;
    }
    setBusy(true);
    try {
      await onRegister({ name: v.name.trim(), email: v.email.trim(), mobile: v.mobile, dob: v.dob, password: v.password });
      await new Promise((r) => setTimeout(r, 900)); // demo delay – remove with real API
      setLeft(OTP_SECONDS); setOtp({ mobile: "", email: "" }); setStep("otp");
    } catch (err) {
      setApiErr(err?.message || "Registration failed. Please try again.");
      refresh();
    } finally { setBusy(false); }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (otp.mobile.length < 6 || otp.email.length < 6 || expired) return;
    setBusy(true); setApiErr("");
    try {
      await onVerify({ mobile: v.mobile, email: v.email, mobileOtp: otp.mobile, emailOtp: otp.email });
      await new Promise((r) => setTimeout(r, 900)); // demo delay – remove with real API
      setStep("done");
    } catch (err) { setApiErr(err?.message || "Invalid OTP. Please check and try again."); }
    finally { setBusy(false); }
  };

  const maskedMobile = `+91 ${v.mobile.slice(0, 2)}••••••${v.mobile.slice(-2)}`;
  const maskedEmail = v.email.replace(/^(.).*(@.*)$/, "$1•••••$2");

  return (
    <div className="sr-root" style={bgImage ? { "--bg": `url(${bgImage})` } : undefined}>
      <style>{CSS}</style>
      <span className="sr-orb sr-o1" /><span className="sr-orb sr-o2" />

     <button className="sr-back" onClick={() => navigate("/")}>
  <ArrowLeft size={16} /> Back to Home
</button>

      <main className="sr-card">
        {/* ---------- left: branding + instructions ---------- */}
        <aside className="sr-left">
          <span className="sr-lorb sr-lo1" /><span className="sr-lorb sr-lo2" />
          <div className="sr-logo">
            {logo ? <img src={logo} alt="M.C.E. Society's Abeda Inamdar Senior College crest" /> : <GraduationCap size={34} />}
          </div>
          <p className="sr-soc">M.C.E. Society’s</p>
          <h2 className="sr-college">Abeda Inamdar<br />Senior College</h2>
          <span className="sr-bar" />

          <section className="sr-instr" aria-labelledby="sr-instr-h">
            <h3 id="sr-instr-h"><ListChecks size={18} /> Important Instructions for Students</h3>
            <ol>
              {INSTRUCTIONS.map((t, i) => (
                <li key={i} className={i === INSTRUCTIONS.length - 1 ? "sr-warn" : ""} style={{ animationDelay: `${i * 60}ms` }}>
                  <span>{i + 1}</span><p>{t}</p>
                </li>
              ))}
            </ol>
          </section>
        </aside>

        {/* ---------- right: form / otp / done ---------- */}
        <section className="sr-right">
          {step === "form" && (
            <form onSubmit={submit} noValidate className="sr-step">
              <h1>Student Registration</h1>
              <p className="sr-sub">Create your account to access the college portal.</p>

              {apiErr && <div className="sr-alert" role="alert"><AlertCircle size={16} /> {apiErr}</div>}

              <div className="sr-grid">
                <Field label="Name" icon={User} error={showErr("name")} ok={isOk("name")}>
                  <input value={v.name} onChange={set("name")} onBlur={blur("name")} placeholder="Enter Name From Marks Sheet..." autoComplete="name" />
                </Field>
                <Field label="Email" icon={Mail} error={showErr("email")} ok={isOk("email")}>
                  <input type="email" value={v.email} onChange={set("email")} onBlur={blur("email")} placeholder="Email..." autoComplete="email" />
                </Field>
                <Field label="Mobile Number" icon={Phone} error={showErr("mobile")} ok={isOk("mobile")}>
                  <input inputMode="numeric" value={v.mobile} onChange={set("mobile")} onBlur={blur("mobile")} placeholder="Mobile Number..." autoComplete="tel-national" />
                </Field>
                <Field label="Birth Date (DD/MM/YYYY)" icon={CalendarDays} error={showErr("dob")} ok={isOk("dob")}>
                  <input inputMode="numeric" value={v.dob} onChange={set("dob")} onBlur={blur("dob")} placeholder="Birth Date (DD/MM/YYYY)..." maxLength={10} autoComplete="bday" />
                </Field>

                <Field label="Password" icon={Lock} error={showErr("password")} ok={isOk("password")}
                  note={<span className="sr-hint">Special symbols (&amp;, !, #, *, ), ^,) are not allowed</span>}>
                  <input type={show ? "text" : "password"} value={v.password} onChange={set("password")} onBlur={blur("password")} placeholder="Password..." autoComplete="new-password" />
                  <button type="button" className="sr-eye" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}>
                    {show ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </Field>

                <div className="sr-col">
                  <Field label="Captcha" icon={ShieldCheck} error={showErr("captcha")} ok={isOk("captcha")}>
                    <input inputMode="numeric" value={v.captcha} onChange={set("captcha")} onBlur={blur("captcha")} placeholder="Captcha (From Image Below)..." maxLength={5} autoComplete="off" />
                  </Field>
                  <Captcha code={code} onRefresh={refresh} />
                </div>

                <div className="sr-rules" aria-live="polite">
                  <div className="sr-meter" data-s={strength}><i /><i /><i /><i /></div>
                  <ul>
                    {rules.map((r) => (
                      <li key={r.text} className={pw ? (r.ok ? "ok" : "no") : ""}>
                        {pw && r.ok ? <Check size={13} /> : pw ? <X size={13} /> : <span className="sr-dot" />} {r.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="sr-actions">
                <button type="submit" className={`sr-btn sr-primary ${shake ? "shake" : ""}`} disabled={busy}>
                  {busy ? <><Loader2 size={17} className="sr-spin" /> Registering…</> : <>Click to Register <ArrowRight size={17} /></>}
                </button>
                <button type="button" className="sr-btn sr-ghost" onClick={clearAll} disabled={busy}><RotateCcw size={15} /> Click to Clear</button>
              </div>

              <div className="sr-links">
                <button type="button" className="sr-btn sr-outline" onClick={onLogin}><LogIn size={16} /> If Already Registered Click to Login</button>
                <button type="button" className="sr-btn sr-outline" onClick={onRecover}><KeyRound size={16} /> If Forgot Password Click to Recover</button>
              </div>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={verify} className="sr-step sr-center">
              <div className="sr-badge"><ShieldCheck size={30} /></div>
              <h1>Verify your details</h1>
              <p className="sr-sub">Enter the OTPs sent to your mobile number and email id.</p>

              <div className={`sr-timer ${expired ? "end" : left < 300 ? "low" : ""}`}>
                <Clock size={15} /> {expired ? "OTP expired" : <>OTP expires in <b>{mmss(left)}</b></>}
                <span className="sr-track"><i style={{ width: `${(left / OTP_SECONDS) * 100}%` }} /></span>
              </div>

              {apiErr && <div className="sr-alert" role="alert"><AlertCircle size={16} /> {apiErr}</div>}

              <div className="sr-otp-block">
                <div className="sr-otp-h"><Smartphone size={16} /> Mobile OTP <small>sent to {maskedMobile}</small></div>
                <OtpInput label="Mobile OTP" value={otp.mobile} onChange={(x) => setOtp((o) => ({ ...o, mobile: x }))} disabled={expired || busy} />
              </div>
              <div className="sr-otp-block">
                <div className="sr-otp-h"><MailCheck size={16} /> Email OTP <small>sent to {maskedEmail}</small></div>
                <OtpInput label="Email OTP" value={otp.email} onChange={(x) => setOtp((o) => ({ ...o, email: x }))} disabled={expired || busy} />
              </div>

              {expired ? (
                <p className="sr-note">Your OTP has expired. Use the “Forget ID” link on the Login page to activate your account.</p>
              ) : (
                <p className="sr-note">Please keep your mobile switched on, and check your email’s inbox and spam folders.</p>
              )}

              <div className="sr-actions sr-actions-c">
                <button type="submit" className="sr-btn sr-primary" disabled={busy || expired || otp.mobile.length < 6 || otp.email.length < 6}>
                  {busy ? <><Loader2 size={17} className="sr-spin" /> Verifying…</> : <>Verify &amp; Activate <ArrowRight size={17} /></>}
                </button>
                <button type="button" className="sr-btn sr-ghost" onClick={expired ? onRecover : () => { setStep("form"); setApiErr(""); }}>
                  {expired ? <><KeyRound size={15} /> Go to Forget ID</> : <><ArrowLeft size={15} /> Edit details</>}
                </button>
              </div>
            </form>
          )}

          {step === "done" && (
            <div className="sr-step sr-center">
              <div className="sr-success"><CheckCircle2 size={46} /></div>
              <h1>Account activated</h1>
              <p className="sr-sub">Welcome, <b>{v.name.trim().split(" ")[0]}</b>! You will receive an SMS confirmation on {maskedMobile} shortly.</p>
              <div className="sr-actions sr-actions-c">
                <button className="sr-btn sr-primary" onClick={onLogin}><LogIn size={17} /> Continue to Login</button>
              </div>
            </div>
          )}

          <p className="sr-copy">© 2026 M.C.E. Society’s Abeda Inamdar Senior College</p>
        </section>
      </main>
    </div>
  );
}

/* ---------- styles ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap');

.sr-root{--navy:#14214f;--navy2:#1b2d6b;--maroon:#8a0b1c;--maroon2:#a50d22;--gold:#e8b923;--muted:#5d6785;--line:#dfe3f0;
  position:relative;overflow:hidden;min-height:100vh;display:grid;place-items:center;padding:72px 16px 40px;font-family:'Poppins',system-ui,sans-serif;font-style:normal;color:var(--navy);
  background:linear-gradient(135deg,#0c1740 0%,#1b2d6b 50%,#4a1236 100%)}
.sr-root::before{content:"";position:absolute;inset:-30px;background:var(--bg) center/cover;filter:blur(14px) brightness(.55);opacity:0;transition:opacity .4s}
.sr-root[style*="--bg"]::before{opacity:1}
.sr-root *{box-sizing:border-box;font-style:normal}
.sr-root button{font-family:inherit;cursor:pointer}
.sr-root :focus-visible{outline:3px solid rgba(232,185,35,.75);outline-offset:2px}
.sr-orb{position:absolute;border-radius:50%;filter:blur(60px);pointer-events:none}
.sr-o1{width:420px;height:420px;left:-120px;top:-120px;background:rgba(232,185,35,.16)}
.sr-o2{width:520px;height:520px;right:-160px;bottom:-200px;background:rgba(165,13,34,.35)}

.sr-back{position:absolute;top:22px;left:24px;z-index:2;display:inline-flex;align-items:center;gap:8px;padding:9px 18px;border-radius:999px;color:#fff;font-size:13px;font-weight:600;
  background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.25);backdrop-filter:blur(8px);transition:background .2s,transform .2s}
.sr-back:hover{background:rgba(255,255,255,.22);transform:translateX(-2px)}

.sr-card{position:relative;z-index:1;width:min(1140px,100%);display:grid;grid-template-columns:minmax(300px,430px) 1fr;border-radius:28px;overflow:hidden;
  background:#fff;box-shadow:0 50px 90px -30px rgba(0,0,0,.65);animation:sr-rise .7s cubic-bezier(.2,.8,.2,1) both}

/* left */
.sr-left{position:relative;overflow:hidden;padding:36px 32px 32px;color:#fff;background:linear-gradient(155deg,#14214f 0%,#1d2b66 55%,#4a1236 100%)}
.sr-lorb{position:absolute;border-radius:50%;pointer-events:none}
.sr-lo1{width:240px;height:240px;right:-90px;top:-80px;background:rgba(255,255,255,.07)}
.sr-lo2{width:260px;height:260px;left:-100px;bottom:-110px;background:rgba(138,11,28,.5)}
.sr-logo{position:relative;display:flex;align-items:center;justify-content:center;width:84px;height:84px;margin-bottom:18px;padding:6px;overflow:hidden;border-radius:50%;
  background:#fff;color:var(--navy2);box-shadow:0 0 0 4px rgba(232,185,35,.65),0 14px 24px -10px rgba(0,0,0,.5)}
.sr-logo img{display:block;width:68px;height:68px;flex-shrink:0;object-fit:contain}
.sr-soc{position:relative;margin:0 0 6px;font-size:11.5px;font-weight:600;letter-spacing:.18em;color:var(--gold);text-transform:uppercase}
.sr-college{position:relative;margin:0;font-family:'Playfair Display',serif;font-size:30px;line-height:1.2}
.sr-bar{position:relative;display:block;width:54px;height:4px;border-radius:4px;background:var(--gold);margin:16px 0 22px}

.sr-instr{position:relative;padding:18px 18px 8px;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(6px)}
.sr-instr h3{display:flex;align-items:center;gap:10px;margin:0 0 14px;font-size:14.5px;font-weight:600;color:var(--gold)}
.sr-instr ol{list-style:none;margin:0;padding:0}
.sr-instr li{display:flex;gap:12px;margin-bottom:13px;animation:sr-fade .5s both}
.sr-instr li span{flex-shrink:0;display:grid;place-items:center;width:24px;height:24px;margin-top:1px;border-radius:8px;font-size:12px;font-weight:600;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.2)}
.sr-instr li p{margin:0;font-size:12.8px;line-height:1.55;color:rgba(255,255,255,.86)}
.sr-instr li.sr-warn span{background:var(--gold);color:var(--navy);border-color:transparent}
.sr-instr li.sr-warn p{color:#ffd966;font-weight:500}

/* right */
.sr-right{display:flex;flex-direction:column;justify-content:space-between;padding:40px clamp(22px,4vw,48px) 22px;min-width:0}
.sr-step{animation:sr-fade .4s both}
.sr-right h1{margin:0;font-family:'Playfair Display',serif;font-size:clamp(26px,3vw,34px);line-height:1.15}
.sr-sub{margin:6px 0 24px;font-size:14px;color:var(--muted)}
.sr-sub b{color:var(--navy)}
.sr-alert{display:flex;align-items:center;gap:10px;margin:-6px 0 18px;padding:11px 14px;border-radius:12px;background:#fdecef;border:1px solid #f4c2cb;color:var(--maroon);font-size:13px;font-weight:500}

.sr-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px 22px;align-items:start}
.sr-field{min-width:0}
.sr-label{display:block;margin-bottom:7px;font-size:11.5px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:var(--navy)}
.sr-label b{color:var(--maroon2)}
.sr-input{position:relative;display:flex;align-items:center;height:50px;border-radius:12px;border:1px solid var(--line);background:#fff;overflow:hidden;transition:border-color .2s,box-shadow .2s}
.sr-input:hover{border-color:#c3cae2}
.sr-input:focus-within{border-color:var(--navy2);box-shadow:0 0 0 4px rgba(27,45,107,.12)}
.sr-ic{flex-shrink:0;margin:0 12px 0 14px;color:#8a93ad;transition:color .2s}
.sr-input:focus-within .sr-ic{color:var(--navy2)}
.sr-input input{flex:1;min-width:0;height:100%;padding:0 12px 0 0;border:0;outline:0;background:#eaf0fd;font:inherit;font-size:14.5px;color:var(--navy)}
.sr-input input::placeholder{color:#97a0b8;font-size:13.5px}
.sr-input:has(.sr-ic){background:#eaf0fd}
.sr-tick{margin:0 14px 0 6px;color:#12915a;flex-shrink:0;animation:sr-pop .25s}
.sr-eye{display:grid;place-items:center;align-self:stretch;width:48px;border:0;background:#fff;border-left:1px solid var(--line);color:#8a93ad;transition:color .2s}
.sr-eye:hover{color:var(--navy)}
.is-bad .sr-input{border-color:var(--maroon2);background:#fdf0f2;box-shadow:0 0 0 3px rgba(165,13,34,.1)}
.is-bad .sr-input input,.is-bad .sr-input:has(.sr-ic){background:#fdf0f2}
.is-ok .sr-input{border-color:#9bd9bb}
.sr-err{display:flex;align-items:center;gap:5px;margin-top:6px;font-size:12px;color:var(--maroon2);font-weight:500;animation:sr-fade .2s}
.sr-hint{display:block;margin-top:6px;font-size:11.5px;color:var(--maroon2);font-weight:500}

.sr-col{min-width:0}
.sr-captcha{display:flex;align-items:center;gap:12px;margin-top:10px}
.sr-captcha svg{display:block;width:150px;height:auto;border-radius:10px;border:1px solid var(--line);flex-shrink:0}
.sr-refresh{display:inline-flex;align-items:center;gap:6px;padding:7px 10px;border:0;border-radius:9px;background:none;color:var(--maroon2);font-size:12px;font-weight:600;transition:background .2s}
.sr-refresh:hover{background:#fbe6ea}
.sr-refresh:hover svg{animation:sr-spin .6s}

.sr-rules{grid-column:1;margin-top:-6px}
.sr-meter{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:9px}
.sr-meter i{height:5px;border-radius:5px;background:#e4e8f4;transition:background .3s}
.sr-meter[data-s="1"] i:nth-child(-n+1){background:#e0475a}
.sr-meter[data-s="2"] i:nth-child(-n+2){background:var(--gold)}
.sr-meter[data-s="3"] i:nth-child(-n+3){background:#5cc08e}
.sr-meter[data-s="4"] i{background:#12915a}
.sr-rules ul{list-style:none;margin:0;padding:0;display:grid;gap:4px}
.sr-rules li{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--muted);transition:color .2s}
.sr-rules li.ok{color:#0f7a4b}.sr-rules li.no{color:var(--maroon2)}
.sr-dot{width:5px;height:5px;margin:0 4px;border-radius:50%;background:#b4bcd2}

/* buttons */
.sr-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:26px}
.sr-actions-c{justify-content:center}
.sr-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;height:48px;padding:0 24px;border-radius:12px;font-size:14px;font-weight:600;border:2px solid transparent;transition:transform .15s,box-shadow .2s,background .2s,color .2s,filter .2s}
.sr-primary{min-width:210px;color:#fff;background:linear-gradient(180deg,var(--maroon2),var(--maroon));box-shadow:0 12px 24px -10px rgba(138,11,28,.75)}
.sr-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 16px 28px -10px rgba(138,11,28,.8)}
.sr-primary:active:not(:disabled){transform:translateY(0)}
.sr-primary:disabled{filter:grayscale(.6) opacity(.6);cursor:not-allowed;box-shadow:none}
.sr-primary svg:last-child{transition:transform .2s}.sr-primary:hover:not(:disabled) svg:last-child{transform:translateX(4px)}
.sr-ghost{color:var(--navy2);background:#eef2fd}
.sr-ghost:hover:not(:disabled){background:#dfe6fa}
.sr-ghost:disabled{opacity:.5;cursor:not-allowed}
.sr-outline{flex:1;min-width:230px;color:var(--navy2);background:#fff;border-color:var(--navy2);font-size:13px;padding:0 16px}
.sr-outline:hover{background:var(--navy2);color:#fff;transform:translateY(-2px)}
.sr-links{display:flex;flex-wrap:wrap;gap:12px;margin-top:22px;padding-top:22px;border-top:1px solid #edf0f7}
.shake{animation:sr-shake .45s}

/* otp / success */
.sr-center{text-align:center;max-width:460px;margin:0 auto}
.sr-badge,.sr-success{display:grid;place-items:center;width:72px;height:72px;margin:0 auto 16px;border-radius:22px;color:var(--navy2);background:#e8ecfb;animation:sr-pop .4s}
.sr-success{border-radius:50%;color:#12915a;background:#e1f5ec;box-shadow:0 0 0 10px rgba(18,145,90,.1)}
.sr-timer{position:relative;display:inline-flex;align-items:center;gap:8px;margin-bottom:22px;padding:8px 16px 12px;border-radius:999px;background:#fff6dc;border:1px solid #f3dd9a;color:#8a5a00;font-size:13px;overflow:hidden}
.sr-timer.low{background:#fdecef;border-color:#f4c2cb;color:var(--maroon2)}
.sr-timer.end{background:#eef0f6;border-color:var(--line);color:var(--muted)}
.sr-timer b{font-variant-numeric:tabular-nums}
.sr-track{position:absolute;left:0;right:0;bottom:0;height:4px;background:rgba(0,0,0,.06)}
.sr-track i{display:block;height:100%;background:var(--gold);transition:width 1s linear}
.sr-otp-block{margin-bottom:18px;text-align:left}
.sr-otp-h{display:flex;align-items:center;gap:8px;margin-bottom:9px;font-size:13px;font-weight:600}
.sr-otp-h svg{color:var(--maroon2)}.sr-otp-h small{margin-left:auto;font-size:11.5px;font-weight:400;color:var(--muted)}
.sr-otp{display:grid;grid-template-columns:repeat(6,1fr);gap:9px}
.sr-otp input{width:100%;height:54px;border-radius:12px;border:1px solid var(--line);background:#eaf0fd;text-align:center;font:600 20px 'Playfair Display',serif;color:var(--navy);outline:0;transition:border-color .2s,box-shadow .2s,transform .15s}
.sr-otp input:focus{border-color:var(--navy2);background:#fff;box-shadow:0 0 0 4px rgba(27,45,107,.12);transform:translateY(-2px)}
.sr-otp input:disabled{opacity:.5}
.sr-note{margin:4px 0 0;font-size:12.5px;color:var(--muted);line-height:1.5}

.sr-copy{margin:26px 0 0;padding-top:16px;border-top:1px solid #edf0f7;text-align:center;font-size:11.5px;color:#9aa3bd}
.sr-spin{animation:sr-spin 1s linear infinite}

@keyframes sr-rise{from{opacity:0;transform:translateY(24px) scale(.99)}to{opacity:1;transform:none}}
@keyframes sr-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes sr-pop{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}
@keyframes sr-spin{to{transform:rotate(360deg)}}
@keyframes sr-shake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}

@media (max-width:900px){
  .sr-card{grid-template-columns:1fr}
  .sr-left{padding:28px 24px}
}
@media (max-width:620px){
  .sr-grid{grid-template-columns:1fr}.sr-rules{grid-column:auto}
  .sr-primary,.sr-outline{width:100%}.sr-actions .sr-btn{flex:1}
  .sr-back{top:16px;left:16px}
}
@media (prefers-reduced-motion:reduce){.sr-root *{animation:none!important;transition:none!important}}
`;