import { useEffect, useMemo, useState } from "react";
import { Award, Download, GraduationCap, Percent } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import Select from "../../components/ui/Select";
import StatCard from "../../components/ui/StatCard";
import { downloadResultPdf, listResults } from "../../services/marksService";

const show = (v) => (v === null || v === undefined ? "-" : v);

export default function Results() {
  const [results, setResults] = useState([]);
  const [id, setId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    listResults()
      .then((r) => { setResults(r); if (r[0]) setId(r[0]._id); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const result = useMemo(() => results.find((r) => r._id === id), [results, id]);

  const columns = [
    { key: "subject", header: "Subject", render: (l) => <span className="text-xs font-semibold text-eromza-text">{l.name} ({l.code})</span> },
    { key: "int", header: "Internal", render: (l) => <span className="text-xs text-eromza-muted">{l.absent ? "AB" : show(l.internalMarks)}/{l.maxInternal}</span> },
    { key: "ext", header: "External", render: (l) => <span className="text-xs text-eromza-muted">{l.absent ? "AB" : show(l.externalMarks)}/{l.maxExternal}</span> },
    { key: "total", header: "Total", render: (l) => <span className="text-xs text-eromza-muted">{show(l.total)}/{l.max}</span> },
    { key: "grade", header: "Grade", render: (l) => <Badge variant={l.status === "pass" ? "success" : "warning"}>{show(l.grade)}</Badge> },
    { key: "status", header: "Result", render: (l) => <span className="text-xs text-eromza-muted">{show(l.status)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Results"
        description="Published examination results with grades and SGPA."
        actions={
          <Button variant="secondary" disabled={!result} onClick={() => downloadResultPdf(result._id, result.enrollmentNumber).catch((e) => setError(e.message))}>
            <Download size={16} /> Download PDF
          </Button>
        }
      />
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {!loading && !results.length && (
        <div className="rounded-lg bg-eromza-bg p-4 text-sm text-eromza-muted">No results are published for you yet.</div>
      )}
      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="SGPA" value={String(show(result.sgpa))} tone="success" icon={Award} />
            <StatCard label="Percentage" value={`${show(result.percentage)}%`} tone="info" icon={Percent} />
            <StatCard label="Outcome" value={String(show(result.outcome))} tone="accent" icon={GraduationCap} />
            <StatCard label="Credits earned" value={`${show(result.creditsEarned)}/${show(result.creditsTotal)}`} tone="warning" icon={Award} />
          </div>
          <Card>
            <CardHeader
              title={`Semester ${result.semester} result`}
              description={`${result.fullName || ""} · ${result.enrollmentNumber || ""}`}
              action={results.length > 1 && (
                <Select aria-label="Choose result" value={id} onChange={(e) => setId(e.target.value)}>
                  {results.map((r) => <option key={r._id} value={r._id}>Semester {r.semester}</option>)}
                </Select>
              )}
            />
            <DataTable columns={columns} rows={result.lines || []} getRowKey={(l) => String(l.subjectId)} emptyTitle="No subjects" />
          </Card>
        </>
      )}
    </div>
  );
}
