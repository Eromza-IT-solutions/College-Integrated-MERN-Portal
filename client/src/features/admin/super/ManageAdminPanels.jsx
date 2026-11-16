import { useState, useEffect, useMemo, useRef } from "react";
import {
  Landmark, GraduationCap, BarChart3, ShieldCheck, CheckCircle2, Users,
  Plus, Search, ArrowRight, Clock, X,
  BookOpen, Library, FlaskConical,
} from "lucide-react";

/* ---------- data ---------- */
const ICONS = { Landmark, GraduationCap, BarChart3, BookOpen, Library, FlaskConical };
const TONES = ["navy", "emerald", "maroon", "gold"];

const INITIAL_PANELS = [
  { id: 1, name: "College Admin", desc: "Manage college content and info", icon: "Landmark", tone: "navy",
    admins: ["AK", "OF"], updated: "2 hours ago", active: true },
  { id: 2, name: "Admission Admin", desc: "Handle admissions and applications", icon: "GraduationCap", tone: "emerald",
    admins: ["SP"], updated: "1 day ago", active: true },
  { id: 3, name: "Criterion Admin", desc: "Manage AQAR criteria & metrics", icon: "BarChart3", tone: "maroon",
    admins: ["IQ", "RK", "ZA"], updated: "5 hours ago", active: true },
];

/* ---------- hooks ---------- */
function useCountUp(target, duration = 700) {
  const [val, setVal] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const begin = from.current;
    let raf;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(begin + (target - begin) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

/* ---------- small components ---------- */
function StatCard({ icon: Icon, value, label, tone }) {
  const n = useCountUp(value);
  return (
    <div className={`stat stat-${tone}`}>
      <div className="stat-icon"><Icon size={22} /></div>
      <div>
        <div className="stat-num">{n}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

function PanelCard({ panel, onToggle, onManage, index }) {
  const Icon = ICONS[panel.icon] || Landmark;
  const n = panel.admins.length;
  return (
    <article className={`card tone-${panel.tone} ${panel.active ? "" : "is-off"}`}
      style={{ animationDelay: `${index * 90}ms` }}>
      <div className="card-head">
        <span className="pc-ring pc-r1" /><span className="pc-ring pc-r2" />
        <Icon className="watermark" size={120} strokeWidth={1.2} />
        <div className="head-row">
          <div className="card-icon"><Icon size={26} /></div>
          <span className="chip"><i /> {panel.active ? "Active" : "Disabled"}</span>
        </div>
      </div>

      <div className="card-body">
        <h3>{panel.name}</h3>
        <p>{panel.desc}</p>

        <div className="meta">
          <div className="avatars">
            {n === 0 && <span className="none">No admins yet</span>}
            {panel.admins.map((a) => <span key={a} className="avatar">{a}</span>)}
            <button className="add-admin" title="Assign admin" aria-label="Assign admin"><Plus size={13} /></button>
          </div>
          <span className="foot-time"><Clock size={12} /> {panel.updated}</span>
        </div>
      </div>

      <footer>
        <label className="switch-wrap">
          <button role="switch" aria-checked={panel.active} aria-label={`Toggle ${panel.name}`}
            className={`switch ${panel.active ? "on" : ""}`} onClick={() => onToggle(panel.id)}>
            <i />
          </button>
          <span>{n} admin{n !== 1 && "s"}</span>
        </label>
        <button className="manage" onClick={() => onManage(panel)} disabled={!panel.active}>
          Manage <ArrowRight size={16} />
        </button>
      </footer>
    </article>
  );
}

function AddPanelModal({ onClose, onCreate }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [icon, setIcon] = useState("Landmark");
  const valid = name.trim().length > 1;

  useEffect(() => {
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    if (valid) onCreate({ name: name.trim(), desc: desc.trim() || "New department panel", icon });
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <form className="modal" onMouseDown={(e) => e.stopPropagation()} onSubmit={submit}>
        <button type="button" className="modal-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        <h2>Create new panel</h2>
        <p className="modal-sub">Add a panel for another department, then assign admins to it.</p>

        <label className="field">
          <span>Panel name</span>
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Library Admin" />
        </label>
        <label className="field">
          <span>Description</span>
          <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What will this panel manage?" />
        </label>

        <div className="field">
          <span>Icon</span>
          <div className="icon-pick">
            {Object.entries(ICONS).map(([key, I]) => (
              <button type="button" key={key} className={icon === key ? "sel" : ""}
                onClick={() => setIcon(key)} aria-label={key}><I size={20} /></button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!valid}>Create panel</button>
        </div>
      </form>
    </div>
  );
}

/* ---------- page ---------- */
export default function ManageAdminPanels({ onManage = (p) => console.log("Manage", p.name) }) {
  const [panels, setPanels] = useState(INITIAL_PANELS);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);

  const stats = useMemo(() => ({
    total: panels.length,
    active: panels.filter((p) => p.active).length,
    admins: panels.reduce((s, p) => s + p.admins.length, 0),
  }), [panels]);

  const visible = panels.filter((p) => {
    const q = query.trim().toLowerCase();
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
    const matchF = filter === "all" || (filter === "active" ? p.active : !p.active);
    return matchQ && matchF;
  });

  const toggle = (id) =>
    setPanels((ps) => ps.map((p) => (p.id === id ? { ...p, active: !p.active, updated: "just now" } : p)));

  const create = ({ name, desc, icon }) => {
    setPanels((ps) => [...ps, {
      id: Date.now(), name, desc, icon, tone: TONES[ps.length % TONES.length],
      admins: [], updated: "just now", active: true,
    }]);
    setShowModal(false);
  };

  const tabs = ["all", "active", "disabled"];

  return (
    <div className="ap-page">
      <style>{CSS}</style>

      <section className="stats">
        <StatCard icon={ShieldCheck} value={stats.total} label="Total panels" tone="navy" />
        <StatCard icon={CheckCircle2} value={stats.active} label="Active panels" tone="emerald" />
        <StatCard icon={Users} value={stats.admins} label="Admins assigned" tone="gold" />
      </section>

      <section className="toolbar">
        <div className="tabs" role="tablist" style={{ "--i": tabs.indexOf(filter) }}>
          <span className="tab-pill" />
          {tabs.map((t) => (
            <button key={t} role="tab" aria-selected={filter === t}
              className={filter === t ? "on" : ""} onClick={() => setFilter(t)}>
              {t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="search">
          <Search size={16} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search panels or admins…" />
        </div>
      </section>

      <section className="panel-grid">
        {visible.map((p, i) => (
          <PanelCard key={p.id} panel={p} index={i} onToggle={toggle} onManage={onManage} />
        ))}

        {filter === "all" && !query && (
          <button className="card create" onClick={() => setShowModal(true)}>
            <span className="create-plus"><Plus size={26} /></span>
            <h3>Create new panel</h3>
            <p>Add a panel for another department</p>
          </button>
        )}

        {visible.length === 0 && (
          <div className="empty">
            <b>No panels found</b>
            <span>Try a different search or switch the filter back to All.</span>
          </div>
        )}
      </section>

      {showModal && <AddPanelModal onClose={() => setShowModal(false)} onCreate={create} />}
    </div>
  );
}

/* ---------- styles ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap');

.ap-page{font-style:normal;
  --navy:#14214f; --navy2:#1b2d6b; --maroon:#8a0b1c; --maroon2:#a50d22; --gold:#e8b923;
  --ink:#14214f; --muted:#5d6785; --line:#e4e7f0; --bg:#f6f4f2;
  min-height:100vh; padding:32px clamp(16px,4vw,44px) 56px; box-sizing:border-box;
  font-family:'Poppins',system-ui,sans-serif; color:var(--ink);
  background:
    radial-gradient(900px 420px at 100% -10%, rgba(138,11,28,.10), transparent 60%),
    radial-gradient(800px 420px at -10% 0%, rgba(27,45,107,.10), transparent 60%),
    var(--bg);
}
.ap-page *{box-sizing:border-box;font-style:normal}
.ap-page button{font-family:inherit;cursor:pointer}
.ap-page :focus-visible{outline:3px solid rgba(232,185,35,.7);outline-offset:2px}

.btn-primary{display:inline-flex;align-items:center;gap:8px;border:0;color:#fff;font-weight:600;font-size:14px;
  padding:12px 20px;border-radius:12px;background:linear-gradient(180deg,var(--maroon2),var(--maroon));
  box-shadow:0 10px 22px -8px rgba(138,11,28,.65);transition:transform .15s, box-shadow .15s, filter .15s}
.btn-primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 14px 26px -8px rgba(138,11,28,.75)}
.btn-primary:active:not(:disabled){transform:translateY(0)}
.btn-primary:disabled{filter:grayscale(.6) opacity(.55);cursor:not-allowed}
.btn-ghost{border:1px solid var(--line);background:#fff;color:var(--navy);font-weight:600;font-size:14px;padding:12px 20px;border-radius:12px}
.btn-ghost:hover{background:#f1f3fa}

.avatar{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#fff;color:var(--navy);
  font-size:10px;font-weight:600;border:2px solid #fff;box-shadow:0 0 0 1px var(--line)}

/* stats */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;margin-bottom:24px}
.stat{display:flex;align-items:center;gap:16px;padding:20px 22px;border-radius:18px;background:#fff;border:1px solid var(--line);
  box-shadow:0 14px 30px -22px rgba(20,33,79,.55);transition:transform .2s, box-shadow .2s;position:relative;overflow:hidden}
.stat::before{content:"";position:absolute;left:0;top:18%;bottom:18%;width:4px;border-radius:0 4px 4px 0;background:var(--c)}
.stat:hover{transform:translateY(-3px);box-shadow:0 20px 34px -20px rgba(20,33,79,.55)}
.stat-icon{width:48px;height:48px;border-radius:14px;display:grid;place-items:center;color:var(--c);background:var(--cb)}
.stat-num{font-family:'Playfair Display',serif;font-size:32px;font-weight:700;line-height:1}
.stat-label{margin-top:4px;font-size:13px;color:var(--muted)}
.stat-navy{--c:#1b2d6b;--cb:#e8ecfb}.stat-emerald{--c:#12915a;--cb:#e1f5ec}.stat-gold{--c:#c98a06;--cb:#fdf1d6}

/* toolbar */
.toolbar{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:20px}
.tabs{--i:0;position:relative;display:grid;grid-template-columns:repeat(3,1fr);padding:4px;border-radius:14px;background:#fff;border:1px solid var(--line)}
.tab-pill{position:absolute;top:4px;bottom:4px;left:4px;width:calc((100% - 8px)/3);border-radius:10px;background:var(--navy);
  transform:translateX(calc(var(--i) * 100%));transition:transform .28s cubic-bezier(.3,.9,.3,1)}
.tabs button{position:relative;z-index:1;border:0;background:none;padding:8px 20px;font-size:13px;font-weight:500;color:var(--muted);transition:color .2s}
.tabs button.on{color:#fff}
.search{display:flex;align-items:center;gap:10px;width:min(100%,320px);padding:0 14px;height:44px;border-radius:12px;background:#fff;
  border:1px solid var(--line);color:var(--muted);transition:border-color .2s, box-shadow .2s}
.search:focus-within{border-color:var(--navy2);box-shadow:0 0 0 4px rgba(27,45,107,.1)}
.search input{flex:1;border:0;outline:0;background:none;font:inherit;font-size:14px;color:var(--ink)}

/* cards */
.panel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:24px}
.card{position:relative;display:flex;flex-direction:column;overflow:hidden;border-radius:24px;background:#fff;border:1px solid var(--line);
  box-shadow:0 16px 36px -26px rgba(20,33,79,.6);transition:transform .28s, box-shadow .28s, filter .3s;animation:rise .55s cubic-bezier(.2,.8,.2,1) both}
.card:hover{transform:translateY(-6px);box-shadow:0 30px 50px -28px var(--sh)}

.card-head{position:relative;height:132px;padding:18px 18px 0;overflow:hidden;color:#fff;
  background:linear-gradient(135deg,var(--g1),var(--g2))}
.pc-ring{position:absolute;border-radius:50%;border:1.5px solid rgba(255,255,255,.18)}
.pc-r1{width:170px;height:170px;right:-50px;top:-70px}
.pc-r2{width:110px;height:110px;right:20px;top:-30px;border-color:rgba(255,255,255,.12)}
.watermark{position:absolute;right:-14px;bottom:-26px;color:rgba(255,255,255,.12);transition:transform .5s}
.card:hover .watermark{transform:translate(-10px,-6px) rotate(-6deg) scale(1.08)}
.head-row{position:relative;display:flex;justify-content:space-between;align-items:flex-start}
.card-icon{width:56px;height:56px;border-radius:16px;display:grid;place-items:center;color:#fff;
  background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.32);backdrop-filter:blur(6px);
  box-shadow:0 10px 20px -10px rgba(0,0,0,.45);transition:transform .3s}
.card:hover .card-icon{transform:rotate(-6deg) scale(1.06)}
.chip{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:600;
  background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.28);backdrop-filter:blur(6px)}
.chip i{width:8px;height:8px;border-radius:50%;background:#5cf2a6;box-shadow:0 0 0 3px rgba(92,242,166,.3)}
.is-off .chip i{background:#c7ccdb;box-shadow:none}

.card-body{flex:1;display:flex;flex-direction:column;padding:20px 22px 6px}
.card h3{margin:0;font-family:'Playfair Display',serif;font-size:22px;color:var(--navy)}
.card h3::after{content:"";display:block;width:32px;height:3px;border-radius:3px;background:var(--gold);margin-top:8px}
.card p{margin:12px 0 18px;font-size:14px;line-height:1.55;color:var(--muted);flex:1}
.meta{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:#f6f7fc}
.avatars{display:flex;align-items:center}
.avatars .avatar{margin-left:-8px;width:30px;height:30px;font-size:10px;color:#fff;border:2px solid #f6f7fc;box-shadow:none;background:var(--g2)}
.avatars .avatar:first-child{margin-left:0}
.avatars .avatar:nth-child(2){background:var(--g1)}
.avatars .avatar:nth-child(3){background:#c98a06}
.none{font-size:12.5px;color:var(--muted);margin-right:8px}
.add-admin{width:30px;height:30px;margin-left:6px;border-radius:50%;border:1.5px dashed #aab2cc;background:#fff;color:var(--muted);display:grid;place-items:center;transition:all .2s}
.add-admin:hover{border-color:var(--maroon);color:var(--maroon);transform:rotate(90deg)}
.foot-time{display:flex;align-items:center;gap:5px;white-space:nowrap;font-size:11.5px;color:var(--muted)}

.card footer{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:16px 22px 20px}
.switch-wrap{display:flex;align-items:center;gap:10px;white-space:nowrap;font-size:12.5px;font-weight:600;color:var(--navy)}
.switch{width:44px;height:26px;border:0;padding:3px;border-radius:999px;background:#b9bfd1;transition:background .25s;display:block}
.switch i{display:block;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.25);transition:transform .25s cubic-bezier(.3,1.4,.5,1)}
.switch.on{background:#12915a}.switch.on i{transform:translateX(18px)}
.manage{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:12px;border:0;color:#fff;font-weight:600;font-size:14px;
  background:linear-gradient(135deg,var(--g1),var(--g2));box-shadow:0 10px 20px -10px var(--sh);transition:transform .2s, box-shadow .2s}
.manage svg{transition:transform .2s}
.manage:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 14px 22px -10px var(--sh)}
.manage:hover:not(:disabled) svg{transform:translateX(4px)}
.manage:disabled{opacity:.45;cursor:not-allowed}
.card.is-off{filter:grayscale(.85)}
.card.is-off .card-head{opacity:.85}

.tone-navy{--g1:#14214f;--g2:#2c4396;--sh:rgba(27,45,107,.6)}
.tone-emerald{--g1:#0a5c3b;--g2:#16a468;--sh:rgba(18,145,90,.55)}
.tone-maroon{--g1:#5c0614;--g2:#b3112a;--sh:rgba(138,11,28,.6)}
.tone-gold{--g1:#8a5a00;--g2:#e0a712;--sh:rgba(201,138,6,.55)}

.create{align-items:center;justify-content:center;text-align:center;min-height:380px;padding:28px 24px;background:rgba(255,255,255,.55);
  border:2px dashed #c3c9de;box-shadow:none;font-family:inherit;color:var(--navy)}
.create h3::after{margin:8px auto 0}
.create p{flex:0;margin-bottom:0}
.create:hover{border-color:var(--maroon);background:#fff;box-shadow:0 24px 40px -28px rgba(138,11,28,.5)}
.create-plus{display:grid;place-items:center;width:62px;height:62px;border-radius:50%;background:#e8ecfb;color:var(--navy2);margin-bottom:16px;transition:transform .3s, background .2s, color .2s}
.create:hover .create-plus{transform:rotate(90deg);background:var(--maroon);color:#fff}
.empty{grid-column:1/-1;display:flex;flex-direction:column;gap:4px;align-items:center;padding:48px 16px;color:var(--muted);font-size:14px}
.empty b{color:var(--navy);font-size:16px}

/* modal */
.overlay{position:fixed;inset:0;z-index:50;display:grid;place-items:center;padding:16px;background:rgba(14,22,56,.55);backdrop-filter:blur(6px);animation:fade .2s}
.modal{position:relative;width:min(100%,460px);padding:30px;border-radius:22px;background:#fff;box-shadow:0 40px 80px -30px rgba(0,0,0,.6);animation:pop .22s ease-out}
.modal h2{margin:0;font-family:'Playfair Display',serif;font-size:26px;color:var(--navy)}
.modal-sub{margin:6px 0 20px;font-size:13.5px;color:var(--muted)}
.modal-x{position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:50%;border:0;background:#f1f3fa;color:var(--navy);display:grid;place-items:center}
.field{display:block;margin-bottom:16px}
.field>span{display:block;margin-bottom:6px;font-size:12px;font-weight:600;color:var(--navy)}
.field input{width:100%;height:46px;padding:0 14px;border-radius:12px;border:1px solid var(--line);background:#eef2fd;font:inherit;font-size:14px;color:var(--ink);outline:0;transition:border-color .2s, box-shadow .2s}
.field input:focus{border-color:var(--navy2);box-shadow:0 0 0 4px rgba(27,45,107,.12);background:#fff}
.icon-pick{display:flex;gap:8px;flex-wrap:wrap}
.icon-pick button{width:44px;height:44px;border-radius:12px;border:1.5px solid var(--line);background:#fff;color:var(--muted);display:grid;place-items:center;transition:all .15s}
.icon-pick button:hover{color:var(--navy)}
.icon-pick .sel{border-color:var(--maroon);color:var(--maroon);background:#fbeff2;transform:translateY(-2px)}
.modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:24px}

@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes fade{from{opacity:0}to{opacity:1}}
@keyframes pop{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.ap-page *{animation:none!important;transition:none!important}}
`;