import { useEffect, useMemo, useState } from "react";
import { Ban, Plus } from "lucide-react";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import ErrorState from "../../components/ui/ErrorState";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import { useApiData } from "../../hooks/useApiData";
import {
  DAY_NAMES,
  createTimetableSlot,
  fetchTimetableReference,
  listTimetable,
  updateTimetableSlot,
} from "../../services/academicsService";

// Show the server's field-by-field errors when there are any.
const describe = (err) => {
  const list = err.cause?.response?.data?.error?.errors;
  return list?.length ? list.map((e) => `${e.field}: ${e.message}`).join(" | ") : err.message;
};

const DAYS = [1, 2, 3, 4, 5, 6]; // Monday to Saturday
const MIN_PERIODS = 8;
const MAX_PERIOD = 12; // same limit as the server
const SEMESTERS = Array.from({ length: 8 }, (_, i) => i + 1);

const blankForm = (day = "1", period = "1") => ({
  dayOfWeek: day, period, subjectId: "", teacherUserId: "", startTime: "", endTime: "", room: "",
});

/**
 * Weekly timetable of one class division: add a lecture, change it, or take it off the timetable.
 * The server limits a HOD to their own department; a Super Admin can manage every department.
 */
export default function TimetableManager({ eyebrow = "Timetable", className = "" }) {
  const [yearId, setYearId] = useState("");
  const [programId, setProgramId] = useState("");
  const [semester, setSemester] = useState("1");
  const [division, setDivision] = useState("A");
  const [notice, setNotice] = useState(null); // { type: "ok" | "error", text }

  // Dropdown data. Subjects and teachers arrive once a class is chosen.
  const ref = useApiData(
    () => fetchTimetableReference({ ...(programId ? { programId, semester } : {}) }),
    `${programId}|${semester}`,
  );
  const years = useMemo(() => ref.data?.academicYears ?? [], [ref.data]);
  const programs = ref.data?.programs ?? [];
  const subjects = ref.data?.subjects ?? [];
  const teachers = ref.data?.teachers ?? [];

  // Start on the current academic year.
  useEffect(() => {
    if (yearId || !years.length) return;
    setYearId((years.find((y) => y.status === "current") ?? years[0])._id);
  }, [years, yearId]);

  const ready = Boolean(yearId && programId && division.trim());
  const slotsKey = JSON.stringify([yearId, programId, semester, division]);
  const slotsData = useApiData(
    () => (ready
      ? listTimetable({ academicYearId: yearId, programId, semester, division: division.trim() })
      : Promise.resolve([])),
    slotsKey,
  );
  const slots = useMemo(() => slotsData.data ?? [], [slotsData.data]);

  const cellOf = useMemo(() => {
    const map = new Map();
    slots.forEach((s) => map.set(`${s.dayOfWeek}-${s.period}`, s));
    return map;
  }, [slots]);
  const periods = Array.from({ length: Math.max(MIN_PERIODS, ...slots.map((s) => s.period)) }, (_, i) => i + 1);

  /* ---- add / edit a lecture ---- */
  const [editing, setEditing] = useState(null); // null = closed, {} = adding, slot = editing that slot
  const [form, setForm] = useState(blankForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  const openNew = (day, period) => { setForm(blankForm(String(day), String(period))); setFormError(""); setEditing({}); };
  const openEdit = (slot) => {
    setForm({
      dayOfWeek: String(slot.dayOfWeek),
      period: String(slot.period),
      subjectId: slot.subjectId?._id ?? "",
      teacherUserId: slot.teacherUserId?._id ?? "",
      startTime: slot.startTime ?? "",
      endTime: slot.endTime ?? "",
      room: slot.room ?? "",
    });
    setFormError("");
    setEditing(slot);
  };
  const close = () => setEditing(null);
  const adding = editing !== null && !editing._id;

  async function save() {
    setSaving(true);
    setFormError("");
    try {
      const times = {
        ...(form.startTime ? { startTime: form.startTime } : {}),
        ...(form.endTime ? { endTime: form.endTime } : {}),
      };
      if (adding) {
        await createTimetableSlot({
          academicYearId: yearId,
          programId,
          semester: Number(semester),
          division: division.trim(),
          subjectId: form.subjectId,
          teacherUserId: form.teacherUserId,
          dayOfWeek: Number(form.dayOfWeek),
          period: Number(form.period),
          room: form.room.trim(),
          ...times,
        });
      } else {
        await updateTimetableSlot(editing._id, {
          teacherUserId: form.teacherUserId,
          dayOfWeek: Number(form.dayOfWeek),
          period: Number(form.period),
          room: form.room.trim(),
          ...times,
        });
      }
      close();
      setNotice({ type: "ok", text: "Timetable saved." });
      slotsData.reload();
    } catch (err) {
      setFormError(describe(err));
    } finally {
      setSaving(false);
    }
  }

  // Slots are never deleted (old attendance points to them); they are taken off the timetable instead.
  async function remove() {
    if (!window.confirm("Remove this lecture from the timetable?")) return;
    setSaving(true);
    setFormError("");
    try {
      await updateTimetableSlot(editing._id, { isActive: false });
      close();
      setNotice({ type: "ok", text: "Lecture removed." });
      slotsData.reload();
    } catch (err) {
      setFormError(describe(err));
    } finally {
      setSaving(false);
    }
  }

  const program = programs.find((p) => p._id === programId);
  const canSave = adding
    ? form.subjectId && form.teacherUserId
    : form.teacherUserId;

  return (
    <div className={`space-y-6 ${className}`}>
      <PageHeader
        eyebrow={eyebrow}
        title="Manage Timetable"
        description="Choose a class and division, then add or change its weekly lectures."
      />

      <Card>
        <CardHeader title="Class" description="The timetable of one division of one class" />
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <Select label="Academic year" value={yearId} onChange={(e) => setYearId(e.target.value)}>
            <option value="">Select...</option>
            {years.map((y) => <option key={y._id} value={y._id}>{y.label}{y.status === "current" ? " (current)" : ""}</option>)}
          </Select>
          <Select label="Class" value={programId} onChange={(e) => setProgramId(e.target.value)}>
            <option value="">Select a class...</option>
            {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
          <Select label="Semester" value={semester} onChange={(e) => setSemester(e.target.value)}>
            {SEMESTERS.map((n) => <option key={n} value={n}>Semester {n}</option>)}
          </Select>
          <Input label="Division" value={division} maxLength={3} onChange={(e) => setDivision(e.target.value.toUpperCase())} />
        </div>
        {ref.error ? <ErrorState description={ref.error.message} onRetry={ref.reload} /> : null}
      </Card>

      <Card>
        <CardHeader
          title="Weekly timetable"
          description={program ? `${program.name} - Semester ${semester} - Division ${division || "-"}` : "Select a class to see its timetable"}
        />
        {notice ? (
          <p role="status" className={`px-5 pt-4 text-xs ${notice.type === "ok" ? "text-emerald-700" : "text-eromza-error"}`}>{notice.text}</p>
        ) : null}

        {!ready ? (
          <p className="px-5 py-10 text-center text-xs text-eromza-subtle">Pick the academic year, class and division above.</p>
        ) : slotsData.error ? (
          <ErrorState description={slotsData.error.message} onRetry={slotsData.reload} />
        ) : slotsData.loading ? (
          <Loader label="Loading timetable..." />
        ) : (
          <div className="overflow-x-auto p-5">
            <table className="w-full min-w-[820px] border-collapse text-left">
              <thead>
                <tr>
                  <th className="w-24 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">Day</th>
                  {periods.map((p) => (
                    <th key={p} className="px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">Period {p}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day} className="border-t border-eromza-border align-top">
                    <th scope="row" className="px-2 py-3 text-xs font-semibold text-eromza-text">{DAY_NAMES[day]}</th>
                    {periods.map((period) => {
                      const slot = cellOf.get(`${day}-${period}`);
                      return (
                        <td key={period} className="p-1.5">
                          {slot ? (
                            <button
                              type="button"
                              onClick={() => openEdit(slot)}
                              className="w-full rounded-lg border border-eromza-border bg-white p-2 text-left transition hover:border-eromza-accent hover:bg-eromza-bg"
                            >
                              <span className="block text-xs font-semibold text-eromza-text">{slot.subjectId?.code ?? "-"}</span>
                              <span className="mt-0.5 block text-[11px] text-eromza-muted">{slot.teacherUserId?.fullName ?? "-"}</span>
                              <span className="mt-0.5 block text-[10px] text-eromza-subtle">
                                {[slot.startTime && slot.endTime ? `${slot.startTime}-${slot.endTime}` : null, slot.room].filter(Boolean).join(" · ") || " "}
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              aria-label={`Add lecture on ${DAY_NAMES[day]}, period ${period}`}
                              onClick={() => openNew(day, period)}
                              className="grid h-full min-h-[64px] w-full place-items-center rounded-lg border border-dashed border-eromza-border text-eromza-subtle transition hover:border-eromza-accent hover:text-eromza-accent"
                            >
                              <Plus size={14} />
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {!slots.length ? (
              <p className="pt-4 text-center text-xs text-eromza-subtle">No lectures yet. Click + to add the first one.</p>
            ) : null}
          </div>
        )}
      </Card>

      <Modal
        open={editing !== null}
        onClose={close}
        title={adding ? "Add lecture" : "Edit lecture"}
        footer={(
          <>
            {!adding ? (
              <Button variant="ghost" onClick={remove} disabled={saving}><Ban size={14} /> Remove</Button>
            ) : null}
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button onClick={save} disabled={saving || !canSave}>{saving ? "Saving..." : "Save"}</Button>
          </>
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {adding ? (
            <Select label="Subject" className="sm:col-span-2" value={form.subjectId} onChange={setField("subjectId")}>
              <option value="">Select a subject...</option>
              {subjects.map((s) => <option key={s._id} value={s._id}>{s.code} - {s.name}</option>)}
            </Select>
          ) : (
            <p className="text-sm font-medium text-eromza-text sm:col-span-2">
              {editing?.subjectId ? `${editing.subjectId.code} - ${editing.subjectId.name}` : ""}
            </p>
          )}
          <Select label="Teacher" className="sm:col-span-2" value={form.teacherUserId} onChange={setField("teacherUserId")}>
            <option value="">Select a teacher...</option>
            {teachers.map((t) => <option key={t._id} value={t._id}>{t.fullName}</option>)}
          </Select>
          <Select label="Day" value={form.dayOfWeek} onChange={setField("dayOfWeek")}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{DAY_NAMES[d]}</option>)}
          </Select>
          <Select label="Period" value={form.period} onChange={setField("period")}>
            {Array.from({ length: MAX_PERIOD }, (_, i) => i + 1).map((n) => <option key={n} value={n}>Period {n}</option>)}
          </Select>
          <Input label="Starts (optional)" type="time" value={form.startTime} onChange={setField("startTime")} />
          <Input label="Ends (optional)" type="time" value={form.endTime} onChange={setField("endTime")} />
          <Input label="Room (optional)" className="sm:col-span-2" value={form.room} onChange={setField("room")} />
        </div>
        {formError ? <p role="alert" className="mt-3 text-xs text-eromza-error">{formError}</p> : null}
      </Modal>
    </div>
  );
}
