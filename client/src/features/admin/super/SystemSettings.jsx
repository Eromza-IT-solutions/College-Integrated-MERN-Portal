import { useState, useEffect, useRef, useMemo } from "react";
import {
  Settings, ShieldCheck, Bell, HardDrive, ChevronDown, CheckCircle2, RotateCcw,
  Save, Loader2, Building2, CalendarDays, UserCog, Lock, Clock, KeyRound,
  Mail, MessageSquare, GraduationCap, BarChart3, CloudUpload, LogOut, User,
} from "lucide-react";

/* ---------- config ---------- */
const DEFAULTS = {
  name: "Abeda Inamdar Senior College", year: "2026 - 2027", role: "Student",
  twoFactor: true, timeout: "30", minLen: "8", lockout: false,
  email: true, sms: false, admissions: true, reports: false,
  autoBackup: true, freq: "Daily",
};

const TABS = [
  { id: "general", label: "General", icon: Settings, keys: ["name", "year", "role"] },
  { id: "security", label: "Security", icon: ShieldCheck, keys: ["twoFactor", "timeout", "minLen", "lockout"] },
  { id: "notifications", label: "Notifications", icon: Bell, keys: ["email", "sms", "admissions", "reports"] },
  { id: "backup", label: "Backup", icon: HardDrive, keys: ["autoBackup", "freq"] },
];

const YEARS = ["2024 - 2025", "2025 - 2026", "2026 - 2027", "2027 - 2028"];
const ROLES = ["Student", "Teacher", "Staff", "Parent"];

/* ---------- small components ---------- */
function Select({ value, onChange, options, id }) {
  return (
    <div className="select">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => {
          const v = typeof o === "string" ? o : o.value;
          const l = typeof o === "string" ? o : o.label;
          return <option key={v} value={v}>{l}</option>;
        })}
      </select>
      <ChevronDown size={16} />
    </div>
  );
}

function Toggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label}
      className={`switch ${on ? "on" : ""}`} onClick={() => onChange(!on)}>
      <i />
    </button>
  );
}

function Row({ label, hint, icon: Icon, htmlFor, children, wide }) {
  return (
    <div className={`row ${wide ? "row-wide" : ""}`}>
      <div className="row-label">
        <label htmlFor={htmlFor}>{Icon && <Icon size={15} />}{label}</label>
        {hint && <small>{hint}</small>}
      </div>
      <div className="row-ctl">{children}</div>
    </div>
  );
}

function Preview({ s }) {
  const ref = useRef(null);
  const move = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.setProperty("--rx", `${(-y * 8).toFixed(2)}deg`);
    el.style.setProperty("--ry", `${(x * 8).toFixed(2)}deg`);
  };
  const leave = () => { ref.current?.style.setProperty("--rx", "0deg"); ref.current?.style.setProperty("--ry", "0deg"); };
  return (
    <aside className="preview" ref={ref} onMouseMove={move} onMouseLeave={leave}>
      <span className="p-orb o1" /><span className="p-orb o2" />
      <div className="p-icon"><Settings size={38} /></div>
      <p className="p-soc">M.C.E. Society’s</p>
      <h3 key={s.name}>{s.name.trim() || "Your college name"}</h3>
      <span className="p-bar" />
      <div className="p-chips">
        <span><CalendarDays size={13} /> {s.year}</span>
        <span><UserCog size={13} /> New users: {s.role}</span>
      </div>
      <div className="p-foot">
        <span className={s.twoFactor ? "ok" : ""}><ShieldCheck size={14} /> 2-step {s.twoFactor ? "on" : "off"}</span>
        <span className={s.autoBackup ? "ok" : ""}><HardDrive size={14} /> {s.autoBackup ? s.freq : "No"} backup</span>
      </div>
    </aside>
  );
}

/* ---------- page ---------- */
export default function SystemSettings() {
  const [saved, setSaved] = useState(DEFAULTS);
  const [s, setS] = useState(DEFAULTS);
  const [tab, setTab] = useState("general");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(false);
  const [menu, setMenu] = useState(false);
  const [backup, setBackup] = useState({ running: false, pct: 0, last: "Today, 02:00 AM" });
  const menuRef = useRef(null);

  const set = (k) => (v) => setS((p) => ({ ...p, [k]: v }));
  const dirtyKeys = useMemo(() => Object.keys(s).filter((k) => s[k] !== saved[k]), [s, saved]);
  const dirty = dirtyKeys.length > 0;
  const tabDirty = (t) => t.keys.some((k) => dirtyKeys.includes(k));
  const nameOk = s.name.trim().length > 2;

  useEffect(() => {
    const close = (e) => menuRef.current && !menuRef.current.contains(e.target) && setMenu(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = () => {
    if (!dirty || !nameOk || saving) return;
    setSaving(true);
    // TODO: replace with your API call, e.g. await api.put("/settings", s)
    setTimeout(() => {
      setSaved(s); setSaving(false); setToast(true);
      setTimeout(() => setToast(false), 2600);
    }, 900);
  };

  const runBackup = () => {
    if (backup.running) return;
    setBackup((b) => ({ ...b, running: true, pct: 0 }));
    const id = setInterval(() => {
      setBackup((b) => {
        const pct = Math.min(b.pct + 7 + Math.random() * 9, 100);
        if (pct >= 100) { clearInterval(id); return { running: false, pct: 100, last: "Just now" }; }
        return { ...b, pct };
      });
    }, 220);
  };

  const idx = TABS.findIndex((t) => t.id === tab);

  return (
    <div className="ss">
      <style>{CSS}</style>

      <header className="top">
        <div>
          <h1>System Settings</h1>
          <p>Configure how the college portal looks, behaves and protects data.</p>
        </div>
        <div className="top-actions">
          <button className="bell" aria-label="Notifications"><Bell size={18} /><i /></button>
          <div className="profile" ref={menuRef}>
            <button className="profile-btn" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
              <span className="avatar">SA</span><b>Super Admin</b>
              <ChevronDown size={16} className={menu ? "flip" : ""} />
            </button>
            {menu && (
              <div className="dropdown">
                <button><User size={16} /> My profile</button>
                <button className="danger"><LogOut size={16} /> Sign out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <section className="panel">
        <nav className="tabs" role="tablist" style={{ "--i": idx, "--n": TABS.length }}>
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>
              <t.icon size={17} /> {t.label}
              {tabDirty(t) && <span className="dot" title="Unsaved changes" />}
            </button>
          ))}
          <span className="underline" />
        </nav>

        <div className="body" key={tab}>
          {tab === "general" && (
            <div className="split">
              <Preview s={s} />
              <div className="form">
                <Row label="College Name" icon={Building2} htmlFor="name">
                  <input id="name" className={`input ${nameOk ? "" : "bad"}`} value={s.name}
                    onChange={(e) => set("name")(e.target.value)} placeholder="Enter college name" />
                  {!nameOk && <em className="err">College name must be at least 3 characters.</em>}
                </Row>
                <Row label="Academic Year" icon={CalendarDays} htmlFor="year">
                  <Select id="year" value={s.year} onChange={set("year")} options={YEARS} />
                </Row>
                <Row label="Default Role" icon={UserCog} hint="Given to newly created accounts" htmlFor="role">
                  <Select id="role" value={s.role} onChange={set("role")} options={ROLES} />
                </Row>
              </div>
            </div>
          )}

          {tab === "security" && (
            <div className="form single">
              <Row label="Two-step verification" icon={Lock} hint="Ask for a code when admins sign in" wide>
                <Toggle on={s.twoFactor} onChange={set("twoFactor")} label="Two-step verification" />
              </Row>
              <Row label="Session timeout" icon={Clock} hint="Sign out inactive users automatically" htmlFor="timeout">
                <Select id="timeout" value={s.timeout} onChange={set("timeout")}
                  options={[{ value: "15", label: "15 minutes" }, { value: "30", label: "30 minutes" }, { value: "60", label: "1 hour" }, { value: "120", label: "2 hours" }]} />
              </Row>
              <Row label="Minimum password length" icon={KeyRound} htmlFor="minLen">
                <Select id="minLen" value={s.minLen} onChange={set("minLen")}
                  options={[{ value: "8", label: "8 characters" }, { value: "10", label: "10 characters" }, { value: "12", label: "12 characters" }]} />
              </Row>
              <Row label="Lock account after 5 failed sign-ins" icon={ShieldCheck} hint="Unlock from the Manage Users page" wide>
                <Toggle on={s.lockout} onChange={set("lockout")} label="Lock account after failed sign-ins" />
              </Row>
            </div>
          )}

          {tab === "notifications" && (
            <div className="form single">
              <Row label="Email alerts" icon={Mail} hint="Account activity and system notices" wide>
                <Toggle on={s.email} onChange={set("email")} label="Email alerts" />
              </Row>
              <Row label="SMS alerts" icon={MessageSquare} hint="Urgent security messages only" wide>
                <Toggle on={s.sms} onChange={set("sms")} label="SMS alerts" />
              </Row>
              <Row label="New admission applications" icon={GraduationCap} hint="Notify the Admission Admin panel" wide>
                <Toggle on={s.admissions} onChange={set("admissions")} label="Admission notifications" />
              </Row>
              <Row label="Weekly AQAR report" icon={BarChart3} hint="Sent every Monday morning" wide>
                <Toggle on={s.reports} onChange={set("reports")} label="Weekly report" />
              </Row>
            </div>
          )}

          {tab === "backup" && (
            <div className="form single">
              <Row label="Automatic backups" icon={CloudUpload} hint="Keep a copy of portal data safe" wide>
                <Toggle on={s.autoBackup} onChange={set("autoBackup")} label="Automatic backups" />
              </Row>
              <Row label="Backup frequency" icon={Clock} htmlFor="freq">
                <Select id="freq" value={s.freq} onChange={set("freq")} options={["Daily", "Weekly", "Monthly"]} />
              </Row>
              <div className="backup-card">
                <div>
                  <b>Last backup</b>
                  <span>{backup.last}</span>
                </div>
                <button className="btn-outline" onClick={runBackup} disabled={backup.running}>
                  {backup.running ? <><Loader2 size={16} className="spin" /> Backing up…</> : <><CloudUpload size={16} /> Back up now</>}
                </button>
                {(backup.running || backup.pct === 100) && (
                  <div className="bar"><i style={{ width: `${backup.pct}%` }} /></div>
                )}
              </div>
            </div>
          )}
        </div>

        <footer className="bar-foot">
          <span className={`state ${dirty ? "warn" : "ok"}`}>
            {dirty ? <><i className="pulse" /> {dirtyKeys.length} unsaved change{dirtyKeys.length > 1 && "s"}</>
                   : <><CheckCircle2 size={16} /> All changes saved</>}
          </span>
          <div className="actions">
            <button className="btn-ghost" onClick={() => setS(saved)} disabled={!dirty || saving}><RotateCcw size={15} /> Reset</button>
            <button className="btn-primary" onClick={save} disabled={!dirty || !nameOk || saving}>
              {saving ? <><Loader2 size={16} className="spin" /> Saving…</> : <><Save size={16} /> Save Changes</>}
            </button>
          </div>
        </footer>
      </section>

      <div className={`toast ${toast ? "show" : ""}`} role="status"><CheckCircle2 size={18} /> Settings saved</div>
    </div>
  );
}

/* ---------- styles ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap');

.ss{--navy:#14214f;--navy2:#1b2d6b;--maroon:#8a0b1c;--maroon2:#a50d22;--gold:#e8b923;--muted:#5d6785;--line:#e4e7f0;--bg:#f6f4f2;
  min-height:100vh;padding:32px clamp(16px,4vw,44px) 40px;font-family:'Poppins',system-ui,sans-serif;color:var(--navy);
  background:radial-gradient(900px 420px at 100% -10%,rgba(138,11,28,.10),transparent 60%),radial-gradient(800px 420px at -10% 0%,rgba(27,45,107,.10),transparent 60%),var(--bg)}
.ss *{box-sizing:border-box}
.ss button{font-family:inherit;cursor:pointer}
.ss :focus-visible{outline:3px solid rgba(232,185,35,.7);outline-offset:2px}

.top{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex-wrap:wrap;margin-bottom:24px}
.top h1{font-family:'Playfair Display',serif;font-size:clamp(28px,4vw,38px);margin:0;line-height:1.1}
.top h1::after{content:"";display:block;width:56px;height:4px;border-radius:4px;background:var(--gold);margin-top:10px}
.top p{margin:10px 0 0;color:var(--muted);font-size:14px}
.top-actions{display:flex;align-items:center;gap:12px}
.bell{position:relative;width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:#fff;display:grid;place-items:center;color:var(--navy);box-shadow:0 6px 16px -10px rgba(20,33,79,.5);transition:transform .15s}
.bell:hover{transform:translateY(-2px)}
.bell i{position:absolute;top:10px;right:11px;width:8px;height:8px;border-radius:50%;background:var(--maroon2);border:2px solid #fff}
.profile{position:relative}
.profile-btn{display:flex;align-items:center;gap:10px;padding:5px 12px 5px 5px;border-radius:999px;border:1px solid var(--line);background:#fff;color:var(--navy);font-size:14px;box-shadow:0 6px 16px -10px rgba(20,33,79,.5)}
.profile-btn svg{transition:transform .2s}.profile-btn .flip{transform:rotate(180deg)}
.avatar{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;color:#fff;font-size:12px;font-weight:600;background:linear-gradient(135deg,var(--navy2),var(--maroon))}
.dropdown{position:absolute;right:0;top:calc(100% + 8px);min-width:180px;padding:6px;border-radius:14px;background:#fff;border:1px solid var(--line);box-shadow:0 20px 40px -16px rgba(20,33,79,.4);z-index:20;animation:pop .16s ease-out}
.dropdown button{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:0;background:none;border-radius:9px;font-size:14px;color:var(--navy);text-align:left}
.dropdown button:hover{background:#f1f3fa}.dropdown .danger{color:var(--maroon)}

.panel{background:#fff;border:1px solid var(--line);border-radius:24px;box-shadow:0 24px 50px -34px rgba(20,33,79,.6);overflow:hidden;display:flex;flex-direction:column;min-height:560px}

.tabs{--i:0;--n:4;position:relative;display:flex;gap:6px;padding:0 20px;border-bottom:1px solid var(--line);overflow-x:auto}
.tabs button{position:relative;display:flex;align-items:center;gap:8px;padding:20px 20px 18px;border:0;background:none;font-size:14px;font-weight:500;color:var(--muted);white-space:nowrap;transition:color .2s}
.tabs button:hover{color:var(--navy)}
.tabs button.on{color:var(--maroon);font-weight:600}
.tabs .dot{width:7px;height:7px;border-radius:50%;background:var(--gold);box-shadow:0 0 0 3px rgba(232,185,35,.25)}
.tabs .underline{display:none}
.tabs button.on::after{content:"";position:absolute;left:14px;right:14px;bottom:-1px;height:3px;border-radius:3px 3px 0 0;background:linear-gradient(90deg,var(--maroon),var(--maroon2));animation:grow .3s ease-out}

.body{flex:1;padding:30px clamp(16px,3vw,32px);animation:fade .3s ease-out}
.split{display:grid;grid-template-columns:minmax(260px,320px) 1fr;gap:clamp(24px,4vw,48px);align-items:start}
.form{display:flex;flex-direction:column;gap:6px}
.form.single{max-width:760px}

.row{display:grid;grid-template-columns:200px 1fr;gap:20px;align-items:center;padding:14px 0}
.form.single .row{border-bottom:1px solid #eef0f6}
.row-label label{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600}
.row-label label svg{color:var(--maroon)}
.row-label small{display:block;margin-top:3px;font-size:12px;color:var(--muted);line-height:1.4}
.row-wide .row-ctl{display:flex;justify-content:flex-end}
.row-ctl{min-width:0}

.input,.select select{width:100%;height:48px;padding:0 16px;border-radius:12px;border:1px solid var(--line);background:#eef2fd;font:inherit;font-size:14.5px;color:var(--navy);outline:0;transition:border-color .2s,box-shadow .2s,background .2s}
.input:hover,.select select:hover{border-color:#c5cce3}
.input:focus,.select select:focus{border-color:var(--navy2);background:#fff;box-shadow:0 0 0 4px rgba(27,45,107,.12)}
.input.bad{border-color:var(--maroon2);background:#fdf0f2}
.err{display:block;margin-top:6px;font-size:12px;color:var(--maroon);font-style:normal}
.select{position:relative}
.select select{appearance:none;-webkit-appearance:none;padding-right:42px;cursor:pointer}
.select svg{position:absolute;right:16px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--muted)}

.switch{width:50px;height:28px;border:0;padding:3px;border-radius:999px;background:#b9bfd1;transition:background .25s;display:block;flex-shrink:0}
.switch i{display:block;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.25);transition:transform .25s cubic-bezier(.3,1.4,.5,1)}
.switch.on{background:#12915a}.switch.on i{transform:translateX(22px)}

/* preview */
.preview{--rx:0deg;--ry:0deg;position:relative;overflow:hidden;padding:34px 24px 28px;border-radius:22px;color:#fff;text-align:center;
  background:linear-gradient(150deg,#14214f 0%,#1d2b66 55%,#4a1236 100%);box-shadow:0 26px 40px -26px rgba(20,33,79,.8);
  transform:perspective(800px) rotateX(var(--rx)) rotateY(var(--ry));transition:transform .25s ease-out;position:sticky;top:20px}
.p-orb{position:absolute;border-radius:50%}
.o1{width:170px;height:170px;right:-60px;top:-60px;background:rgba(255,255,255,.07)}
.o2{width:200px;height:200px;left:-80px;bottom:-90px;background:rgba(138,11,28,.45)}
.p-icon{position:relative;width:84px;height:84px;margin:0 auto 18px;border-radius:24px;display:grid;place-items:center;color:var(--navy2);background:#fff;
  box-shadow:0 0 0 5px rgba(232,185,35,.5),0 16px 28px -12px rgba(0,0,0,.5)}
.p-icon svg{animation:spin 14s linear infinite}
.p-soc{position:relative;margin:0 0 6px;font-size:11px;font-weight:600;letter-spacing:.16em;color:var(--gold);text-transform:uppercase}
.preview h3{position:relative;margin:0;font-family:'Playfair Display',serif;font-size:24px;line-height:1.25;animation:fade .3s}
.p-bar{position:relative;display:block;width:44px;height:3px;border-radius:3px;background:var(--gold);margin:14px auto}
.p-chips{position:relative;display:flex;flex-wrap:wrap;justify-content:center;gap:8px}
.p-chips span{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:500;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.22);backdrop-filter:blur(4px)}
.p-foot{position:relative;display:flex;flex-direction:column;gap:8px;margin-top:22px;padding-top:16px;border-top:1px solid rgba(255,255,255,.15)}
.p-foot span{display:flex;align-items:center;justify-content:center;gap:7px;font-size:12.5px;color:rgba(255,255,255,.6)}
.p-foot span.ok{color:#7af0b4}

/* backup */
.backup-card{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:14px;margin-top:20px;padding:18px 20px;border-radius:16px;background:#f6f7fc;border:1px solid var(--line)}
.backup-card b{display:block;font-size:14px}.backup-card span{font-size:13px;color:var(--muted)}
.bar{width:100%;height:8px;border-radius:8px;background:#e1e5f2;overflow:hidden}
.bar i{display:block;height:100%;border-radius:8px;background:linear-gradient(90deg,var(--gold),#12915a);transition:width .22s linear}
.btn-outline{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border-radius:12px;border:2px solid var(--navy2);background:#fff;color:var(--navy2);font-weight:600;font-size:14px;transition:all .2s}
.btn-outline:hover:not(:disabled){background:var(--navy2);color:#fff}
.btn-outline:disabled{opacity:.7;cursor:progress}

/* footer */
.bar-foot{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;padding:18px clamp(16px,3vw,32px);border-top:1px solid var(--line);background:#fafbfe}
.state{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600}
.state.ok{color:#12915a}.state.warn{color:#a87203}
.pulse{width:9px;height:9px;border-radius:50%;background:var(--gold);animation:pulse 1.4s infinite}
.actions{display:flex;gap:10px}
.btn-ghost{display:inline-flex;align-items:center;gap:8px;padding:12px 18px;border-radius:12px;border:0;background:none;color:var(--muted);font-weight:600;font-size:14px}
.btn-ghost:hover:not(:disabled){background:#eef0f7;color:var(--navy)}
.btn-ghost:disabled{opacity:.45;cursor:not-allowed}
.btn-primary{display:inline-flex;align-items:center;gap:8px;border:0;color:#fff;font-weight:600;font-size:14px;padding:12px 24px;border-radius:12px;
  background:linear-gradient(180deg,var(--maroon2),var(--maroon));box-shadow:0 10px 22px -8px rgba(138,11,28,.65);transition:transform .15s,box-shadow .15s,filter .2s}
.btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 14px 26px -8px rgba(138,11,28,.75)}
.btn-primary:disabled{filter:grayscale(.7) opacity(.5);cursor:not-allowed;box-shadow:none}
.spin{animation:spin 1s linear infinite}

.toast{position:fixed;right:28px;bottom:28px;display:flex;align-items:center;gap:10px;padding:14px 20px;border-radius:14px;background:var(--navy);color:#fff;font-size:14px;font-weight:500;
  box-shadow:0 20px 40px -14px rgba(20,33,79,.7);border-left:4px solid var(--gold);transform:translateY(30px);opacity:0;pointer-events:none;transition:all .3s cubic-bezier(.3,1.2,.5,1);z-index:60}
.toast svg{color:#5cf2a6}
.toast.show{transform:none;opacity:1}

@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
@keyframes grow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(232,185,35,.6)}70%{box-shadow:0 0 0 8px rgba(232,185,35,0)}100%{box-shadow:0 0 0 0 rgba(232,185,35,0)}}

@media (max-width:860px){
  .split{grid-template-columns:1fr}.preview{position:relative;top:0}
  .row{grid-template-columns:1fr;gap:10px}.row-wide{grid-template-columns:1fr auto;align-items:center}
  .profile-btn b{display:none}
}
@media (prefers-reduced-motion:reduce){.ss *{animation:none!important;transition:none!important}}
`;