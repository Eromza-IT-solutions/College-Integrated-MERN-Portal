import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList, Send, Save } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { getRoster, listTimetable } from "../../services/academicsService";
import { enterMarks, listMarks, submitMarks } from "../../services/marksService";

const VARIANT = { draft: "neutral", submitted: "warning", approved: "success", returned: "error" };

export default function Marks() {
  const [slots, setSlots] = useState([]);
  const [key, setKey] = useState(""); // "<slotId>"
  const [component, setComponent] = useState("Internal Test 1");
  const [outOf, setOutOf] = useState("20");
  const [students, setStudents] = useState([]);
  const [values, setValues] = useState({});
  const [marks, setMarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // One option per subject + semester (a subject can have several weekly slots)
  const options = useMemo(() => {
    const seen = new Map();
    slots.forEach((s) => {
      const k = `${s.subjectId?._id}|${s.semester}|${s.division}`;
      if (!seen.has(k)) seen.set(k, s);
    });
    return [...seen.values()];
  }, [slots]);
  const slot = slots.find((s) => s._id === key);

  useEffect(() => {
    listTimetable()
      .then((s) => { setSlots(s); if (s[0]) setKey(s[0]._id); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const loadMarks = useCallback(async () => {
    if (!slot) return;
    try { setMarks(await listMarks({ subjectId: slot.subjectId._id, semester: slot.semester })); }
    catch (e) { setError(e.message); }
  }, [slot]);

  useEffect(() => {
    if (!slot) return;
    setValues({});
    getRoster(slot._id).then((r) => setStudents(r.students)).catch((e) => setError(e.message));
    loadMarks();
  }, [slot, loadMarks]);

  const handleSave = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      const entries = students
        .filter((st) => values[st.studentId] !== undefined && values[st.studentId] !== "")
        .map((st) => ({ studentId: st.studentId, obtained: Number(values[st.studentId]) }));
      if (!entries.length) throw new Error("Enter marks for at least one student");
      const res = await enterMarks({
        subjectId: slot.subjectId._id, semester: slot.semester, academicYearId: slot.academicYearId,
        component: component.trim(), outOf: Number(outOf), entries,
      });
      setNotice(`Saved ${res.saved.length} entries${res.failed.length ? `, ${res.failed.length} failed: ${res.failed[0].message}` : ""}.`);
      await loadMarks();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const pendingIds = marks.filter((m) => m.status === "draft" || m.status === "returned").map((m) => m._id);
  const handleSubmit = async () => {
    setBusy(true); setError(""); setNotice("");
    try {
      await submitMarks(pendingIds);
      setNotice("Marks sent to the HOD for approval.");
      await loadMarks();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const columns = [
    { key: "stu", header: "Student", render: (m) => <span className="text-xs font-semibold text-eromza-text">{m.studentId?.enrollmentNumber || "-"}</span> },
    { key: "comp", header: "Component", render: (m) => <span className="text-xs text-eromza-muted">{m.component}</span> },
    { key: "marks", header: "Marks", render: (m) => <span className="text-xs text-eromza-muted">{m.obtained}/{m.outOf}</span> },
    { key: "status", header: "Status", render: (m) => <Badge variant={VARIANT[m.status] || "neutral"}>{m.status}</Badge> },
    { key: "note", header: "HOD note", render: (m) => <span className="text-xs text-eromza-muted">{m.reviewNote || m.note || "-"}</span> },
  ];

  const count = (s) => marks.filter((m) => m.status === s).length;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Teaching workspace" title="Marks" description="Enter internal marks, then send them to your HOD for approval." />
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Draft / returned" value={String(pendingIds.length)} tone="warning" icon={ClipboardList} />
        <StatCard label="Awaiting HOD" value={String(count("submitted"))} tone="info" icon={Send} />
        <StatCard label="Approved" value={String(count("approved"))} tone="success" icon={CheckCircle2} />
        <StatCard label="Students" value={String(students.length)} tone="accent" icon={ClipboardList} />
      </div>

      <Card>
        <CardHeader title="Enter marks" description="Pick the class, name the component and fill marks" />
        <CardBody className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Select label="Class" value={key} onChange={(e) => setKey(e.target.value)}>
              {options.map((s) => <option key={s._id} value={s._id}>{s.subjectId?.name} · Sem {s.semester} Div {s.division}</option>)}
            </Select>
            <Input label="Component" value={component} onChange={(e) => setComponent(e.target.value)} />
            <Input label="Out of" type="number" min="0.5" step="0.5" value={outOf} onChange={(e) => setOutOf(e.target.value)} />
          </div>
          {!loading && !options.length && <p className="text-xs text-eromza-muted">No classes assigned to you yet.</p>}
          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
            {students.map((st) => (
              <div key={st.studentId} className="flex items-center justify-between gap-3 rounded-lg bg-eromza-bg p-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-eromza-text">{st.fullName || "Student"}</p>
                  <p className="text-[11px] text-eromza-subtle">{st.enrollmentNumber}</p>
                </div>
                <input
                  type="number" min="0" max={outOf} step="0.5" placeholder={`/ ${outOf}`}
                  value={values[st.studentId] ?? ""}
                  onChange={(e) => setValues((c) => ({ ...c, [st.studentId]: e.target.value }))}
                  className="w-24 rounded-lg border border-eromza-border px-2 py-1 text-sm"
                />
              </div>
            ))}
          </div>
          <Button onClick={handleSave} disabled={busy || !students.length}><Save size={16} /> {busy ? "Saving..." : "Save marks"}</Button>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Entered marks"
          description="Status of everything you have entered for this subject"
          action={<Button onClick={handleSubmit} disabled={busy || !pendingIds.length}><Send size={16} /> Send {pendingIds.length} to HOD</Button>}
        />
        <DataTable columns={columns} rows={marks} getRowKey={(m) => m._id} emptyTitle="No marks entered yet" />
      </Card>
    </div>
  );
}
