import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  FileCheck,
  FileText,
  GraduationCap,
  Radio,
  Sparkles,
  Users,
  UserCheck,
  Clock3,
  ShieldCheck,
  Activity,
  ArrowUpRight,
  CalendarClock,
} from "lucide-react";

import {
  hodKpis,
  hodAttendanceSeries,
  hodProgramPerformance,
  hodFacultyWorkload,
  hodPendingApprovals,
  hodActivities,
  hodDepartment,
} from "../../mocks/hodData";

/* Shared logo from the Super Admin sidebar */
import { collegeLogo } from "../admin/super/SuperAdmin_Sidebar";

import "../../assets/styles/aisc-premium.css";

const logo = collegeLogo;

const kpiIcons = {
  students: Users,
  faculty: GraduationCap,
  attendance: ClipboardCheck,
  approvals: FileCheck,
};

const activityIcons = {
  attendance: ClipboardCheck,
  approval: FileCheck,
  request: UserCheck,
  report: FileText,
};

const barColors = [
  "#14264B",
  "#A8212F",
  "#D2A72C",
  "#6A8DBB",
  "#2C9271",
  "#8B70B5",
];

const SPARKLINES = [
  [4, 7, 5, 11, 9, 14, 18],
  [4, 6, 9, 7, 14, 16, 20],
  [3, 7, 6, 12, 10, 15, 19],
  [2, 5, 7, 6, 12, 14, 18],
];

const getGreeting = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
};

const percent = (value, total) =>
  total ? Math.round((value / total) * 100) : 0;

function AnimatedNumber({ value = 0, duration = 1500 }) {
  const [number, setNumber] = useState(0);

  useEffect(() => {
    const target = Number(value) || 0;

    if (
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setNumber(target);
      return;
    }

    let frame;
    const start = performance.now();

    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 4);

      setNumber(Math.round(target * eased));

      if (progress < 1) {
        frame = requestAnimationFrame(animate);
      }
    };

    frame = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <>{number.toLocaleString("en-IN")}</>;
}

function Sparkline({ values = [4, 7, 5, 11, 9, 14, 18] }) {
  const max = Math.max(...values, 1);

  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = 29 - (value / max) * 23;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="exam-sparkline" viewBox="0 0 100 34">
      <polyline
        points={points}
        fill="none"
        stroke="#F2C200"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="100"
        className="exam-sparkline-line"
      />
    </svg>
  );
}

function HeroStat({ icon: Icon, label, value, trend, sparkline, index }) {
  return (
    <div
      className="exam-hero-stat"
      style={{ animationDelay: `${index * 130}ms` }}
    >
      <span className="exam-hero-stat-icon">
        <Icon size={19} />
      </span>

      <div className="exam-hero-stat-info">
        <span className="exam-hero-stat-label">{label}</span>
        <strong>
          {Number.isFinite(Number(value)) ? (
            <AnimatedNumber value={value} />
          ) : (
            value
          )}
        </strong>
      </div>

      <div className="exam-hero-stat-graph">
        <Sparkline values={sparkline} />
        <span>{trend}</span>
      </div>
    </div>
  );
}

function DonutChart({ approved, pending }) {
  const [active, setActive] = useState("approved");

  const total = approved + pending;
  const approvedPercent = percent(approved, total);
  const pendingPercent = percent(pending, total);

  const circumference = 2 * Math.PI * 67;
  const approvedLength = (approvedPercent / 100) * circumference;
  const pendingLength = (pendingPercent / 100) * circumference;

  const activeValue =
    active === "approved" ? approvedPercent : pendingPercent;

  return (
    <div className="exam-overview-chart">
      <div className="exam-donut">
        <svg viewBox="0 0 170 170">
          <circle
            cx="85"
            cy="85"
            r="67"
            fill="none"
            stroke="#eeeae5"
            strokeWidth="17"
          />

          <circle
            cx="85"
            cy="85"
            r="67"
            fill="none"
            stroke="#2BA889"
            strokeWidth="17"
            strokeLinecap="round"
            strokeDasharray={`${approvedLength} ${circumference}`}
            transform="rotate(-90 85 85)"
            className="exam-donut-progress"
            onMouseEnter={() => setActive("approved")}
          />

          <circle
            cx="85"
            cy="85"
            r="67"
            fill="none"
            stroke="#A8212F"
            strokeWidth="17"
            strokeLinecap="round"
            strokeDasharray={`${pendingLength} ${circumference}`}
            strokeDashoffset={-approvedLength}
            transform="rotate(-90 85 85)"
            className="exam-donut-progress"
            onMouseEnter={() => setActive("pending")}
          />
        </svg>

        <div className="exam-donut-center">
          <strong>
            <AnimatedNumber value={activeValue} />%
          </strong>
          <span>
            {active === "approved" ? "Attendance" : "Remaining"}
          </span>
        </div>
      </div>

      <div className="exam-donut-legend">
        <button
          type="button"
          className={active === "approved" ? "active" : ""}
          onMouseEnter={() => setActive("approved")}
          onClick={() => setActive("approved")}
        >
          <span className="exam-legend-dot green" />
          <span>Attendance</span>
          <strong>{approved}%</strong>
        </button>

        <button
          type="button"
          className={active === "pending" ? "active" : ""}
          onMouseEnter={() => setActive("pending")}
          onClick={() => setActive("pending")}
        >
          <span className="exam-legend-dot maroon" />
          <span>Remaining</span>
          <strong>{pending}%</strong>
        </button>
      </div>
    </div>
  );
}

function PanelHeading({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="exam-panel-heading">
      <div className="exam-panel-title-group">
        <span className="exam-panel-icon">
          <Icon size={18} />
        </span>

        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      {action}
    </div>
  );
}

function ProgressBar({ label, value, max = 100, suffix = "%", color }) {
  const width = Math.min(100, Math.max(0, ((Number(value) || 0) / max) * 100));

  return (
    <div className="exam-progress-item">
      <div className="exam-progress-label">
        <span>{label}</span>
        <strong>
          {value}
          {suffix}
        </strong>
      </div>

      <div className="exam-progress-track">
        <span style={{ width: `${width}%`, background: color }} />
      </div>
    </div>
  );
}

export default function HODDashboard() {
  const [showAllActivities, setShowAllActivities] = useState(false);

  const attendanceValues = Array.isArray(hodAttendanceSeries?.values)
    ? hodAttendanceSeries.values
    : [];

  const attendanceLabels = Array.isArray(hodAttendanceSeries?.labels)
    ? hodAttendanceSeries.labels
    : [];

  const hasAttendance = attendanceValues.length > 0;

  const latestAttendance = hasAttendance
    ? Math.min(
        100,
        Math.max(0, Number(attendanceValues[attendanceValues.length - 1]) || 0)
      )
    : 0;

  const activities = showAllActivities
    ? hodActivities
    : hodActivities.slice(0, 5);

  return (
    <main className="exam-premium-page">
      <style>{`
        .exam-premium-page {
          --exam-navy: #14264B;
          --exam-maroon: #A8212F;
          --exam-gold: #F2C200;
          --exam-sky: #DBE9F5;
          --exam-cream: #FBF6EE;
          --exam-muted: #929AAA;
          min-height: 100vh;
          padding: 15px 22px 22px;
          color: #293650;
          background: var(--exam-cream);
          font-family: 'Poppins', sans-serif;
        }

        .exam-premium-page * { box-sizing: border-box; }

        .exam-topline {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          margin-bottom: 10px;
          animation: examFadeUp .6s ease both;
        }

        .exam-date-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 14px;
          border: 1px solid #e9e4dc;
          border-radius: 30px;
          background: #fff;
          color: var(--exam-navy);
          font-size: 10px;
          font-weight: 700;
          box-shadow: 0 4px 14px rgba(20,38,75,.04);
        }

        /* HERO */

        .exam-hero {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          border: 1px solid rgba(255,255,255,.12);
          border-radius: 19px;
          color: #fff;
          background:
            radial-gradient(circle at 78% 5%, rgba(242,194,0,.16), transparent 25%),
            radial-gradient(circle at 48% 110%, rgba(168,33,47,.32), transparent 29%),
            linear-gradient(112deg, #101d3d 0%, #14264B 55%, #293e70 100%);
          box-shadow: 0 14px 34px rgba(20,38,75,.2);
          animation: examFadeUp .75s ease both;
        }

        .exam-hero::before,
        .exam-hero::after {
          content: "";
          position: absolute;
          z-index: -1;
          pointer-events: none;
          border: 1px solid rgba(242,194,0,.2);
          border-radius: 50%;
        }

        .exam-hero::before {
          width: 260px;
          height: 260px;
          top: -165px;
          right: 21%;
          box-shadow:
            0 0 0 22px rgba(255,255,255,.025),
            0 0 0 46px rgba(255,255,255,.018),
            0 0 0 72px rgba(255,255,255,.012);
          animation: examOrbit 12s ease-in-out infinite;
        }

        .exam-hero::after {
          width: 210px;
          height: 210px;
          right: -95px;
          bottom: 80px;
          border-color: rgba(255,255,255,.09);
          box-shadow: 0 0 0 27px rgba(255,255,255,.02);
          animation: examOrbit 15s ease-in-out infinite reverse;
        }

        .exam-hero-main {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: 94px minmax(0,1fr) auto;
          align-items: center;
          gap: 20px;
          min-height: 225px;
          padding: 32px 30px 29px;
        }

        .exam-crest-frame {
          display: grid;
          width: 88px;
          height: 88px;
          place-items: center;
          padding: 7px;
          border: 2px solid var(--exam-gold);
          border-radius: 10px;
          background: #fff;
          box-shadow: 0 8px 25px rgba(0,0,0,.27);
          animation: examLogoFloat 4s ease-in-out infinite;
          transition: transform .3s ease, box-shadow .3s ease;
        }

        .exam-crest-frame:hover {
          transform: translateY(-5px) scale(1.04);
          box-shadow: 0 12px 30px rgba(242,194,0,.2);
        }

        .exam-crest-frame img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .exam-hero-copy { min-width: 0; }

        .exam-hero-kicker {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 10px;
          color: var(--exam-gold);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.8px;
          text-transform: uppercase;
        }

        .exam-hero-kicker svg {
          animation: examSparkle 2.5s ease-in-out infinite;
        }

        .exam-hero-title {
          margin: 0;
          color: #fff;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(28px, 3.1vw, 39px);
          font-weight: 800;
          line-height: 1.18;
          letter-spacing: -.5px;
          animation: examTitleReveal .8s ease both;
        }

        .exam-hero-underline {
          width: 58px;
          height: 4px;
          margin: 13px 0 12px;
          border-radius: 5px;
          background: var(--exam-gold);
          box-shadow: 0 0 13px rgba(242,194,0,.35);
          animation: examLineReveal 1s ease both;
        }

        .exam-hero-description {
          max-width: 660px;
          margin: 0;
          color: rgba(255,255,255,.79);
          font-size: 11px;
          line-height: 1.85;
        }

        .exam-college-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 15px;
        }

        .exam-college-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 11px;
          border: 1px solid rgba(255,255,255,.15);
          border-radius: 22px;
          background: rgba(255,255,255,.12);
          color: rgba(255,255,255,.95);
          font-size: 8px;
          font-weight: 700;
          white-space: nowrap;
          backdrop-filter: blur(8px);
          transition: background .25s ease, transform .25s ease;
        }

        .exam-college-badge:hover {
          transform: translateY(-3px);
          background: rgba(255,255,255,.2);
        }

        .exam-college-badge svg { color: var(--exam-gold); }

        .exam-readtolead {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: center;
          min-width: 175px;
          padding: 12px 0 12px 21px;
          border-left: 2px solid var(--exam-gold);
          animation: examFadeUp 1s .25s both;
        }

        .exam-readtolead strong {
          color: var(--exam-gold);
          font-family: 'Playfair Display', Georgia, serif;
          font-size: clamp(23px, 2.3vw, 31px);
          font-style: italic;
          font-weight: 800;
          white-space: nowrap;
          text-shadow: 0 0 20px rgba(242,194,0,.18);
        }

        .exam-readtolead span {
          margin-top: 7px;
          color: rgba(255,255,255,.67);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: 1.5px;
          white-space: nowrap;
        }

        .exam-hero-divider {
          position: relative;
          z-index: 1;
          height: 1px;
          background: rgba(255,255,255,.17);
        }

        .exam-hero-stats {
          position: relative;
          z-index: 1;
          display: grid;
          grid-template-columns: repeat(4,minmax(0,1fr));
          background: rgba(5,13,35,.25);
        }

        .exam-hero-stat {
          display: flex;
          align-items: center;
          gap: 13px;
          min-width: 0;
          padding: 19px 20px;
          border-right: 1px solid rgba(255,255,255,.14);
          animation: examFadeUp .7s ease both;
          transition: background .25s ease;
        }

        .exam-hero-stat:hover {
          background: rgba(255,255,255,.07);
        }

        .exam-hero-stat:last-child { border-right: 0; }

        .exam-hero-stat-icon {
          display: grid;
          width: 43px;
          height: 43px;
          flex-shrink: 0;
          place-items: center;
          border: 1px solid rgba(255,255,255,.16);
          border-radius: 50%;
          background: rgba(255,255,255,.11);
          color: var(--exam-gold);
          transition: transform .35s ease, background .35s ease;
        }

        .exam-hero-stat:hover .exam-hero-stat-icon {
          transform: rotate(12deg) scale(1.1);
          background: rgba(242,194,0,.17);
        }

        .exam-hero-stat-info {
          display: flex;
          min-width: 0;
          flex: 1;
          flex-direction: column;
          gap: 5px;
        }

        .exam-hero-stat-label {
          color: rgba(255,255,255,.68);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .8px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .exam-hero-stat-info strong {
          color: #fff;
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 24px;
          line-height: 1;
        }

        .exam-hero-stat-graph {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 2px;
        }

        .exam-hero-stat-graph span {
          color: #68e2aa;
          font-size: 8px;
          font-weight: 800;
          white-space: nowrap;
        }

        .exam-sparkline {
          width: 68px;
          height: 27px;
          overflow: visible;
        }

        .exam-sparkline-line {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: examDrawLine 1.8s ease forwards;
        }

        /* PANELS */

        .exam-panels {
          display: grid;
          grid-template-columns: minmax(0,.9fr) minmax(0,1.35fr);
          gap: 18px;
          margin-top: 20px;
        }

        .exam-panel {
          position: relative;
          min-width: 0;
          padding: 21px;
          border: 1px solid #eee9e2;
          border-radius: 16px;
          background: #fff;
          box-shadow: 0 7px 20px rgba(20,38,75,.055);
          animation: examFadeUp .8s ease both;
          transition: transform .28s ease, box-shadow .28s ease;
        }

        .exam-panel:hover {
          transform: translateY(-3px);
          box-shadow: 0 13px 29px rgba(20,38,75,.1);
        }

        .exam-panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 19px;
        }

        .exam-panel-title-group {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .exam-panel-icon {
          display: grid;
          width: 38px;
          height: 38px;
          flex-shrink: 0;
          place-items: center;
          border-radius: 10px;
          background: #f9ecee;
          color: var(--exam-maroon);
          transition: transform .3s ease;
        }

        .exam-panel:hover .exam-panel-icon {
          transform: rotate(-7deg) scale(1.05);
        }

        .exam-panel-heading h2 {
          margin: 0;
          color: var(--exam-navy);
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 17px;
          font-weight: 800;
        }

        .exam-panel-heading p {
          margin: 4px 0 0;
          color: #9aa2af;
          font-size: 9px;
        }

        .exam-panel-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 5px 0;
          border: 0;
          background: transparent;
          color: var(--exam-maroon);
          font-size: 9px;
          font-weight: 800;
          text-decoration: none;
          white-space: nowrap;
          cursor: pointer;
          transition: gap .2s ease;
        }

        .exam-panel-link:hover { gap: 9px; }

        /* DONUT */

        .exam-overview-chart {
          display: flex;
          min-height: 210px;
          align-items: center;
          justify-content: center;
          gap: 27px;
          flex-wrap: wrap;
        }

        .exam-donut {
          position: relative;
          width: 175px;
          height: 175px;
          flex-shrink: 0;
        }

        .exam-donut svg {
          width: 100%;
          height: 100%;
          overflow: visible;
          animation: examDonutAppear 1.1s ease both;
        }

        .exam-donut-progress {
          transition: stroke-dasharray .8s ease, opacity .3s ease;
          cursor: pointer;
        }

        .exam-donut-center {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .exam-donut-center strong {
          color: var(--exam-navy);
          font-family: 'Playfair Display', Georgia, serif;
          font-size: 29px;
          font-weight: 800;
        }

        .exam-donut-center span {
          margin-top: 2px;
          color: #929aaa;
          font-size: 9px;
        }

        .exam-donut-legend {
          min-width: 115px;
          flex: 1;
        }

        .exam-donut-legend button {
          display: flex;
          width: 100%;
          align-items: center;
          gap: 9px;
          padding: 12px 9px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #69758a;
          text-align: left;
          font-size: 10px;
          cursor: pointer;
          transition: background .2s ease, transform .2s ease;
        }

        .exam-donut-legend button:hover,
        .exam-donut-legend button.active {
          transform: translateX(3px);
          background: #f8f6f2;
          color: var(--exam-navy);
        }

        .exam-donut-legend strong {
          margin-left: auto;
          color: var(--exam-navy);
        }

        .exam-legend-dot {
          width: 9px;
          height: 9px;
          flex-shrink: 0;
          border-radius: 50%;
        }

        .exam-legend-dot.green { background: #2BA889; }
        .exam-legend-dot.maroon { background: var(--exam-maroon); }

        /* ACTIVITIES */

        .exam-activity-list { position: relative; }

        .exam-activity-list::before {
          content: "";
          position: absolute;
          top: 20px;
          bottom: 20px;
          left: 17px;
          width: 1px;
          background: #eee9e2;
        }

        .exam-activity {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 7px;
          border-bottom: 1px solid #f2efeb;
          animation: examFadeUp .5s ease both;
          transition: background .2s ease, padding .2s ease;
        }

        .exam-activity:hover {
          padding-left: 12px;
          background: #fcfaf7;
        }

        .exam-activity:last-child { border-bottom: 0; }

        .exam-activity-icon {
          z-index: 1;
          display: grid;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          place-items: center;
          border: 3px solid #fff;
          border-radius: 11px;
          background: #e7f6ef;
          color: #299b72;
          box-shadow: 0 0 0 1px #e9eee9;
        }

        .exam-activity:nth-child(2) .exam-activity-icon {
          background: #eaf0ff;
          color: #4a70bd;
        }

        .exam-activity:nth-child(3) .exam-activity-icon {
          background: #fff0e5;
          color: #d17c38;
        }

        .exam-activity:nth-child(4) .exam-activity-icon {
          background: #f9ecee;
          color: var(--exam-maroon);
        }

        .exam-activity-content {
          min-width: 0;
          flex: 1;
        }

        .exam-activity-title {
          color: var(--exam-navy);
          font-size: 10px;
          font-weight: 700;
        }

        .exam-activity-time {
          margin-top: 4px;
          color: #9aa2af;
          font-size: 9px;
        }

        .exam-empty {
          padding: 30px 12px;
          color: #8993a5;
          text-align: center;
          font-size: 10px;
        }

        /* PROGRESS */

        .exam-progress-item { margin: 19px 0; }

        .exam-progress-label {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          color: #778195;
          font-size: 10px;
        }

        .exam-progress-label strong { color: var(--exam-navy); }

        .exam-progress-track {
          height: 8px;
          overflow: hidden;
          border-radius: 20px;
          background: #f0ede8;
        }

        .exam-progress-track span {
          display: block;
          height: 100%;
          border-radius: 20px;
          animation: examGrowBar 1.4s ease both;
        }

        .exam-data-status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 21px;
          padding: 11px;
          border: 1px solid #d9eee4;
          border-radius: 9px;
          background: #f0faf5;
          color: #25845d;
          font-size: 9px;
          font-weight: 700;
        }

        /* UPCOMING EXAMS */

        .exam-table-wrap { overflow-x: auto; }

        .exam-table {
          width: 100%;
          min-width: 470px;
          border-collapse: collapse;
        }

        .exam-table th {
          padding: 11px 9px;
          background: #faf8f5;
          color: #8993a5;
          text-align: left;
          font-size: 8px;
          letter-spacing: .6px;
          text-transform: uppercase;
        }

        .exam-table td {
          padding: 12px 9px;
          border-bottom: 1px solid #f0ede8;
          color: #59657b;
          font-size: 9px;
        }

        .exam-table td strong {
          display: block;
          color: var(--exam-navy);
        }

        .exam-table td small {
          display: block;
          margin-top: 4px;
          color: #9aa2af;
          font-size: 8px;
        }

        .exam-table-status {
          display: inline-block;
          padding: 5px 9px;
          border-radius: 20px;
          background: #eaf7f1;
          color: #25845d;
          font-size: 8px;
          font-weight: 700;
        }

        /* QUICK LINKS */

        .exam-quick-grid {
          display: grid;
          grid-template-columns: repeat(2,minmax(0,1fr));
          gap: 17px;
          margin-top: 18px;
        }

        .exam-quick-link {
          display: block;
          color: inherit;
          text-decoration: none;
          transition: transform .25s ease, box-shadow .25s ease;
        }

        .exam-quick-link:hover {
          transform: translateY(-5px);
          box-shadow: 0 14px 28px rgba(20,38,75,.1);
        }

        .exam-footer {
          margin: 24px 0 5px;
          color: #9aa2af;
          text-align: center;
          font-size: 9px;
        }

        .exam-footer em {
          color: var(--exam-navy);
          font-family: 'Playfair Display', Georgia, serif;
          font-weight: 800;
        }

        /* ANIMATIONS */

        @keyframes examFadeUp {
          from { opacity: 0; transform: translateY(17px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes examTitleReveal {
          from { opacity: 0; transform: translateX(-12px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes examLogoFloat {
          0%,100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

        @keyframes examOrbit {
          0%,100% { transform: translateY(0) rotate(0); }
          50% { transform: translateY(10px) rotate(9deg); }
        }

        @keyframes examSparkle {
          0%,100% { transform: scale(1) rotate(0); opacity: 1; }
          50% { transform: scale(1.25) rotate(15deg); opacity: .7; }
        }

        @keyframes examDrawLine {
          to { stroke-dashoffset: 0; }
        }

        @keyframes examLineReveal {
          from { width: 0; opacity: .3; }
          to { width: 58px; opacity: 1; }
        }

        @keyframes examDonutAppear {
          from { opacity: 0; transform: rotate(-30deg) scale(.8); }
          to { opacity: 1; transform: rotate(0) scale(1); }
        }

        @keyframes examGrowBar {
          from { width: 0; }
        }

        @media(max-width: 1100px) {
          .exam-hero-main {
            grid-template-columns: 82px minmax(0,1fr);
          }

          .exam-readtolead {
            grid-column: 2;
            min-width: auto;
            margin-top: 3px;
          }

          .exam-hero-stats {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }

          .exam-hero-stat:nth-child(2) { border-right: 0; }

          .exam-hero-stat:nth-child(-n+2) {
            border-bottom: 1px solid rgba(255,255,255,.13);
          }
        }

        @media(max-width: 850px) {
          .exam-panels { grid-template-columns: 1fr; }
        }

        @media(max-width: 600px) {
          .exam-premium-page { padding: 12px; }

          .exam-hero-main {
            grid-template-columns: 62px minmax(0,1fr);
            gap: 13px;
            min-height: auto;
            padding: 23px 16px;
          }

          .exam-crest-frame {
            width: 60px;
            height: 60px;
            padding: 5px;
          }

          .exam-hero-title { font-size: 23px; }
          .exam-hero-kicker {
            font-size: 8px;
            letter-spacing: 1px;
          }

          .exam-hero-description { font-size: 9px; }

          .exam-readtolead {
            grid-column: 1 / -1;
            margin-left: 75px;
            padding-left: 13px;
          }

          .exam-readtolead strong { font-size: 23px; }

          .exam-hero-stats {
            grid-template-columns: repeat(2,minmax(0,1fr));
          }

          .exam-hero-stat {
            gap: 8px;
            padding: 13px 10px;
          }

          .exam-hero-stat-icon {
            width: 33px;
            height: 33px;
          }

          .exam-hero-stat-graph { display: none; }
          .exam-hero-stat-label { font-size: 7px; }
          .exam-hero-stat-info strong { font-size: 19px; }

          .exam-panel { padding: 16px; }
          .exam-quick-grid { grid-template-columns: 1fr; }
          .exam-overview-chart { gap: 12px; }
        }

        @media(prefers-reduced-motion: reduce) {
          .exam-premium-page *,
          .exam-premium-page *::before,
          .exam-premium-page *::after {
            animation-duration: .01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      

      {/* MAIN HOD HERO */}
      <section className="exam-hero">
        <div className="exam-hero-main">
          <div className="exam-crest-frame">
            <img
              src={logo}
              alt="College crest"
            />
          </div>

          <div className="exam-hero-copy">
            <div className="exam-hero-kicker">
              <Sparkles size={13} />
              {getGreeting()}
            </div>

            <h1 className="exam-hero-title">
              Head of Department Dashboard
            </h1>

            <div className="exam-hero-underline" />

            <p className="exam-hero-description">
              {hodDepartment.name} · Academic year 2026–27 · Odd
              Semester. Monitor academic performance, support faculty,
              review requests and keep every programme moving forward.
            </p>

            <div className="exam-college-badges">
              <span className="exam-college-badge">
                <ShieldCheck size={11} /> NAAC Grade A
              </span>

              <span className="exam-college-badge">
                <GraduationCap size={11} /> Affiliated to SPPU
              </span>

              <span className="exam-college-badge">
                <Award size={11} /> Since 1948
              </span>
            </div>
          </div>

          <div className="exam-readtolead">
            <strong>Read to Lead</strong>
            <span>EDUCATE · EMPOWER · EXCEL</span>
          </div>
        </div>

        <div className="exam-hero-divider" />

        <div className="exam-hero-stats">
          {hodKpis.slice(0, 4).map((item, index) => (
            <HeroStat
              key={item.id}
              index={index}
              icon={kpiIcons[item.icon] || Users}
              label={item.label}
              value={item.value}
              trend={item.change || "Overview"}
              sparkline={SPARKLINES[index]}
            />
          ))}
        </div>
      </section>

      {/* SYSTEM OVERVIEW + RECENT ACTIVITIES */}
      <section className="exam-panels">
        <article className="exam-panel">
          <PanelHeading
            title="Department Overview"
            subtitle="Latest monthly average attendance"
            icon={Activity}
            action={
              <span className="exam-panel-link">
                <CheckCircle2 size={13} /> Preview
              </span>
            }
          />

          {hasAttendance ? (
            <DonutChart
              approved={latestAttendance}
              pending={Math.round((100 - latestAttendance) * 10) / 10}
            />
          ) : (
            <div className="exam-empty">No attendance data available.</div>
          )}
        </article>

        <article className="exam-panel">
          <PanelHeading
            title="Department Activity"
            subtitle="Latest department actions and updates"
            icon={Radio}
            action={
              <button
                type="button"
                className="exam-panel-link"
                onClick={() =>
                  setShowAllActivities((value) => !value)
                }
              >
                {showAllActivities ? "Show Less" : "View All"}
                <ArrowUpRight size={13} />
              </button>
            }
          />

          {activities.length ? (
            <div className="exam-activity-list">
              {activities.map((activity, index) => {
                const Icon = activityIcons[activity.icon] || FileText;

                return (
                  <div
                    className="exam-activity"
                    key={activity.id}
                    style={{ animationDelay: `${index * 90}ms` }}
                  >
                    <span className="exam-activity-icon">
                      <Icon size={15} />
                    </span>

                    <div className="exam-activity-content">
                      <div className="exam-activity-title">
                        {activity.title}
                      </div>

                      <div className="exam-activity-time">
                        <Clock3
                          size={10}
                          style={{ display: "inline", marginRight: 4 }}
                        />
                        {activity.time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="exam-empty">
              No recent department activity.
            </div>
          )}
        </article>
      </section>

      {/* PROGRAMME PERFORMANCE + PENDING APPROVALS */}
      <section className="exam-panels">
        <article className="exam-panel">
          <PanelHeading
            title="Programme Performance"
            subtitle="Academic performance by programme"
            icon={GraduationCap}
          />

          {hodProgramPerformance.length ? (
            hodProgramPerformance.map((item, index) => (
              <ProgressBar
                key={item.label}
                label={item.label}
                value={item.value}
                max={100}
                suffix="%"
                color={barColors[index % barColors.length]}
              />
            ))
          ) : (
            <div className="exam-empty">No programme data available.</div>
          )}

          <div className="exam-data-status">
            <Clock3 size={14} />
            Department Focus: Keep attendance above the institutional
            target and clear pending reviews.
          </div>
        </article>

        <article className="exam-panel">
          <PanelHeading
            title="Pending Approvals"
            subtitle="Requests awaiting department review"
            icon={CalendarClock}
            action={
              <Link className="exam-panel-link" to="/hod/teachers">
                Review Requests <ArrowUpRight size={13} />
              </Link>
            }
          />

          {hodPendingApprovals.length ? (
            <div className="exam-table-wrap">
              <table className="exam-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Requester</th>
                    <th>Submitted</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {hodPendingApprovals.slice(0, 5).map((row) => (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.type}</strong>
                        <small>
                          {row.id} · {row.detail}
                        </small>
                      </td>
                      <td>{row.requester}</td>
                      <td>{row.submitted}</td>
                      <td>
                        <span className="exam-table-status">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="exam-empty">There are no requests to display.</div>
          )}
        </article>
      </section>

      {/* ATTENDANCE TREND + FACULTY WORKLOAD */}
      <section className="exam-panels">
        <article className="exam-panel">
          <PanelHeading
            title="Student Attendance Trend"
            subtitle="Average attendance across the last six months"
            icon={Activity}
          />

          {hasAttendance ? (
            attendanceValues.map((value, index) => (
              <ProgressBar
                key={attendanceLabels[index] || index}
                label={attendanceLabels[index] || `Month ${index + 1}`}
                value={value}
                color={barColors[index % barColors.length]}
              />
            ))
          ) : (
            <div className="exam-empty">No attendance data available.</div>
          )}
        </article>

        <article className="exam-panel">
          <PanelHeading
            title="Faculty Workload"
            subtitle="Weekly teaching hours by faculty"
            icon={Users}
            action={
              <Link className="exam-panel-link" to="/hod/teachers">
                Manage Faculty <ArrowUpRight size={13} />
              </Link>
            }
          />

          {hodFacultyWorkload.length ? (
            hodFacultyWorkload.slice(0, 5).map((item, index) => (
              <ProgressBar
                key={item.label}
                label={item.label}
                value={item.value}
                max={20}
                suffix=" hrs"
                color={barColors[index % barColors.length]}
              />
            ))
          ) : (
            <div className="exam-empty">No workload data available.</div>
          )}
        </article>
      </section>

      {/* QUICK LINKS */}
      <section className="exam-quick-grid">
        <Link
          to="/hod/teachers"
          className="exam-panel exam-quick-link"
        >
          <PanelHeading
            title="Manage Faculty"
            subtitle="Review faculty records and workload"
            icon={GraduationCap}
            action={<ArrowUpRight color="#A8212F" size={18} />}
          />
        </Link>

        <Link
          to="/hod/reports"
          className="exam-panel exam-quick-link"
        >
          <PanelHeading
            title="Department Reports"
            subtitle="Review department performance reports"
            icon={FileText}
            action={<ArrowUpRight color="#A8212F" size={18} />}
          />
        </Link>
      </section>

      <p className="exam-footer">
        Dashboard figures currently use project preview data.
      </p>

      <footer className="exam-footer">
        © 2026 Abeda Inamdar Senior College ·{" "}
        <em>Read to Lead</em>
      </footer>
    </main>
  );
}