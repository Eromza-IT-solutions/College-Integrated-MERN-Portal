import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, RotateCcw } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import Input from "../../components/ui/Input";
import PageHeader from "../../components/ui/PageHeader";
import { decideMarks, listMarks } from "../../services/marksService";

export default function MarksApproval() {
  const [rows, setRows] = useState([]);
  const [picked, setPicked] = useState(new Set());
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows(await listMarks({ status: "submitted" })); setPicked(new Set()); }
    catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggle = (id) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allPicked = rows.length > 0 && picked.size === rows.length;

  const decide = async (approve) => {
    setBusy(true); setError(""); setNotice("");
    try {
      await decideMarks({ ids: [...picked], approve, note: note.trim() });
      setNotice(approve ? "Marks approved." : "Marks returned to the teacher.");
      setNote("");
      await load();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  };

  const columns = [
    { key: "pick", header: <input type="checkbox" aria-label="Select all" checked={allPicked} onChange={() => setPicked(allPicked ? new Set() : new Set(rows.map((r) => r._id)))} />,
      render: (r) => <input type="checkbox" aria-label="Select row" checked={picked.has(r._id)} onChange={() => toggle(r._id)} /> },
    { key: "subject", header: "Subject", render: (r) => <span className="text-xs font-semibold text-eromza-text">{r.subjectId ? `${r.subjectId.name} (${r.subjectId.code})` : "-"}</span> },
    { key: "stu", header: "Student", render: (r) => <span className="text-xs text-eromza-muted">{r.studentId?.enrollmentNumber || "-"}</span> },
    { key: "comp", header: "Component", render: (r) => <span className="text-xs text-eromza-muted">{r.component}</span> },
    { key: "marks", header: "Marks", render: (r) => <span className="text-xs text-eromza-muted">{r.obtained}/{r.outOf}</span> },
    { key: "status", header: "Status", render: (r) => <Badge variant="warning">{r.status}</Badge> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Head of Department" title="Marks Approval" description="Review marks sent by your department's teachers." />
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {notice && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div>}
      <Card>
        <CardHeader
          title="Waiting for approval"
          description={`${picked.size} selected`}
          action={
            <div className="flex flex-wrap items-end gap-2">
              <Input label="Note (needed to return)" value={note} onChange={(e) => setNote(e.target.value)} />
              <Button onClick={() => decide(true)} disabled={busy || !picked.size}><CheckCircle2 size={16} /> Approve</Button>
              <Button variant="secondary" onClick={() => decide(false)} disabled={busy || !picked.size || !note.trim()}><RotateCcw size={16} /> Return</Button>
            </div>
          }
        />
        <DataTable columns={columns} rows={rows} loading={loading} getRowKey={(r) => r._id} emptyTitle="Nothing waiting for approval" />
      </Card>
    </div>
  );
}
