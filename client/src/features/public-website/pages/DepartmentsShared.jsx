import { useEffect, useState } from "react";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Mail, Phone, GraduationCap, Briefcase, CalendarDays,
  MapPin, User, ExternalLink, Info,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* DATA                                                                */
/* ------------------------------------------------------------------ */

// Images come from the college site. To host them yourself, copy the
// /assets/images folder into /public and change this to "/assets/images".
export const IMG = "https://abedainamdarcollege.org.in/assets/images";
export const DETAIL_URL = (id) => `https://abedainamdarcollege.org.in/Departments_detail/d/${id}`;

const TOPPERS = [
  {
    img: `${IMG}/top3.jpg`, name: "Fernandes Valerie Jerome", course: "M.A. English II",
    rank: "1st Rank in order of the Merit(Gold Medalists)", marks: "81.81%", year: "2018",
    award: "Alegaonkar Bandu Suvarna Smruti",
  },
  {
    img: `${IMG}/top2.jpg`, name: "Ahmed Tayyeba Irshad", course: "T.Y.B.B.A (C.A)",
    rank: "8th Rank in order of the Merit in SPPU", marks: "84.00%", year: "2018", award: "-",
  },
  {
    img: `${IMG}/top1.jpg`, name: "Memon Rooman", course: "M.Sc-II(Mathematics)",
    rank: "6th Rank in order of the Merit in SPPU", marks: "85.00%", year: "2018", award: "-",
  },
  {
    img: `${IMG}/top4.jpg`, name: "Pathan Asiya Mukhtar", course: "ADVANCED COST ACCOUNTING & COST SYSTEM",
    rank: "1st rank in special subject 4th rank in M.COM, S.P.P.U.", marks: "85.00%", year: "2018", award: "-",
  },
];

const fmtDate = (d) => {
  const t = new Date(d);
  return isNaN(t) ? d : t.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const hideBroken = (e) => (e.currentTarget.style.visibility = "hidden");

/* ------------------------------------------------------------------ */
/* Toppers carousel                                                    */
/* ------------------------------------------------------------------ */

function Toppers() {
  const [i, setI] = useState(0);
  const n = TOPPERS.length;
  const t = TOPPERS[i];
  const rows = [
    ["NAME", t.name], ["COURSE & SUBJECT", t.course], ["RANK", t.rank],
    ["MARKS OBTAIN", t.marks], ["YEAR OF PASSING", t.year], ["AWARD OF IF ANY", t.award],
  ];

  return (
    <section className="card" aria-roledescription="carousel" aria-label="Our University Toppers">
      <div className="card-head">
        <h2>Our University Toppers</h2>
        <div className="arrows">
          <button type="button" onClick={() => setI((i - 1 + n) % n)} aria-label="Previous topper"><ChevronLeft size={16} /></button>
          <button type="button" onClick={() => setI((i + 1) % n)} aria-label="Next topper"><ChevronRight size={16} /></button>
        </div>
      </div>

      <div className="topper" key={i} aria-live="polite">
        <img src={t.img} alt={t.name} onError={hideBroken} />
        <dl>
          {rows.map(([k, v]) => (
            <div key={k}><dt>{k} :</dt> <dd>{v}</dd></div>
          ))}
        </dl>
      </div>

      <div className="dots" role="tablist" aria-label="Choose topper">
        {TOPPERS.map((_, k) => (
          <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`Topper ${k + 1}`}
            className={k === i ? "on" : ""} onClick={() => setI(k)} />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Department detail                                                   */
/* ------------------------------------------------------------------ */

const SECTIONS = [
  ["profile", "Department Profile"],
  ["people", "Head & Teachers"],
  ["events", "Events"],
  ["achievements", "Student Achievements"],
];

function DepartmentDetail({ dept, details }) {
  const data = details[dept.id];
  const [sec, setSec] = useState("profile");
  const [more, setMore] = useState(false);

  useEffect(() => { setSec("profile"); setMore(false); }, [dept.id]);

  if (!data) {
    return (
      <section className="card">
        <h2 className="dept-title">DEPARTMENT OF {dept.name}</h2>
        <p className="empty">
          <Info size={18} /> The profile, faculty, events and achievements of this department will be displayed here soon.
        </p>
        <a className="ext" href={DETAIL_URL(dept.id)} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} /> View on the college website
        </a>
      </section>
    );
  }

  const long = data.profile.length > 700;
  const text = more || !long ? data.profile : data.profile.slice(0, 700).replace(/\s+\S*$/, "") + "…";

  return (
    <section className="card">
      <h2 className="dept-title">{data.title}</h2>

      <div className="pills" role="tablist">
        {SECTIONS.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={sec === id}
            className={sec === id ? "on" : ""} onClick={() => setSec(id)}>{label}</button>
        ))}
      </div>

      <div className="sec" key={sec}>
        {sec === "profile" && (
          <div className="profile">
            <img src={data.profileImg} alt="" onError={hideBroken} />
            <div>
              <h3>Department Profile</h3>
              <p>{text}</p>
              {long && (
                <button type="button" className="more" onClick={() => setMore(!more)}>
                  {more ? "Show less" : "Read more"}
                </button>
              )}
            </div>
          </div>
        )}

        {sec === "people" && (
          <>
            <h3>Head of Department</h3>
            <div className="person hod">
              <img src={data.hod.photo} alt={data.hod.name} onError={hideBroken} />
              <ul>
                <li><User size={15} /><b>Name</b><span>{data.hod.name}</span></li>
                <li><GraduationCap size={15} /><b>Education</b><span>{data.hod.education}</span></li>
                <li><Briefcase size={15} /><b>Experience</b><span>{data.hod.experience}</span></li>
                <li><Phone size={15} /><b>Contact No.</b><span><a href={`tel:${data.hod.phone}`}>{data.hod.phone}</a></span></li>
                <li><Mail size={15} /><b>Email</b><span><a href={`mailto:${data.hod.email}`}>{data.hod.email}</a></span></li>
              </ul>
            </div>

            <h3>Our Teachers</h3>
            <div className="grid">
              {data.teachers.map((t) => (
                <div className="person" key={t.name}>
                  <img src={t.photo} alt={t.name} onError={hideBroken} />
                  <ul>
                    <li><User size={15} /><b>Name</b><span>{t.name}</span></li>
                    <li><GraduationCap size={15} /><b>Education</b><span>{t.education}</span></li>
                    <li><Briefcase size={15} /><b>Experience</b><span>{t.experience}</span></li>
                  </ul>
                </div>
              ))}
            </div>
          </>
        )}

        {sec === "events" && (
          <div className="events">
            {data.events.map((e, k) => (
              <article key={k} className="event">
                <img src={e.img} alt={e.name} loading="lazy" onError={hideBroken} />
                <div>
                  <h3>{e.name}</h3>
                  <p className="meta">
                    <span><CalendarDays size={14} /> {fmtDate(e.date)}</span>
                    {e.venue && <span><MapPin size={14} /> {e.venue}</span>}
                    <span><User size={14} /> {e.incharge}</span>
                  </p>
                  <p>{e.details}</p>
                </div>
              </article>
            ))}
          </div>
        )}

        {sec === "achievements" && (
          <div className="grid ach">
            {data.achievements.map((a, k) => (
              <article key={k} className="ach-card">
                <img src={a.img} alt={a.name} loading="lazy" onError={hideBroken} />
                <h3>{a.name}</h3>
                <span className="cls">{a.cls}</span>
                <p>{a.text}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

/**
 * faculty = { title, departments: [{ id, name }], details: { [id]: {...} } }
 */
export default function DepartmentsPage({ faculty, initialDept = null, onBack }) {
  const fac = faculty;
  const [activeId, setActiveId] = useState(initialDept);
  const active = fac.departments.find((d) => d.id === activeId);

  useEffect(() => setActiveId(initialDept), [fac.title, initialDept]);

  const goHome = (e) => {
    if (onBack) {
      e.preventDefault();
      onBack();
    }
  };

  return (
    <div className="dep">
      <style>{css}</style>

      <header className="banner">
        <a href="/" className="back" onClick={goHome}><ArrowLeft size={14} /> Back to Home</a>
        <h1>Departments List</h1>
        <p>{fac.title}</p>
      </header>

      <div className="layout">
        <nav className="side" aria-label={`${fac.title} departments`}>
          <ul>
            {fac.departments.map((d) => (
              <li key={d.id}>
                <button type="button" className={"tab" + (d.id === activeId ? " active" : "")}
                  aria-current={d.id === activeId ? "true" : undefined}
                  onClick={() => { setActiveId(d.id === activeId ? null : d.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>
                  {d.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <main className="content">
          {active ? <DepartmentDetail dept={active} details={fac.details || {}} /> : <Toppers />}
        </main>
      </div>
    </div>
  );
}


const css = `
@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700&display=swap');
.dep{--navy:#1d3567;--red:#e11d48;--ink:#2a2f40;--mut:#5f6578;--line:#e3e6ef;
  font-family:'Open Sans',system-ui,sans-serif;color:var(--ink);background:#fff;min-height:100vh}
.dep *{box-sizing:border-box}

.banner{position:relative;height:150px;display:flex;flex-direction:column;justify-content:center;align-items:center;
  background:linear-gradient(rgba(20,25,50,.78),rgba(20,25,50,.78)),linear-gradient(115deg,#5b3a1e,#2b2f3a 45%,#6a4a2a)}
.banner h1{margin:0;color:#fff;font:700 36px 'Open Sans',sans-serif}
.banner p{margin:4px 0 0;color:#e3b82b;font-weight:600;letter-spacing:.08em;text-transform:uppercase;font-size:13px}
.back{position:absolute;top:16px;left:16px;display:inline-flex;align-items:center;gap:7px;padding:8px 16px;border-radius:999px;
  color:#fff;text-decoration:none;font:600 12px 'Open Sans',sans-serif;background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.45);backdrop-filter:blur(4px);transition:background .15s}
.back:hover{background:rgba(255,255,255,.24)}
.dep button:focus-visible,.back:focus-visible,.dep a:focus-visible{outline:3px solid #e3b82b;outline-offset:2px}

.layout{width:min(1160px,100%);margin:0 auto;padding:56px 20px 72px;display:grid;grid-template-columns:360px 1fr;gap:30px;align-items:start}

.side ul{list-style:none;margin:0;padding:0;display:grid;gap:8px}
.tab{display:flex;align-items:center;width:100%;min-height:43px;padding:10px 20px;text-align:left;cursor:pointer;
  background:var(--navy);color:#fff;border:0;border-right:6px solid var(--red);font:400 14px/1.4 'Open Sans',sans-serif;
  text-transform:uppercase;transition:background .15s,transform .15s}
.tab:hover{background:#27447f}
.tab.active{background:#14264f;font-weight:700;transform:translateX(4px)}

.content{min-width:0}
.card{border:10px solid #f1f1f1;background:#fff;padding:28px 30px 30px;animation:fade .25s ease}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:18px}
.card h2{margin:0;font-size:19px;font-weight:700;color:#1b2d63}
.arrows{display:flex;gap:6px}
.arrows button{width:30px;height:26px;display:grid;place-items:center;border:0;background:#ececec;color:#666;cursor:pointer;border-radius:2px}
.arrows button:hover{background:var(--navy);color:#fff}

.topper{display:flex;gap:10px;align-items:flex-start;min-height:222px;animation:fade .25s ease}
.topper img{width:165px;height:208px;object-fit:cover;flex-shrink:0;background:#eee}
.topper dl{margin:0;display:grid;gap:11px;padding-top:4px}
.topper dl div{font-size:13.5px;line-height:1.5}
.topper dt{display:inline;font-weight:700;color:#4b5064}
.topper dd{display:inline;margin:0;color:#6b7080}
.dots{display:flex;gap:8px;justify-content:center;margin-top:16px}
.dots button{width:9px;height:9px;padding:0;border:0;border-radius:50%;background:#cfd3e2;cursor:pointer}
.dots button.on{background:var(--red);width:22px;border-radius:6px}

.dept-title{margin-bottom:16px!important;padding-bottom:10px;border-bottom:3px solid var(--red);display:inline-block;font-size:21px!important}
.pills{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 20px}
.pills button{padding:8px 16px;border:1px solid var(--navy);background:#fff;color:var(--navy);font:600 13px 'Open Sans',sans-serif;cursor:pointer;border-radius:999px}
.pills button:hover{background:#eef1fa}
.pills button.on{background:var(--navy);color:#fff}
.sec{animation:fade .25s ease}
.sec h3{margin:20px 0 10px;font-size:16px;color:var(--navy)}
.sec h3:first-child{margin-top:0}
.sec p{margin:0 0 10px;font-size:14px;line-height:1.75;color:var(--mut);text-align:justify}

.profile{display:grid;grid-template-columns:240px 1fr;gap:22px;align-items:start}
.profile img{width:100%;height:auto;max-height:300px;object-fit:cover;background:#eee}
.more{border:0;background:none;color:var(--red);font:700 13px 'Open Sans',sans-serif;cursor:pointer;padding:0}
.more:hover{text-decoration:underline}

.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.person{display:flex;gap:16px;align-items:flex-start;padding:14px;background:#f6f7fb;border-left:4px solid var(--navy)}
.person.hod{margin-bottom:8px}
.person img{width:110px;height:130px;object-fit:cover;flex-shrink:0;background:#e5e7ef}
.person ul{list-style:none;margin:0;padding:0;display:grid;gap:7px;font-size:13.5px;min-width:0}
.person li{display:grid;grid-template-columns:18px 88px 1fr;gap:6px;align-items:start;color:var(--mut)}
.person li svg{color:var(--navy);margin-top:3px}
.person li b{color:#3c4256}
.person li span{overflow-wrap:anywhere}
.person a{color:var(--navy)}

.events{display:grid;gap:18px}
.event{display:grid;grid-template-columns:200px 1fr;gap:18px;padding:14px;background:#f6f7fb}
.event img{width:100%;height:150px;object-fit:cover;background:#e5e7ef}
.event h3{margin:0 0 6px!important}
.meta{display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12.5px!important;color:#7a8095!important}
.meta span{display:inline-flex;align-items:center;gap:5px}

.ach{grid-template-columns:repeat(auto-fill,minmax(210px,1fr))}
.ach-card{padding:14px;background:#f6f7fb;border-top:4px solid var(--red)}
.ach-card img{width:100%;height:170px;object-fit:cover;background:#e5e7ef;margin-bottom:10px}
.ach-card h3{margin:0!important;font-size:15px!important}
.cls{display:inline-block;margin:4px 0 8px;padding:2px 10px;font-size:11.5px;font-weight:700;color:var(--navy);background:#e2e8fa;border-radius:999px}
.ach-card p{text-align:left!important;font-size:13px!important}

.empty{display:flex;align-items:center;gap:10px;margin:0 0 14px;padding:16px;background:#f4f6fc;border:1px dashed #c4cbe3;font-size:14px;color:var(--mut)}
.ext{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--navy)}

@media(max-width:900px){
  .layout{grid-template-columns:1fr;padding:32px 16px 56px}
  .banner{height:140px}.banner h1{font-size:28px;margin-top:22px}
  .tab.active{transform:none}
  .card{padding:20px 16px;border-width:6px}
  .topper{flex-direction:column;align-items:center;text-align:left}
  .profile,.event{grid-template-columns:1fr}
}
@media(prefers-reduced-motion:reduce){.card,.topper,.sec{animation:none}.tab,.back{transition:none}}
`;