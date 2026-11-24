import { useState } from "react";
import { Ban, Pencil, Plus } from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardHeader } from "../../../components/ui/Card";
import DataTable from "../../../components/ui/Table";
import ErrorState from "../../../components/ui/ErrorState";
import Input from "../../../components/ui/Input";
import Modal from "../../../components/ui/Modal";
import PageHeader from "../../../components/ui/PageHeader";
import Pagination from "../../../components/ui/Pagination";
import SearchInput from "../../../components/ui/SearchInput";
import Select from "../../../components/ui/Select";
import { useApiData } from "../../../hooks/useApiData";
import {
  CATEGORIES, FACULTIES, LEVELS,
  listDepartments, createDepartment, updateDepartment, deactivateDepartment,
  listPrograms, createProgram, updateProgram, deactivateProgram,
  listSubjects, createSubject, updateSubject, deactivateSubject,
} from "../../../services/catalogService";

const humanize = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());

// The server sends field-by-field errors for a bad form; show them instead of just "Invalid request".
const describe = (err) => {
  const list = err.cause?.response?.data?.error?.errors;
  return list?.length ? list.map((e) => `${e.field}: ${e.message}`).join(" | ") : err.message;
};

const StatusBadge = ({ row }) => (
  <Badge variant={row.isActive ? "success" : "neutral"}>{row.isActive ? "Active" : "Inactive"}</Badge>
);

/**
 * One list + add/edit form, reused by the three tabs.
 *   load(params) -> { rows, meta }     create(body) / update(id, body) / deactivate(id)
 *   fields: [{ name, label, type?, options?: [{ value, label }] }]
 *   toForm(row) -> form values         toBody(form) -> what the API expects
 */
function EntityTab({ noun, load, filters = {}, columns, fields, blank, toForm, toBody, create, update, deactivate, onChanged }) {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null); // null = closed, {} = adding, row = editing that row
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState(null); // { type: "ok" | "error", text }

  const params = { page, limit: 20, ...(search ? { search } : {}), ...filters };
  const { data, loading, error, reload } = useApiData(() => load(params), JSON.stringify(params));
  const rows = data?.rows ?? [];
  const meta = data?.meta;
  const lower = noun.toLowerCase();

  const openNew = () => { setForm(blank); setFormError(""); setEditing({}); };
  const openEdit = (row) => { setForm(toForm(row)); setFormError(""); setEditing(row); };
  const setField = (name) => (e) => setForm((f) => ({ ...f, [name]: e.target.value }));

  async function save() {
    setSaving(true);
    setFormError("");
    try {
      const body = toBody(form);
      if (editing._id) await update(editing._id, body);
      else await create(body);
      setEditing(null);
      setNotice({ type: "ok", text: `${noun} saved.` });
      reload();
      onChanged?.();
    } catch (err) {
      setFormError(describe(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(row) {
    if (!window.confirm(`Deactivate ${lower} "${row.name}"?`)) return;
    try {
      await deactivate(row._id);
      setNotice({ type: "ok", text: `${noun} deactivated.` });
      reload();
      onChanged?.();
    } catch (err) {
      setNotice({ type: "error", text: describe(err) });
    }
  }

  const actions = {
    key: "actions",
    header: "Actions",
    render: (row) => (
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={() => openEdit(row)}><Pencil size={13} /> Edit</Button>
        {row.isActive ? <Button variant="ghost" size="sm" onClick={() => remove(row)}><Ban size={13} /> Deactivate</Button> : null}
      </div>
    ),
  };

  return (
    <Card>
      <CardHeader
        title={`${noun}s`}
        description={meta ? `${meta.total} in total` : "Loading..."}
        action={<Button size="sm" onClick={openNew}><Plus size={14} /> Add {lower}</Button>}
      />
      <div className="p-5 pb-0">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); setSearch(draft.trim()); }}>
          <SearchInput value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={`Search ${lower}s (press Enter)`} />
        </form>
        {notice ? (
          <p role="status" className={`mt-3 text-xs ${notice.type === "ok" ? "text-emerald-700" : "text-eromza-error"}`}>{notice.text}</p>
        ) : null}
      </div>

      {error ? (
        <ErrorState description={error.message} onRetry={reload} />
      ) : (
        <DataTable columns={[...columns, actions]} rows={rows} loading={loading} getRowKey={(r) => r._id} emptyTitle={`No ${lower}s found`} />
      )}
      {meta && meta.totalPages > 1 ? (
        <div className="border-t border-eromza-border px-5 py-3">
          <Pagination page={page} totalPages={meta.totalPages} onPageChange={setPage} />
        </div>
      ) : null}

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?._id ? `Edit ${lower}` : `Add ${lower}`}
        footer={(
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
          </>
        )}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((f) => (f.options ? (
            <Select key={f.name} label={f.label} value={form[f.name] ?? ""} onChange={setField(f.name)}>
              <option value="">Select...</option>
              {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>
          ) : (
            <Input key={f.name} label={f.label} type={f.type || "text"} value={form[f.name] ?? ""} onChange={setField(f.name)} />
          )))}
        </div>
        {formError ? <p role="alert" className="mt-3 text-xs text-eromza-error">{formError}</p> : null}
      </Modal>
    </Card>
  );
}

/* ---------------- Departments ---------------- */
function DepartmentsTab({ onChanged }) {
  return (
    <EntityTab
      noun="Department"
      load={listDepartments}
      columns={[
        { key: "code", header: "Code", render: (r) => <span className="font-medium text-eromza-text">{r.code}</span> },
        { key: "name", header: "Name" },
        { key: "status", header: "Status", render: (r) => <StatusBadge row={r} /> },
      ]}
      fields={[{ name: "code", label: "Code (e.g. CSC)" }, { name: "name", label: "Name" }]}
      blank={{ code: "", name: "" }}
      toForm={(r) => ({ code: r.code, name: r.name })}
      toBody={(f) => ({ code: f.code.trim(), name: f.name.trim() })}
      create={createDepartment}
      update={updateDepartment}
      deactivate={deactivateDepartment}
      onChanged={onChanged}
    />
  );
}

/* ---------------- Courses (programs) ---------------- */
function ProgramsTab({ departments, deptName, onChanged }) {
  const [departmentId, setDepartmentId] = useState("");
  return (
    <>
      <Select label="Filter by department" className="mb-4 max-w-xs" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
        <option value="">All departments</option>
        {departments.map((d) => <option key={d._id} value={d._id}>{d.name}</option>)}
      </Select>
      <EntityTab
        key={departmentId}
        noun="Course"
        load={listPrograms}
        filters={departmentId ? { departmentId } : {}}
        columns={[
          { key: "code", header: "Code", render: (r) => <span className="font-medium text-eromza-text">{r.code}</span> },
          { key: "name", header: "Name" },
          { key: "department", header: "Department", render: (r) => deptName[r.departmentId] ?? "-" },
          { key: "level", header: "Level" },
          { key: "durationYears", header: "Years" },
          { key: "status", header: "Status", render: (r) => <StatusBadge row={r} /> },
        ]}
        fields={[
          { name: "name", label: "Course name" },
          { name: "code", label: "Code (e.g. BDPAEN)" },
          { name: "departmentId", label: "Department", options: departments.map((d) => ({ value: d._id, label: d.name })) },
          { name: "level", label: "Level", options: LEVELS.map((l) => ({ value: l, label: l })) },
          { name: "faculty", label: "Faculty (optional)", options: FACULTIES.map((x) => ({ value: x, label: x })) },
          { name: "durationYears", label: "Duration in years (optional)", type: "number" },
        ]}
        blank={{ name: "", code: "", departmentId: "", level: "", faculty: "", durationYears: "" }}
        toForm={(r) => ({ name: r.name, code: r.code, departmentId: r.departmentId, level: r.level, faculty: r.faculty ?? "", durationYears: r.durationYears ?? "" })}
        toBody={(f) => ({
          name: f.name.trim(),
          code: f.code.trim(),
          departmentId: f.departmentId,
          level: f.level,
          ...(f.faculty ? { faculty: f.faculty } : {}),
          ...(f.durationYears !== "" ? { durationYears: Number(f.durationYears) } : {}),
        })}
        create={createProgram}
        update={updateProgram}
        deactivate={deactivateProgram}
        onChanged={onChanged}
      />
    </>
  );
}

/* ---------------- Subjects ---------------- */
const SEMESTERS = Array.from({ length: 8 }, (_, i) => i + 1);

function SubjectsTab({ programs, progName, onChanged }) {
  const [programId, setProgramId] = useState("");
  const [semester, setSemester] = useState("");
  const filters = { ...(programId ? { programId } : {}), ...(semester ? { semester } : {}) };
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-4">
        <Select label="Filter by course" className="w-72" value={programId} onChange={(e) => setProgramId(e.target.value)}>
          <option value="">All courses</option>
          {programs.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </Select>
        <Select label="Semester" className="w-40" value={semester} onChange={(e) => setSemester(e.target.value)}>
          <option value="">All</option>
          {SEMESTERS.map((n) => <option key={n} value={n}>Semester {n}</option>)}
        </Select>
      </div>
      <EntityTab
        key={`${programId}-${semester}`}
        noun="Subject"
        load={listSubjects}
        filters={filters}
        columns={[
          { key: "code", header: "Code", render: (r) => <span className="font-medium text-eromza-text">{r.code}</span> },
          { key: "name", header: "Name" },
          { key: "program", header: "Course", render: (r) => progName[r.programId] ?? "-" },
          { key: "semester", header: "Sem" },
          { key: "category", header: "Category", render: (r) => humanize(r.category) },
          { key: "credits", header: "Credits" },
          { key: "status", header: "Status", render: (r) => <StatusBadge row={r} /> },
        ]}
        fields={[
          { name: "code", label: "Subject code" },
          { name: "name", label: "Subject name" },
          { name: "programId", label: "Course", options: programs.map((p) => ({ value: p._id, label: p.name })) },
          { name: "semester", label: "Semester (1-12)", type: "number" },
          { name: "category", label: "Category", options: CATEGORIES.map((c) => ({ value: c, label: humanize(c) })) },
          { name: "credits", label: "Credits (optional)", type: "number" },
        ]}
        blank={{ code: "", name: "", programId, semester: semester || "1", category: "major", credits: "" }}
        toForm={(r) => ({ code: r.code, name: r.name, programId: r.programId, semester: String(r.semester), category: r.category, credits: r.credits ?? "" })}
        toBody={(f) => ({
          code: f.code.trim(),
          name: f.name.trim(),
          programId: f.programId,
          semester: Number(f.semester),
          category: f.category,
          ...(f.credits !== "" ? { credits: Number(f.credits) } : {}),
        })}
        create={createSubject}
        update={updateSubject}
        deactivate={deactivateSubject}
        onChanged={onChanged}
      />
    </>
  );
}

/* ---------------- Page ---------------- */
const TABS = [
  { id: "departments", label: "Departments" },
  { id: "programs", label: "Courses" },
  { id: "subjects", label: "Subjects" },
];

export default function AcademicData() {
  const [tab, setTab] = useState("departments");
  // Departments and courses are needed by the other tabs (dropdowns and name lookups), so load them once here.
  const depts = useApiData(() => listDepartments({ limit: 100 }));
  const progs = useApiData(() => listPrograms({ limit: 100 }));
  const departments = depts.data?.rows ?? [];
  const programs = progs.data?.rows ?? [];
  const deptName = Object.fromEntries(departments.map((d) => [d._id, d.name]));
  const progName = Object.fromEntries(programs.map((p) => [p._id, p.name]));
  const refresh = () => { depts.reload(); progs.reload(); };

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        eyebrow="Super Admin"
        title="Academic Data"
        description="Departments, courses and subjects used by admissions, exams and results."
      />
      <div className="flex gap-2 border-b border-eromza-border">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.id ? "border-eromza-accent text-eromza-accent" : "border-transparent text-eromza-muted hover:text-eromza-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "departments" ? <DepartmentsTab onChanged={refresh} /> : null}
      {tab === "programs" ? <ProgramsTab departments={departments} deptName={deptName} onChanged={refresh} /> : null}
      {tab === "subjects" ? <SubjectsTab programs={programs} progName={progName} onChanged={refresh} /> : null}
    </div>
  );
}
