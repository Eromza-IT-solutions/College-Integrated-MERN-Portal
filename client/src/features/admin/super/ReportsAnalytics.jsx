import { useState, useEffect, useRef } from "react";
import {
  Users, FileText, Activity, Clock, TrendingUp, Download,
  ArrowUp, Radio,
} from "lucide-react";

/* ---------- data (replace with your API) ---------- */
const MONTHS_12 = ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun"];
const USERS_12 = [80, 120, 150, 190, 230, 280, 330, 480, 640, 780, 950, 1250];

const REPORT_TYPES = [
  { key: "academic", name: "Academic", count: 56, color: "#1b2d6b" },
  { key: "admin", name: "Administrative", count: 44, color: "#a50d22" },
  { key: "others", name: "Others", count: 25, color: "#e8b923" },
];

const fmt = (n) => Math.round(n).toLocaleString("en-IN");

/* ---------- hooks ---------- */
function useCountUp(target, duration = 800) {
  const [val, setVal] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current, start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      setVal(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick); else prev.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return val;
}

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(700);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(300, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* ---------- stat card ---------- */
function Spark({ data, color, id }) {
  const w = 160, h = 46, min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 6 - ((v - min) / r) * (h - 14)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`sp-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".22" /><stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#sp-${id})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        vectorEffect="non-scaling-stroke" pathLength="1" className="spark-line" />
      <circle cx={last[0]} cy={last[1]} r="3.2" fill="#fff" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, unit, trend, tone, live, delay, spark }) {
  const n = useCountUp(value, live ? 500 : 900);
  const color = { navy: "#1b2d6b", emerald: "#12915a", maroon: "#a50d22", gold: "#c98a06" }[tone];
  return (
    <div className={`stat tone-${tone}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="stat-top">
        <div className="stat-icon"><Icon size={21} /></div>
        <span className="trend"><ArrowUp size={13} /> {trend}%</span>
      </div>
      <div className="stat-label">
        {label}{live && <span className="mini-live"><i /> live</span>}
      </div>
      <div className="stat-val">{fmt(n)}{unit && <small> {unit}</small>}</div>
      <Spark data={spark} color={color} id={tone} key={live ? "live" : tone} />
      <div className="stat-foot">vs last month</div>
    </div>
  );
}

/* ---------- line chart ---------- */
function GrowthChart({ labels, data }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const H = 330, m = { t: 20, r: 24, b: 34, l: 44 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b, MAX = 1500;
  const x = (i) => m.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v) => m.t + ih - (v / MAX) * ih;
  const pts = data.map((v, i) => [x(i), y(v)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const peak = data.indexOf(Math.max(...data));

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round(((px - m.l) / iw) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div className="chart" ref={ref} onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg width={W} height={H} role="img" aria-label="User growth line chart">
        <defs>
          <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1b2d6b" stopOpacity=".28" />
            <stop offset="100%" stopColor="#1b2d6b" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1b2d6b" /><stop offset="100%" stopColor="#a50d22" />
          </linearGradient>
        </defs>

        {[0, 500, 1000, 1500].map((t) => (
          <g key={t}>
            <line x1={m.l} x2={W - m.r} y1={y(t)} y2={y(t)} stroke="#e4e7f0" strokeDasharray={t ? "4 5" : "0"} />
            <text x={m.l - 10} y={y(t) + 4} textAnchor="end" className="axis">{t === 0 ? 0 : t >= 1000 ? `${t / 1000}${t % 1000 ? ".5" : ""}K` : t}</text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={l + i} x={x(i)} y={H - 10} textAnchor="middle" className={`axis ${hover === i ? "axis-on" : ""}`}>{l}</text>
        ))}

        <g key={labels.length}>
          <path d={area} fill="url(#area)" className="area" />
          <path d={line} fill="none" stroke="url(#stroke)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" pathLength="1" className="draw" />
        </g>

        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={y(0)} stroke="#a50d22" strokeOpacity=".35" strokeDasharray="4 4" />}
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 8 : i === peak ? 6 : 5}
            fill={i === peak ? "#e8b923" : "#fff"} stroke={hover === i ? "#a50d22" : "#1b2d6b"} strokeWidth="2.5" className="dot" />
        ))}
      </svg>

      {hover !== null && (
        <div className="tip" style={{ left: Math.min(Math.max(x(hover), 70), W - 70), top: y(data[hover]) - 14 }}>
          <b>{fmt(data[hover])}</b>
          <span>users · {labels[hover]}</span>
          {hover > 0 && <span className={`delta ${data[hover] >= data[hover - 1] ? "up" : "down"}`}>
            {data[hover] >= data[hover - 1] ? "▲" : "▼"} {Math.abs(Math.round(((data[hover] - data[hover - 1]) / data[hover - 1]) * 100))}% vs {labels[hover - 1]}
          </span>}
        </div>
      )}
    </div>
  );
}

/* ---------- donut ---------- */
function Donut({ hidden, toggle }) {
  const [hov, setHov] = useState(null);
  const R = 78, SW = 28, C = 2 * Math.PI * R, GAP = 5;
  const visible = REPORT_TYPES.filter((t) => !hidden.includes(t.key));
  const total = visible.reduce((s, t) => s + t.count, 0);
  const grandTotal = REPORT_TYPES.reduce((s, t) => s + t.count, 0);

  let cum = 0;
  const segs = REPORT_TYPES.map((t) => {
    const show = !hidden.includes(t.key) && total > 0;
    const frac = show ? t.count / total : 0;
    const len = Math.max(frac * C - (visible.length > 1 ? GAP : 0), 0);
    const seg = { ...t, len, off: -cum * C, frac };
    cum += frac;
    return seg;
  });

  return (
    <div className="donut-wrap">
      <div className="donut">
        <svg viewBox="0 0 200 200" role="img" aria-label="Report types donut chart">
          <circle cx="100" cy="100" r={R} fill="none" stroke="#eef0f7" strokeWidth={SW} />
          <g transform="rotate(-90 100 100)">
            {segs.map((s) => (
              <circle key={s.key} cx="100" cy="100" r={R} fill="none" stroke={s.color}
                strokeWidth={hov === s.key ? SW + 6 : SW} strokeLinecap="butt"
                strokeDasharray={`${s.len} ${C - s.len}`} strokeDashoffset={s.off}
                opacity={hov && hov !== s.key ? 0.45 : 1} className="seg"
                onMouseEnter={() => setHov(s.key)} onMouseLeave={() => setHov(null)} />
            ))}
          </g>
        </svg>
        <div className="donut-center">
          <b>{hov ? REPORT_TYPES.find((t) => t.key === hov).count : total}</b>
          <span>{hov ? REPORT_TYPES.find((t) => t.key === hov).name : "Reports"}</span>
        </div>
      </div>

      <ul className="legend">
        {REPORT_TYPES.map((t) => {
          const off = hidden.includes(t.key);
          const pct = off || !total ? 0 : Math.round((t.count / total) * 100);
          return (
            <li key={t.key}>
              <button className={off ? "off" : ""} onClick={() => toggle(t.key)}
                onMouseEnter={() => setHov(t.key)} onMouseLeave={() => setHov(null)}
                aria-pressed={!off} title={off ? "Show" : "Hide"}>
                <i style={{ background: t.color }} />
                <span className="lg-name">{t.name}</span>
                <span className="lg-count">{t.count}</span>
                <span className="lg-pct">{off ? "–" : `${pct}%`}</span>
              </button>
            </li>
          );
        })}
        <li className="lg-total">{grandTotal} reports in total</li>
      </ul>
    </div>
  );
}

/* ---------- page ---------- */
export default function ReportsAnalytics() {
  const [range, setRange] = useState(6);
  const [hidden, setHidden] = useState([]);
  const [sessions, setSessions] = useState(8686);
  const [hist, setHist] = useState([8420, 8470, 8450, 8530, 8580, 8560, 8640, 8686]);

  const labels = MONTHS_12.slice(-range);
  const data = USERS_12.slice(-range);
  const growth = Math.round(((data[data.length - 1] - data[0]) / data[0]) * 100);
  const peakIdx = data.indexOf(Math.max(...data));

  // simulated live feed – replace with websocket / polling
  useEffect(() => {
    const id = setInterval(() => setSessions((s) => {
      const next = Math.max(8000, s + Math.round((Math.random() - 0.4) * 30));
      setHist((h) => [...h.slice(-11), next]);
      return next;
    }), 3000);
    return () => clearInterval(id);
  }, []);

  const toggleType = (k) =>
    setHidden((h) => (h.includes(k) ? h.filter((x) => x !== k) : h.length === REPORT_TYPES.length - 1 ? h : [...h, k]));

  const exportCsv = () => {
    const csv = "Month,Users\n" + labels.map((l, i) => `${l},${data[i]}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `user-growth-${range}-months.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="ra">
      <style>{CSS}</style>

      <section className="stats">
        <StatCard icon={Users} label="Total Users" value={1250} trend={12} tone="navy" delay={0} spark={[640, 780, 950, 1010, 1100, 1180, 1250]} />
        <StatCard icon={FileText} label="Total Reports" value={125} trend={8} tone="emerald" delay={80} spark={[88, 96, 101, 108, 112, 120, 125]} />
        <StatCard icon={Activity} label="Active Sessions" value={sessions} trend={15} tone="maroon" delay={160} live spark={hist} />
        <StatCard icon={Clock} label="Avg. Session" value={21} unit="min" trend={10} tone="gold" delay={240} spark={[15, 17, 16, 18, 19, 20, 21]} />
      </section>

      <section className="charts">
        <div className="box">
          <div className="box-head">
            <div>
              <h2>User Growth</h2>
              <div className="sub">
                <span className="chip"><TrendingUp size={13} /> {growth >= 0 ? "+" : ""}{fmt(growth)}%</span>
                <span>over {range} months · peak {fmt(data[peakIdx])} in {labels[peakIdx]}</span>
              </div>
            </div>
            <div className="head-actions">
              <div className="seg-ctl" style={{ "--i": range === 6 ? 0 : 1 }}>
                <span className="pill" />
                {[6, 12].map((r) => (
                  <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{r} months</button>
                ))}
              </div>
              <button className="export" onClick={exportCsv}><Download size={15} /> Export</button>
            </div>
          </div>
          <GrowthChart labels={labels} data={data} />
        </div>

        <div className="box">
          <div className="box-head">
            <h2>Report Types <Radio size={13} className="radio" /></h2>
            <span className="hint">Click legend to filter</span>
          </div>
          <Donut hidden={hidden} toggle={toggleType} />
        </div>
      </section>
    </div>
  );
}

/* ---------- styles ---------- */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap');

.ra{font-style:normal;--navy:#14214f;--navy2:#1b2d6b;--maroon:#8a0b1c;--maroon2:#a50d22;--gold:#e8b923;--muted:#5d6785;--line:#e4e7f0;--bg:#f6f4f2;
  min-height:100vh;padding:32px clamp(16px,4vw,44px) 44px;font-family:'Poppins',system-ui,sans-serif;color:var(--navy);
  background:radial-gradient(900px 420px at 100% -10%,rgba(138,11,28,.10),transparent 60%),radial-gradient(800px 420px at -10% 0%,rgba(27,45,107,.10),transparent 60%),var(--bg)}
.ra *{box-sizing:border-box;font-style:normal}
.ra button{font-family:inherit;cursor:pointer}
.ra :focus-visible{outline:3px solid rgba(232,185,35,.7);outline-offset:2px}

/* stat cards */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:20px;margin-bottom:24px}
.stat{--c:#1b2d6b;--ct:#e8ecfb;position:relative;overflow:hidden;padding:20px 22px 16px;border-radius:20px;background:#fff;border:1px solid var(--line);
  box-shadow:0 16px 30px -26px rgba(20,33,79,.7);transition:transform .25s,box-shadow .25s,border-color .25s;animation:rise .55s cubic-bezier(.2,.8,.2,1) both}
.stat::after{content:"";position:absolute;left:22px;right:22px;top:0;height:3px;border-radius:0 0 4px 4px;background:var(--c);transform:scaleX(.18);transform-origin:left;transition:transform .45s cubic-bezier(.3,.9,.3,1)}
.stat:hover{transform:translateY(-4px);border-color:var(--c);box-shadow:0 26px 36px -26px var(--c)}
.stat:hover::after{transform:scaleX(1)}
.stat-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}
.stat-icon{width:44px;height:44px;border-radius:13px;display:grid;place-items:center;color:var(--c);background:var(--ct);transition:transform .3s}
.stat:hover .stat-icon{transform:rotate(-8deg) scale(1.08)}
.trend{display:inline-flex;align-items:center;gap:3px;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:600;background:#e1f5ec;color:#0f7a4b}
.stat-label{display:flex;align-items:center;gap:8px;font-size:13.5px;color:var(--muted)}
.mini-live{display:inline-flex;align-items:center;gap:5px;font-size:10.5px;font-weight:600;color:#0f7a4b;background:#e1f5ec;padding:1px 8px;border-radius:999px}
.mini-live i{width:6px;height:6px;border-radius:50%;background:#12915a;animation:pulse 1.6s infinite}
.stat-val{margin:2px 0 6px;font-family:'Playfair Display',serif;font-size:34px;font-weight:700;line-height:1.15;color:var(--navy);font-variant-numeric:tabular-nums}
.stat-val small{font-family:'Poppins',sans-serif;font-size:14px;font-weight:500;color:var(--muted)}
.spark{display:block;width:100%;height:46px;overflow:visible}
.spark-line{stroke-dasharray:1;stroke-dashoffset:1;animation:draw 1.2s .3s ease-out forwards}
.stat-foot{margin-top:6px;font-size:11.5px;color:#8a93ad}
.tone-emerald{--c:#12915a;--ct:#e1f5ec}
.tone-maroon{--c:#a50d22;--ct:#fbe6ea}
.tone-gold{--c:#c98a06;--ct:#fdf1d6}

/* charts */
.charts{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(0,1fr);gap:22px}
.box{padding:24px 26px 20px;border-radius:24px;background:#fff;border:1px solid var(--line);box-shadow:0 20px 40px -32px rgba(20,33,79,.6);animation:rise .6s .2s cubic-bezier(.2,.8,.2,1) both}
.box-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;margin-bottom:10px}
.box h2{display:flex;align-items:center;gap:8px;margin:0;font-family:'Playfair Display',serif;font-size:22px}
.radio{color:#12915a;animation:pulse-o 1.6s infinite}
.sub{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:8px;font-size:12.5px;color:var(--muted)}
.chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;background:#e1f5ec;color:#0f7a4b;font-weight:600}
.hint{font-size:12px;color:var(--muted);padding-top:6px}
.head-actions{display:flex;align-items:center;gap:10px}
.seg-ctl{--i:0;position:relative;display:grid;grid-template-columns:1fr 1fr;padding:4px;border-radius:12px;background:#eef0f8}
.pill{position:absolute;top:4px;bottom:4px;left:4px;width:calc((100% - 8px)/2);border-radius:9px;background:var(--navy);transform:translateX(calc(var(--i)*100%));transition:transform .28s cubic-bezier(.3,.9,.3,1)}
.seg-ctl button{position:relative;z-index:1;border:0;background:none;padding:7px 14px;font-size:12.5px;font-weight:500;color:var(--muted);white-space:nowrap;transition:color .2s}
.seg-ctl button.on{color:#fff}
.export{display:inline-flex;align-items:center;gap:7px;padding:9px 15px;border-radius:12px;border:1px solid var(--line);background:#fff;color:var(--navy);font-size:12.5px;font-weight:600;transition:all .2s}
.export:hover{border-color:var(--maroon);color:var(--maroon);transform:translateY(-1px)}

.chart{position:relative;margin-top:8px}
.chart svg{display:block;overflow:visible}
.axis{font-size:11px;fill:#8a93ad;font-family:'Poppins',sans-serif;transition:fill .2s}
.axis-on{fill:var(--maroon2);font-weight:600}
.draw{stroke-dasharray:1;stroke-dashoffset:1;animation:draw 1.1s .1s ease-out forwards}
.area{opacity:0;animation:fadein .8s .5s ease-out forwards}
.dot{transition:r .15s,stroke .15s}
.tip{position:absolute;transform:translate(-50%,-100%);pointer-events:none;display:flex;flex-direction:column;align-items:center;gap:1px;padding:8px 14px;border-radius:12px;
  background:var(--navy);color:#fff;font-size:11.5px;box-shadow:0 14px 26px -10px rgba(20,33,79,.7);border-bottom:3px solid var(--gold);white-space:nowrap;animation:fadein .12s}
.tip b{font-family:'Playfair Display',serif;font-size:18px}
.tip span{opacity:.75}.tip .delta{font-style:normal;font-weight:600;margin-top:2px}.tip .up{color:#7af0b4}.tip .down{color:#ff9aa8}

/* donut */
.donut-wrap{display:flex;align-items:center;justify-content:center;gap:clamp(16px,3vw,36px);flex-wrap:wrap;padding:20px 0 10px;min-height:300px}
.donut{position:relative;width:210px;height:210px;flex-shrink:0}
.donut svg{width:100%;height:100%;overflow:visible}
.seg{transition:stroke-dasharray .6s cubic-bezier(.3,.9,.3,1),stroke-dashoffset .6s cubic-bezier(.3,.9,.3,1),stroke-width .2s,opacity .2s;cursor:pointer}
.donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.donut-center b{font-family:'Playfair Display',serif;font-size:38px;line-height:1}
.donut-center span{margin-top:4px;font-size:12.5px;color:var(--muted)}
.legend{list-style:none;margin:0;padding:0;min-width:210px;flex:1;max-width:280px}
.legend button{display:grid;grid-template-columns:12px 1fr auto 46px;align-items:center;gap:10px;width:100%;padding:11px 12px;border:0;border-radius:12px;background:none;font-size:14px;color:var(--navy);text-align:left;transition:background .2s,opacity .2s}
.legend button:hover{background:#f3f5fb}
.legend i{width:12px;height:12px;border-radius:50%}
.lg-count{font-size:12px;color:var(--muted)}.lg-pct{text-align:right;font-weight:600}
.legend button.off{opacity:.45}.legend button.off .lg-name{text-decoration:line-through}
.lg-total{margin-top:8px;padding:10px 12px 0;border-top:1px dashed var(--line);font-size:12px;color:var(--muted)}

@keyframes rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes draw{to{stroke-dashoffset:0}}
@keyframes fadein{to{opacity:1}}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(18,145,90,.55)}70%{box-shadow:0 0 0 8px rgba(18,145,90,0)}100%{box-shadow:0 0 0 0 rgba(18,145,90,0)}}
@keyframes pulse-o{50%{opacity:.3}}

@media (max-width:1000px){.charts{grid-template-columns:1fr}}
@media (max-width:640px){.head-actions{width:100%;justify-content:space-between}}
@media (prefers-reduced-motion:reduce){.ra *{animation:none!important;transition:none!important}.draw{stroke-dashoffset:0}.area{opacity:1}}
`;