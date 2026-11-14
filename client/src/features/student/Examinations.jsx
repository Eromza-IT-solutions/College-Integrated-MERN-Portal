import { CalendarClock, ClipboardList, FileCheck, Ticket } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Card, { CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import {
  studentExamForms,
  studentExamSchedule,
  studentHallTickets,
} from "../../mocks/studentData";
import { formatStatus, getStatusVariant } from "../../utils/status";

const scheduleColumns = [
  {
    key: "subject",
    header: "Exam",
    render: (row) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {row.subject}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">
          {row.date} · {row.time}
        </p>
      </div>
    ),
  },
  {
    key: "room",
    header: "Room",
    render: (row) => <Badge variant="neutral">{row.room}</Badge>,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Badge variant={getStatusVariant(row.status)}>
        {formatStatus(row.status)}
      </Badge>
    ),
  },
];

const formColumns = [
  {
    key: "exam",
    header: "Examination",
    render: (row) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">
          {row.exam}
        </p>
        <p className="mt-1 text-[11px] text-eromza-subtle">{row.id}</p>
      </div>
    ),
  },
  {
    key: "submitted",
    header: "Submitted",
    render: (row) => (
      <span className="text-xs text-eromza-muted">{row.submitted}</span>
    ),
  },
  {
    key: "feeStatus",
    header: "Fee",
    render: (row) => (
      <Badge variant={getStatusVariant(row.feeStatus)}>
        {formatStatus(row.feeStatus)}
      </Badge>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Badge variant={getStatusVariant(row.status)}>
        {formatStatus(row.status)}
      </Badge>
    ),
  },
];

export default function Examinations() {
  const submittedForms = studentExamForms.filter(
    (form) => form.status !== "pending",
  ).length;
  const approvedForms = studentExamForms.filter(
    (form) => form.status === "approved",
  ).length;
  const issuedTickets = studentHallTickets.filter(
    (ticket) => ticket.status === "issued",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Examinations"
        description="Review your examination schedule, forms, and hall ticket readiness."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Upcoming exams"
          value={String(studentExamSchedule.length)}
          tone="info"
          icon={CalendarClock}
        />
        <StatCard
          label="Forms submitted"
          value={`${submittedForms}/${studentExamForms.length}`}
          tone="success"
          icon={ClipboardList}
        />
        <StatCard
          label="Approved forms"
          value={String(approvedForms)}
          tone="accent"
          icon={FileCheck}
        />
        <StatCard
          label="Hall tickets issued"
          value={`${issuedTickets}/${studentHallTickets.length}`}
          tone="warning"
          icon={Ticket}
        />
      </div>

      <Card>
        <CardHeader
          title="Exam schedule"
          description="Your upcoming internal assessment examinations"
        />
        <DataTable
          columns={scheduleColumns}
          rows={studentExamSchedule}
          emptyTitle="No exams scheduled"
        />
      </Card>

      <Card>
        <CardHeader
          title="Exam forms"
          description="Submission and approval status for each examination"
        />
        <DataTable
          columns={formColumns}
          rows={studentExamForms}
          emptyTitle="No exam forms"
        />
      </Card>
    </div>
  );
}
