import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarCheck, CheckCircle2, Download } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { downloadCsv } from "../../utils/csv";
import { getAttendanceSummary } from "../../services/academicsService";

const REQUIRED = 75; // minimum attendance percentage

export default function Attendance() {
  const [data, setData] = useState({ subjects: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAttendanceSummary()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => data.subjects.map((s) => ({
    id: String(s.subjectId),
    subject: s.subject ? `${s.subject.name} (${s.subject.code})` : "Subject",
    held: s.held, present: s.present, leave: s.leave, percentage: s.percentage,
  })), [data]);

  const held = rows.reduce((n, r) => n + r.held, 0);
  const present = rows.reduce((n, r) => n + r.present, 0);
  const overall = held ? Math.round((present * 1000) / held) / 10 : 0;
  const low = rows.filter((r) => r.percentage < REQUIRED).length;

  const columns = [
    { key: "subject", header: "Subject", render: (r) => <span className="text-xs font-semibold text-eromza-text">{r.subject}</span> },
    { key: "held", header: "Lectures held", render: (r) => <span className="text-xs text-eromza-muted">{r.held}</span> },
    { key: "present", header: "Present", render: (r) => <span className="text-xs text-eromza-muted">{r.present}</span> },
    { key: "leave", header: "Leave", render: (r) => <span className="text-xs text-eromza-muted">{r.leave}</span> },
    { key: "pct", header: "Attendance", render: (r) => <Badge variant={r.percentage >= REQUIRED ? "success" : "warning"}>{r.percentage}%</Badge> },
  ];

  const handleExport = () => {
    downloadCsv("eromza-student-attendance.csv", [
      ["Subject", "Held", "Present", "Leave", "Percentage"],
      ...rows.map((r) => [r.subject, r.held, r.present, r.leave, r.percentage]),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Attendance"
        description={`Subject-wise attendance. The minimum required is ${REQUIRED}%.`}
        actions={<Button variant="secondary" onClick={handleExport} disabled={!rows.length}><Download size={16} /> Export attendance</Button>}
      />
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Overall attendance" value={`${overall}%`} tone="success" icon={CalendarCheck} />
        <StatCard label="Lectures held" value={String(held)} tone="info" icon={CalendarCheck} />
        <StatCard label="Lectures attended" value={String(present)} tone="accent" icon={CheckCircle2} />
        <StatCard label={`Subjects below ${REQUIRED}%`} value={String(low)} tone="warning" icon={AlertTriangle} />
      </div>
      <Card>
        <CardHeader title="Subject-wise attendance" description="Counted from the registers your teachers submit" />
        <DataTable columns={columns} rows={rows} loading={loading} getRowKey={(r) => r.id} emptyTitle="No attendance recorded yet" emptyDescription="Attendance appears after your teachers record lectures." />
      </Card>
    </div>
  );
}
