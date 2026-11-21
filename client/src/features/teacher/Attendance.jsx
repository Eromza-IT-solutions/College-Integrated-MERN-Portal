import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, CheckCircle2, Download, Plus } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { downloadCsv } from "../../utils/csv";
import {
  DAY_NAMES, dayOfWeekOf, getRoster, listRegisters, listTimetable, markAttendance, toDateString,
} from "../../services/academicsService";

const STATUSES = ["present", "absent", "leave"];
const EDIT_DAYS = 7; // server allows corrections for 7 days

const minDate = () => {
  const d = new Date();
  d.setDate(d.getDate() - EDIT_DAYS);
  return toDateString(d);
};

export default function Attendance() {
  const [registers, setRegisters] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [open, setOpen] = useState(false);
  const [slotId, setSlotId] = useState("");
  const [date, setDate] = useState(toDateString());
  const [roster, setRoster] = useState(null); // { alreadyMarked, students }
  const [statuses, setStatuses] = useState({}); // studentId -> status
  const [rosterLoading, setRosterLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [r, s] = await Promise.all([listRegisters(), listTimetable()]);
      setRegisters(r);
      setSlots(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const slot = slots.find((s) => s._id === slotId);
  const weekdayMismatch = slot && date && dayOfWeekOf(date) !== slot.dayOfWeek;

  // Load the student list whenever the lecture or date changes
  useEffect(() => {
    if (!open || !slotId || !date || weekdayMismatch) { setRoster(null); return undefined; }
    let active = true;
    setRosterLoading(true);
    setModalError("");
    getRoster(slotId, date)
      .then((r) => {
        if (!active) return;
        setRoster(r);
        setStatuses(Object.fromEntries(r.students.map((st) => [st.studentId, st.status || "present"])));
      })
      .catch((e) => { if (active) { setRoster(null); setModalError(e.message); } })
      .finally(() => { if (active) setRosterLoading(false); });
    return () => { active = false; };
  }, [open, slotId, date, weekdayMismatch]);

  const openModal = (preset) => {
    setNotice("");
    setModalError("");
    setSlotId(preset?.slotId || slots[0]?._id || "");
    setDate(preset?.lectureDate || toDateString());
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setModalError("");
    try {
      const res = await markAttendance({
        slotId, lectureDate: date,
        records: roster.students.map((st) => ({ studentId: st.studentId, status: statuses[st.studentId] })),
      });
      setNotice(res.corrected ? "Attendance corrected." : "Attendance saved.");
      setOpen(false);
      await load();
    } catch (e) {
      setModalError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(() => registers.map((r) => {
    const total = (r.counts?.present || 0) + (r.counts?.absent || 0) + (r.counts?.leave || 0);
    return {
      id: r._id, slotId: r.slotId, lectureDate: r.lectureDate, period: r.period,
      subject: r.subject ? `${r.subject.name} (${r.subject.code})` : "-",
      klass: `Sem ${r.semester} · Div ${r.division}`,
      present: r.counts?.present || 0, absent: r.counts?.absent || 0, leave: r.counts?.leave || 0, total,
    };
  }), [registers]);

  const average = rows.length ? Math.round(rows.reduce((s, r) => s + (r.total ? (r.present / r.total) * 100 : 0), 0) / rows.length) : 0;
  const absentTotal = rows.reduce((s, r) => s + r.absent, 0);

  const columns = [
    { key: "subject", header: "Class", render: (r) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">{r.subject}</p>
        <p className="mt-1 text-[11px] text-eromza-subtle">{r.klass} · Period {r.period}</p>
      </div>) },
    { key: "date", header: "Date", render: (r) => <span className="text-xs text-eromza-muted">{r.lectureDate}</span> },
    { key: "students", header: "Students", render: (r) => <span className="text-xs text-eromza-muted">{r.present}/{r.total} present</span> },
    { key: "absent", header: "Absent", render: (r) => <Badge variant={r.absent > 3 ? "warning" : "neutral"}>{r.absent}</Badge> },
    { key: "pct", header: "Attendance", render: (r) => {
      const pct = r.total ? Math.round((r.present / r.total) * 100) : 0;
      return <Badge variant={pct >= 85 ? "success" : "warning"}>{pct}%</Badge>;
    } },
    { key: "edit", header: "", className: "text-right", cellClassName: "text-right", render: (r) => (
      <Button variant="ghost" size="sm" onClick={() => openModal({ slotId: r.slotId, lectureDate: r.lectureDate })}>Edit</Button>
    ) },
  ];

  const handleExport = () => {
    downloadCsv("eromza-teacher-attendance.csv", [
      ["Date", "Subject", "Class", "Present", "Absent", "Leave", "Total"],
      ...rows.map((r) => [r.lectureDate, r.subject, r.klass, r.present, r.absent, r.leave, r.total]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Teaching workspace"
        title="Attendance"
        description="Take attendance for your lectures and correct it within 7 days."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport} disabled={!rows.length}><Download size={16} /> Export attendance</Button>
            <Button onClick={() => openModal()} disabled={!slots.length}><Plus size={16} /> Record attendance</Button>
          </>
        }
      />
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Average attendance" value={`${average}%`} tone="success" icon={CalendarCheck} />
        <StatCard label="Registers taken" value={String(rows.length)} tone="info" icon={CheckCircle2} />
        <StatCard label="Total absences" value={String(absentTotal)} tone="warning" icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader title="Attendance register" description="Lectures you have recorded" />
        <DataTable columns={columns} rows={rows} loading={loading} getRowKey={(r) => r.id} emptyTitle="No attendance recorded yet" emptyDescription="Use Record attendance to take your first lecture." />
      </Card>

      <Modal
        open={open}
        onClose={() => !saving && setOpen(false)}
        title="Record attendance"
        description="Pick the lecture and date, then mark each student."
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving || !roster || !roster.students.length}>
              <CheckCircle2 size={16} /> {saving ? "Saving..." : roster?.alreadyMarked ? "Save correction" : "Save attendance"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Lecture" value={slotId} onChange={(e) => setSlotId(e.target.value)}>
            {slots.map((s) => (
              <option key={s._id} value={s._id}>
                {s.subjectId?.name} · Sem {s.semester} Div {s.division} · {DAY_NAMES[s.dayOfWeek]} P{s.period}
              </option>
            ))}
          </Select>
          <Input label="Date" type="date" value={date} min={minDate()} max={toDateString()} onChange={(e) => setDate(e.target.value)} />

          {weekdayMismatch && (
            <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              This lecture is on {DAY_NAMES[slot.dayOfWeek]}. Pick a {DAY_NAMES[slot.dayOfWeek]} date.
            </p>
          )}
          {modalError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">{modalError}</p>}
          {rosterLoading && <p className="text-xs text-eromza-muted">Loading students...</p>}

          {roster && !roster.students.length && <p className="text-xs text-eromza-muted">No students are enrolled for this lecture.</p>}
          {roster && roster.students.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-eromza-text">{roster.students.length} students{roster.alreadyMarked ? " · already recorded" : ""}</p>
                <Button size="sm" variant="ghost" onClick={() => setStatuses(Object.fromEntries(roster.students.map((st) => [st.studentId, "present"])))}>All present</Button>
              </div>
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {roster.students.map((st) => (
                  <div key={st.studentId} className="flex items-center justify-between gap-3 rounded-lg bg-eromza-bg p-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-eromza-text">{st.fullName || "Student"}</p>
                      <p className="text-[11px] text-eromza-subtle">{st.enrollmentNumber}</p>
                    </div>
                    <div className="flex gap-1">
                      {STATUSES.map((v) => (
                        <Button key={v} size="sm" variant={statuses[st.studentId] === v ? "primary" : "secondary"} onClick={() => setStatuses((cur) => ({ ...cur, [st.studentId]: v }))}>
                          {v[0].toUpperCase() + v.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
