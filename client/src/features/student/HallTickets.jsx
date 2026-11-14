import { useState } from "react";
import { Download, Eye, Ticket } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { studentHallTickets, studentProfile } from "../../mocks/studentData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

function downloadTicket(ticket) {
  downloadCsv(`${ticket.id.toLowerCase()}-hall-ticket.csv`, [
    ["Field", "Value"],
    ["Student", studentProfile.name],
    ["Roll number", studentProfile.rollNo],
    ["Programme", studentProfile.program],
    ["Examination", ticket.exam],
    ["Subject", ticket.subject],
    ["Date", ticket.date],
    ["Time", ticket.time],
    ["Room", ticket.room],
    ["Seat", ticket.seat],
    ["Status", ticket.status],
  ]);
}

export default function HallTickets() {
  const [selected, setSelected] = useState(null);

  const issued = studentHallTickets.filter(
    (ticket) => ticket.status === "issued",
  ).length;
  const pending = studentHallTickets.filter(
    (ticket) => ticket.status === "pending",
  ).length;

  const columns = [
    {
      key: "subject",
      header: "Examination",
      render: (ticket) => (
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-eromza-text">
            {ticket.subject}
          </p>
          <p className="mt-1 text-[11px] text-eromza-subtle">{ticket.exam}</p>
        </div>
      ),
    },
    {
      key: "date",
      header: "Date & time",
      render: (ticket) => (
        <span className="text-xs text-eromza-muted">
          {ticket.date} · {ticket.time}
        </span>
      ),
    },
    {
      key: "room",
      header: "Room",
      render: (ticket) => <Badge variant="neutral">{ticket.room}</Badge>,
    },
    {
      key: "seat",
      header: "Seat",
      render: (ticket) => (
        <span className="text-xs font-semibold text-eromza-text">
          {ticket.seat}
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
        <Button variant="ghost" size="sm" onClick={() => setSelected(ticket)}>
          <Eye size={14} />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Hall Tickets"
        description="View and download hall tickets for your scheduled examinations."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total tickets"
          value={String(studentHallTickets.length)}
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
          rows={studentHallTickets}
          emptyTitle="No hall tickets available"
        />
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Hall ticket"
        description={
          selected ? `${selected.subject} · ${selected.exam}` : undefined
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelected(null)}>
              Close
            </Button>
            <Button onClick={() => downloadTicket(selected)}>
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
                {studentProfile.name}
              </p>
              <p className="mt-1 text-xs text-eromza-muted">
                {studentProfile.rollNo} · {studentProfile.program}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-eromza-bg p-3">
                <p className="text-[11px] text-eromza-subtle">Date</p>
                <p className="mt-1 text-xs font-semibold text-eromza-text">
                  {selected.date}
                </p>
              </div>
              <div className="rounded-xl bg-eromza-bg p-3">
                <p className="text-[11px] text-eromza-subtle">Time</p>
                <p className="mt-1 text-xs font-semibold text-eromza-text">
                  {selected.time}
                </p>
              </div>
              <div className="rounded-xl bg-eromza-bg p-3">
                <p className="text-[11px] text-eromza-subtle">Room</p>
                <p className="mt-1 text-xs font-semibold text-eromza-text">
                  {selected.room}
                </p>
              </div>
              <div className="rounded-xl bg-eromza-bg p-3">
                <p className="text-[11px] text-eromza-subtle">Seat</p>
                <p className="mt-1 text-xs font-semibold text-eromza-text">
                  {selected.seat}
                </p>
              </div>
            </div>
            <Badge variant={getStatusVariant(selected.status)}>
              {formatStatus(selected.status)}
            </Badge>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
