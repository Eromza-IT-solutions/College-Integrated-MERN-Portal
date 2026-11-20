import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";

import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import DataTable from "../../../components/ui/Table";
import ErrorState from "../../../components/ui/ErrorState";
import Input from "../../../components/ui/Input";
import Loader from "../../../components/ui/Loader";
import Modal from "../../../components/ui/Modal";
import Select from "../../../components/ui/Select";
import {
  fetchExamReference,
  fetchExams,
  updateExam,
} from "../../../services/adminApi";
import { useApiData } from "../../../hooks/useApiData";
import {
  formatDate,
  formatTime,
  programLabel,
  subjectLabel,
} from "../../../utils/examAdmin";

import "../../../assets/styles/aisc-premium.css";

const EMPTY_PAPER = {
  subjectId: "",
  date: "",
  startTime: "",
  endTime: "",
  room: "",
};

export default function ExamTimetables() {
  const exams = useApiData(() => fetchExams());
  const reference = useApiData(() => fetchExamReference());
  const [selectedExamId, setSelectedExamId] = useState("");
  const [schedule, setSchedule] = useState([]);
  const [paperOpen, setPaperOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [paper, setPaper] = useState(EMPTY_PAPER);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const rows = useMemo(() => exams.data ?? [], [exams.data]);
  const subjects = useMemo(() => reference.data?.subjects ?? [], [reference.data]);
  const programs = useMemo(() => reference.data?.programs ?? [], [reference.data]);
  const activeExam =
    rows.find((exam) => String(exam._id) === String(selectedExamId)) || rows[0];

  const eligibleSubjects = useMemo(
    () =>
      subjects.filter(
        (subject) =>
          (!activeExam || String(subject.programId) === String(activeExam.programId)) &&
          (!activeExam || Number(subject.semester) === Number(activeExam.semester)),
      ),
    [activeExam, subjects],
  );

  useEffect(() => {
    setSchedule(activeExam?.schedule ?? []);
    setMessage("");
    setError("");
  }, [activeExam?._id, activeExam?.schedule]);

  const updatePaperField = (field, value) => {
    setPaper((current) => ({ ...current, [field]: value }));
    setError("");
  };

  const openAdd = () => {
    setEditingIndex(null);
    setPaper({
      ...EMPTY_PAPER,
      subjectId: eligibleSubjects.find(
        (subject) => !schedule.some((item) => String(item.subjectId) === String(subject._id)),
      )?._id || "",
    });
    setError("");
    setPaperOpen(true);
  };

  const openEdit = (index) => {
    const item = schedule[index];
    setEditingIndex(index);
    setPaper({
      subjectId: String(item.subjectId || ""),
      date: item.date || "",
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      room: item.room || "",
    });
    setError("");
    setPaperOpen(true);
  };

  const closePaper = () => {
    setPaperOpen(false);
    setEditingIndex(null);
    setPaper(EMPTY_PAPER);
    setError("");
  };

  const handlePaperSave = () => {
    if (!paper.subjectId || !paper.date || !paper.startTime || !paper.endTime || !paper.room.trim()) {
      setError("Fill every timetable field before saving this paper.");
      return;
    }

    const duplicate = schedule.some(
      (item, index) =>
        String(item.subjectId) === String(paper.subjectId) && index !== editingIndex,
    );
    if (duplicate) {
      setError("This paper is already in the timetable.");
      return;
    }

    if (paper.endTime <= paper.startTime) {
      setError("The paper must end after it starts.");
      return;
    }

    const next = {
      subjectId: paper.subjectId,
      date: paper.date,
      startTime: paper.startTime,
      endTime: paper.endTime,
      room: paper.room.trim(),
    };

    setSchedule((current) => {
      if (editingIndex === null) return [...current, next];
      return current.map((item, index) => (index === editingIndex ? next : item));
    });
    setMessage("");
    closePaper();
  };

  const removePaper = (index) => {
    setSchedule((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setMessage("");
  };

  const handlePublish = async () => {
    if (!activeExam) return;
    if (!schedule.length) {
      setError("Add at least one paper before publishing the timetable.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const updated = await updateExam(activeExam._id, { schedule });
      setSchedule(updated.schedule ?? schedule);
      setMessage("Timetable saved. Hall tickets can now be generated.");
      exams.reload();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "paper",
      header: "Paper",
      render: (item) => (
        <div>
          <div className="aisc-table-primary">{subjectLabel(item.subjectId, eligibleSubjects)}</div>
          <div className="aisc-table-secondary">Subject ID · {String(item.subjectId).slice(-6)}</div>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (item) => (
        <span className="font-semibold text-[#14264B]">{formatDate(item.date)}</span>
      ),
    },
    {
      key: "time",
      header: "Time",
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Clock3 size={13} />
          {formatTime(item.startTime)} – {formatTime(item.endTime)}
        </div>
      ),
    },
    {
      key: "room",
      header: "Room",
      render: (item) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-[#14264B]">
          <MapPin size={13} /> {item.room}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item, index) => (
        <div className="flex items-center gap-1.5">
          <button type="button" title="Edit paper" className="aisc-action-btn" onClick={() => openEdit(index)}>
            <Pencil size={14} />
          </button>
          <button type="button" title="Remove paper" className="aisc-action-btn" onClick={() => removePaper(index)}>
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ];

  const uniqueDays = new Set(schedule.map((item) => item.date)).size;
  const uniqueRooms = new Set(schedule.map((item) => item.room)).size;

  return (
    <div className="aisc-premium space-y-6">
      <section className="aisc-page-head">
        <div>
          <div className="aisc-eyebrow"><Sparkles size={13} /> Examination Cell</div>
          <h1 className="aisc-page-title">Exam Timetables</h1>
          <p className="aisc-page-subtitle">
            Build the paper-by-paper schedule for each examination session.
          </p>
        </div>
        <div className="aisc-date-chip"><CalendarDays size={14} /> Schedule Builder</div>
      </section>

      <section className="aisc-hero">
        <div className="aisc-hero-copy">
          <div className="aisc-hero-kicker"><CalendarDays size={12} /> ACADEMIC OPERATIONS</div>
          <h2 className="aisc-hero-title">Examination Schedule</h2>
          <p className="aisc-hero-text">
            Choose a session, add each paper with date, time and room, then save. Hall tickets are generated only when every form subject has a paper.
          </p>
          <div className="aisc-hero-actions">
            <button
              type="button"
              className="aisc-btn aisc-btn-primary"
              onClick={openAdd}
              disabled={!activeExam || eligibleSubjects.length === 0}
            >
              <Plus size={15} /> Add paper
            </button>
            <button
              type="button"
              className="aisc-btn aisc-btn-glass"
              onClick={handlePublish}
              disabled={saving || !activeExam || schedule.length === 0}
            >
              <Save size={15} /> {saving ? "Saving..." : "Save timetable"}
            </button>
          </div>
        </div>
        <div className="aisc-hero-seal"><CalendarDays size={76} strokeWidth={1.1} /></div>
      </section>

      <section className="aisc-panel">
        <div className="aisc-panel-head">
          <div>
            <h3 className="aisc-panel-title">Choose Examination Session</h3>
            <p className="aisc-panel-sub">Timetables are stored on the session record</p>
          </div>
          <Select
            value={activeExam?._id || ""}
            onChange={(event) => {
              setSelectedExamId(event.target.value);
              setMessage("");
              setError("");
            }}
            aria-label="Choose examination session"
            className="min-w-[260px]"
            disabled={!rows.length}
          >
            {rows.length === 0 ? <option value="">No sessions available</option> : null}
            {rows.map((exam) => (
              <option key={exam._id} value={exam._id}>
                {exam.name} · Semester {exam.semester}
              </option>
            ))}
          </Select>
        </div>

        {activeExam ? (
          <div className="grid gap-3 border-b border-slate-100 bg-[#FBF6EE] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="aisc-detail-box">
              <div className="aisc-kpi-label">Session</div>
              <div className="mt-2 text-sm font-bold text-[#14264B]">{activeExam.name}</div>
            </div>
            <div className="aisc-detail-box">
              <div className="aisc-kpi-label">Program</div>
              <div className="mt-2 text-sm font-bold text-[#14264B]">
                {programLabel(activeExam.programId, programs)}
              </div>
            </div>
            <div className="aisc-detail-box">
              <div className="aisc-kpi-label">Papers / Days</div>
              <div className="mt-2 text-sm font-bold text-[#14264B]">
                {schedule.length} / {uniqueDays}
              </div>
            </div>
            <div className="aisc-detail-box">
              <div className="aisc-kpi-label">Rooms used</div>
              <div className="mt-2 text-sm font-bold text-[#14264B]">{uniqueRooms}</div>
            </div>
          </div>
        ) : null}

        {exams.loading || reference.loading ? (
          <Loader label="Loading examination timetables..." />
        ) : exams.error || reference.error ? (
          <ErrorState
            title="Could not load timetables"
            description={exams.error?.message || reference.error?.message}
            onRetry={() => {
              exams.reload();
              reference.reload();
            }}
          />
        ) : !activeExam ? (
          <ErrorState
            title="No examination session available"
            description="Create an examination session before building its timetable."
          />
        ) : (
          <DataTable
            columns={columns}
            rows={schedule}
            getRowKey={(item, index) => item.subjectId || index}
            emptyTitle="No papers scheduled yet"
            emptyDescription="Add a paper to start building this timetable."
          />
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs font-medium">
            {message ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 size={14} /> {message}
              </span>
            ) : null}
            {error ? <span className="text-red-600">{error}</span> : null}
            {!message && !error ? (
              <span className="text-slate-500">
                {schedule.length} paper{schedule.length === 1 ? "" : "s"} in this timetable
              </span>
            ) : null}
          </div>
          {activeExam ? <Badge variant="neutral">Session {String(activeExam._id).slice(-6)}</Badge> : null}
        </div>
      </section>

      <Modal
        open={paperOpen}
        onClose={closePaper}
        title={editingIndex === null ? "Add Examination Paper" : "Edit Examination Paper"}
        description="Pick a subject from this program and semester."
        footer={
          <>
            <Button variant="secondary" onClick={closePaper}>Cancel</Button>
            <Button onClick={handlePaperSave}>
              {editingIndex === null ? "Add paper" : "Save paper"}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {error}
            </div>
          ) : null}

          <Select
            label="Paper *"
            value={paper.subjectId}
            onChange={(event) => updatePaperField("subjectId", event.target.value)}
          >
            <option value="">Select subject</option>
            {eligibleSubjects.map((subject) => (
              <option key={subject._id} value={subject._id}>
                {subjectLabel(subject._id, eligibleSubjects)}
              </option>
            ))}
          </Select>

          <Input
            label="Date *"
            type="date"
            value={paper.date}
            onChange={(event) => updatePaperField("date", event.target.value)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Start time *"
              type="time"
              value={paper.startTime}
              onChange={(event) => updatePaperField("startTime", event.target.value)}
            />
            <Input
              label="End time *"
              type="time"
              value={paper.endTime}
              onChange={(event) => updatePaperField("endTime", event.target.value)}
            />
          </div>

          <Input
            label="Room *"
            value={paper.room}
            onChange={(event) => updatePaperField("room", event.target.value)}
            placeholder="e.g. Room A-201"
          />
        </div>
      </Modal>
    </div>
  );
}
