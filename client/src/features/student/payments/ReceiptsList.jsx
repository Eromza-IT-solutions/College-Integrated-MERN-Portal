import { useMemo, useState } from "react";
import { Search, Download, Printer, Receipt } from "lucide-react";
// import { Card, Pill, Stat, inr, fmt, receiptsHtml, receiptBlock, saveHtml, printHtml, usePayments } from "./PaymentsShared";
import { Card, Pill, Stat, inr, fmt, receiptsHtml, saveHtml, printHtml, usePayments } from "./PaymentsShared";

/** source: "online" (payments made on the portal) or "college" (receipts issued at the college office) */
export default function ReceiptsList({ source }) {
  const { payments, collegeReceipts, student } = usePayments();
  const all = source === "online" ? payments : collegeReceipts;

  const [q, setQ] = useState("");
  const [year, setYear] = useState("all");
  const [mode, setMode] = useState("all");

  const years = useMemo(() => [...new Set(all.map((r) => new Date(r.date).getFullYear()))].sort((a, b) => b - a), [all]);
  const modes = useMemo(() => [...new Set(all.map((r) => r.mode))], [all]);

  const list = useMemo(
    () =>
      all
        .filter((r) => (year === "all" || new Date(r.date).getFullYear() === +year) && (mode === "all" || r.mode === mode))
        .filter((r) => `${r.no} ${r.title} ${r.txn}`.toLowerCase().includes(q.trim().toLowerCase()))
        .sort((a, b) => new Date(b.date) - new Date(a.date)),
    [all, q, year, mode]
  );

  const total = list.reduce((a, r) => a + r.total, 0);
  const latest = all.length ? [...all].sort((a, b) => new Date(b.date) - new Date(a.date))[0] : null;

  const download = (r) => saveHtml(`Receipt-${r.no}.html`, receiptsHtml([r], student));
  const print = (r) => {
    if (!printHtml(receiptsHtml([r], student))) alert("Please allow pop-ups to print the receipt.");
  };

  return (
    <>
      <div className="stats">
        <Stat label={source === "online" ? "Online receipts" : "College receipts"} value={all.length} sub="Total receipts available" />
        <Stat label="Amount in this list" value={inr(total)} sub={`${list.length} receipt${list.length === 1 ? "" : "s"} shown`} tone="good" />
        <Stat label="Latest receipt" value={latest ? fmt(latest.date, { day: "numeric", month: "short" }) : "—"} sub={latest ? latest.no : "No receipts yet"} />
      </div>

      <Card
        title={source === "online" ? "Payment receipts" : "College office receipts"}
        action={list.length > 0 && (
          <button type="button" className="mini" onClick={() => saveHtml(`${source}-receipts.html`, receiptsHtml(list, student))}>
            <Download size={14} /> Download all ({list.length})
          </button>
        )}
      >
        <div className="filters">
          <label className="search">
            <Search size={16} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by receipt no., particulars or transaction…" aria-label="Search receipts" />
          </label>
          <select className="sel" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Filter by year">
            <option value="all">All years</option>
            {years.map((y) => <option key={y}>{y}</option>)}
          </select>
          <select className="sel" value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Filter by payment mode">
            <option value="all">All modes</option>
            {modes.map((m) => <option key={m}>{m}</option>)}
          </select>
        </div>

        {list.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Receipt no.</th><th>Date</th><th>Particulars</th><th>Mode</th><th className="r">Amount</th><th className="r">Download</th></tr>
              </thead>
              <tbody>
                {list.map((r) => (
                  <tr key={r.no}>
                    <td><b>{r.no}</b><small>{r.txn}</small></td>
                    <td>{fmt(r.date)}</td>
                    <td>{r.title}</td>
                    <td><Pill tone="blue">{r.mode}</Pill></td>
                    <td className="r"><b>{inr(r.total)}</b></td>
                    <td className="r">
                      <span className="btns" style={{ justifyContent: "flex-end", gap: 8, flexWrap: "nowrap" }}>
                        <button type="button" className="mini" onClick={() => download(r)} aria-label={`Download receipt ${r.no}`}><Download size={14} /> Receipt</button>
                        <button type="button" className="mini" onClick={() => print(r)} aria-label={`Print receipt ${r.no}`}><Printer size={14} /></button>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty"><Receipt size={30} style={{ opacity: 0.4 }} /><p>No receipts match your search.</p></div>
        )}
      </Card>
    </>
  );
}