import { useState } from "react";
import { Download, Eye, Ticket } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import ErrorState from "../../components/ui/ErrorState";
import Loader from "../../components/ui/Loader";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { useApiData } from "../../hooks/useApiData";
import {
  downloadHallTicketPdf,
  fetchHallTickets,
} from "../../services/studentApi";
import { formatDate, formatTime } from "../../utils/format";
import { formatStatus, getStatusVariant } from "../../utils/status";

function scheduleOf(ticket) {
  return Array.isArray(ticket.schedule) ? ticket.schedule : [];
}

function roomOf(ticket) {
  const scheduleRoom = scheduleOf(ticket).find((item) => item.room)?.room;
  return ticket.room || scheduleRoom || "Not set";
}

function dateRangeOf(ticket) {
  const dates = scheduleOf(ticket)
    .map((item) => item.date)
    .filter(Boolean)
    .sort((a, b) => new Date(a) - new Date(b));

  if (dates.length === 0) return "Schedule pending";
  if (dates.length === 1) return formatDate(dates[0]);
  return `${formatDate(dates[0])} to ${formatDate(dates[dates.length - 1])}`;
}

export default function HallTickets() {
  const [selected, setSelected] = useState(null);
  const [downloadError, setDownloadError] = useState("");
  const { data, loading, error, reload } = useApiData(fetchHallTickets);
  const tickets = Array.isArray(data) ? data : [];

  const issued = tickets.filter((ticket) => ticket.status === "issued").length;
  const pending = tickets.filter((ticket) => ticket.status === "pending").length;

  const handleDownload = async (ticket) => {
    setDownloadError("");
    try {
      await downloadHallTicketPdf(ticket);
    } catch (err) {
      setDownloadError(err.message);
    }
  };

  const columns = [
    {
      key: "exam",
      header: "Examination",
      render: (ticket) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {ticket.examName || "Examination"}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">
            {ticket.programName || "Programme"} - Semester {ticket.semester}
          </p>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Schedule",
      render: (ticket) => (
        <div className="min-w-0">
          <p className="text-xs text-eromza-muted">
            {scheduleOf(ticket).length} paper
            {scheduleOf(ticket).length === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">
            {dateRangeOf(ticket)}
          </p>
        </div>
      ),
    },
    {
      key: "room",
      header: "Room",
      render: (ticket) => <Badge variant="neutral">{roomOf(ticket)}</Badge>,
    },
    {
      key: "seat",
      header: "Seat",
      render: (ticket) => (
        <span className="text-xs font-semibold text-eromza-text">
          {ticket.seatNumber || "Not set"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (ticket) => (
        <Badge variant={getStatusVariant(ticket.status)}>
          {formatStatus(ticket.status)}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      cellClassName: "text-right",
      render: (ticket) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDownloadError("");
            setSelected(ticket);
          }}
        >
          <Eye size={14} />
          View
        </Button>
      ),
    },
  ];

  const scheduleColumns = [
    {
      key: "subject",
      header: "Subject",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {row.name || "Subject"}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">
            {row.code || "Code not set"}
          </p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (row) => (
        <span className="text-xs text-eromza-muted">{formatDate(row.date)}</span>
      ),
    },
    {
      key: "time",
      header: "Time",
      render: (row) => (
        <span className="text-xs text-eromza-muted">
          {formatTime(row.startTime)} to {formatTime(row.endTime)}
        </span>
      ),
    },
    {
      key: "room",
      header: "Room",
      render: (row) => <Badge variant="neutral">{row.room || "Not set"}</Badge>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Hall Tickets"
        description="View and download hall tickets for your scheduled examinations."
      />

      {loading ? (
        <Card>
          <Loader label="Loading hall tickets..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState
            title="Could not load hall tickets"
            description={error.message}
            onRetry={reload}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Total tickets"
              value={String(tickets.length)}
              tone="info"
              icon={Ticket}
            />
            <StatCard
              label="Issued"
              value={String(issued)}
              tone="success"
              icon={Ticket}
            />
            <StatCard
              label="Pending"
              value={String(pending)}
              tone="warning"
              icon={Ticket}
            />
          </div>

          <Card>
            <CardHeader
              title="Hall ticket list"
              description="Examination hall tickets linked to your student record"
            />
            <DataTable
              columns={columns}
              rows={tickets}
              getRowKey={(ticket) => ticket._id}
              emptyTitle="No hall tickets available"
              emptyDescription="Your hall ticket will appear here after the exam office issues it."
            />
          </Card>
        </>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Hall ticket"
        description={
          selected
            ? `${selected.examName || "Examination"} - Semester ${selected.semester}`
            : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button
              onClick={() => handleDownload(selected)}
              disabled={selected?.status !== "issued"}
            >
              <Download size={16} />
              Download ticket
            </Button>
          </>
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-eromza-border p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                Student
              </p>
              <p className="mt-1 text-sm font-semibold text-eromza-text">
                {selected.fullName || "Student"}
              </p>
              <p className="mt-1 text-xs text-eromza-muted">
                {selected.enrollmentNumber || "Enrollment number not set"} -{" "}
                {selected.programName || "Programme"}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-eromza-bg p-3">
                <p className="text-[11px] text-eromza-subtle">Room</p>
                <p className="mt-1 text-xs font-semibold text-eromza-text">
                  {roomOf(selected)}
                </p>
              </div>
              <div className="rounded-xl bg-eromza-bg p-3">
                <p className="text-[11px] text-eromza-subtle">Seat</p>
                <p className="mt-1 text-xs font-semibold text-eromza-text">
                  {selected.seatNumber || "Not set"}
                </p>
              </div>
            </div>

            <Badge variant={getStatusVariant(selected.status)}>
              {formatStatus(selected.status)}
            </Badge>

            {selected.blockedReason ? (
              <p className="rounded-lg bg-rose-50 p-3 text-xs text-eromza-error">
                {selected.blockedReason}
              </p>
            ) : null}

            <div className="overflow-hidden rounded-xl border border-eromza-border">
              <DataTable
                columns={scheduleColumns}
                rows={scheduleOf(selected)}
                getRowKey={(row) => String(row.subjectId)}
                emptyTitle="Schedule not available"
              />
            </div>

            {downloadError ? (
              <p className="text-xs text-eromza-error">{downloadError}</p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
