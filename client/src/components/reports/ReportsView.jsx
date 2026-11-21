import { useEffect, useMemo, useState } from "react";
import { BarChart3, Download, FileText } from "lucide-react";
import Button from "../ui/Button";
import Card, { CardHeader } from "../ui/Card";
import DataTable from "../ui/Table";
import Input from "../ui/Input";
import PageHeader from "../ui/PageHeader";
import StatCard from "../ui/StatCard";
import { downloadReport, fetchReport } from "../../services/reportsService";

const humanize = (s) => String(s).replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
const show = (v) => (v === null || v === undefined || v === "" ? "-" : typeof v === "object" ? JSON.stringify(v) : String(v));
const isPaise = (k) => /Paise$/.test(k); // the Rupees column is shown instead

/**
 * Generic screen for the 4 server reports. tabs: [{ type, label }]
 * Works for any report shape: { title, summary, rows } - columns come from the row keys.
 */
export default function ReportsView({ eyebrow, title, description, tabs }) {
  const [type, setType] = useState(tabs[0].type);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const params = useMemo(() => ({ ...(from ? { from } : {}), ...(to ? { to } : {}) }), [from, to]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    fetchReport(type, params)
      .then((r) => { if (active) setReport(r); })
      .catch((e) => { if (active) { setReport(null); setError(e.message); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type, params]);

  const rows = report?.rows || [];
  const keys = rows.length ? Object.keys(rows[0]).filter((k) => !isPaise(k)) : [];
  const columns = keys.map((k) => ({ key: k, header: humanize(k), render: (r) => <span className="text-xs text-eromza-muted">{show(r[k])}</span> }));
  const summary = Object.entries(report?.summary || {}).filter(([k]) => !isPaise(k));
  const simple = summary.filter(([, v]) => typeof v !== "object");
  const nested = summary.filter(([, v]) => typeof v === "object" && v !== null);

  const download = (format) => downloadReport(type, format, params).catch((e) => setError(e.message));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          <>
            <Button variant="secondary" onClick={() => download("csv")} disabled={!rows.length}><Download size={16} /> CSV</Button>
            <Button variant="secondary" onClick={() => download("pdf")} disabled={!rows.length}><FileText size={16} /> PDF</Button>
          </>
        }
      />
      {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map((t) => (
            <Button key={t.type} size="sm" variant={t.type === type ? "primary" : "secondary"} onClick={() => setType(t.type)}>{t.label}</Button>
          ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="From" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        <Input label="To" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
      </div>

      {simple.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {simple.map(([k, v]) => <StatCard key={k} label={humanize(k)} value={show(v)} tone="info" icon={BarChart3} />)}
        </div>
      )}
      {nested.map(([k, v]) => (
        <p key={k} className="text-xs text-eromza-muted"><b>{humanize(k)}:</b> {show(v)}</p>
      ))}

      <Card>
        <CardHeader title={report?.title || "Report"} description="Live numbers from the college database" />
        <DataTable columns={columns} rows={rows} loading={loading} getRowKey={(r) => JSON.stringify(r)} emptyTitle="No data for these filters" />
      </Card>
    </div>
  );
}
