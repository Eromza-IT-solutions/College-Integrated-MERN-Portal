import { useMemo, useState } from "react";
import { CalendarClock, ClipboardList, FileCheck, Ticket } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardHeader } from "../../components/ui/Card";
import DataTable from "../../components/ui/Table";
import ErrorState from "../../components/ui/ErrorState";
import Loader from "../../components/ui/Loader";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { useApiData } from "../../hooks/useApiData";
import ExamFormModal from "./ExamFormModal";
import {
  fetchAvailableExams,
  fetchExamEligibility,
  fetchExamForms,
  fetchHallTickets,
  fetchStudentOverview,
} from "../../services/studentApi";
import { formatDate, formatPaise, formatTime } from "../../utils/format";
import { formatStatus, getStatusVariant } from "../../utils/status";

function loadExaminations() {
  return Promise.all([
    fetchStudentOverview(),
    fetchAvailableExams(),
    fetchExamForms(),
    fetchHallTickets(),
    fetchExamEligibility(),
  ]).then(([overview, available, forms, tickets, eligibility]) => ({
    overview,
    available,
    forms,
    tickets,
    eligibility,
  }));
}

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
          {row.exam} - {row.date} - {row.time}
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

const eligibilityColumns = [
  {
    key: "exam",
    header: "Examination",
    render: (row) => (
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-eromza-text">{row.exam}</p>
        <p className="mt-1 text-[11px] text-eromza-subtle">Form: {row.window}</p>
      </div>
    ),
  },
  {
    key: "eligible",
    header: "Eligibility",
    render: (row) => (
      <Badge variant={row.eligible ? "success" : "warning"}>
        {row.eligible ? "Eligible" : "Not eligible"}
      </Badge>
    ),
  },
  {
    key: "reason",
    header: "Details",
    render: (row) => <span className="text-xs text-eromza-muted">{row.reason}</span>,
  },
  {
    key: "form",
    header: "Your form",
    render: (row) =>
      row.formStatus ? (
        <Badge variant={getStatusVariant(row.formStatus)}>{formatStatus(row.formStatus)}</Badge>
      ) : (
        <span className="text-xs text-eromza-muted">Not started</span>
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
    key: "fee",
    header: "Fee",
    render: (row) => (
      <div className="flex flex-col gap-1">
        <span className="text-xs text-eromza-muted">{row.fee}</span>
        <Badge variant={getStatusVariant(row.feeStatus)}>
          {formatStatus(row.feeStatus)}
        </Badge>
      </div>
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
  const { data, loading, error, reload } = useApiData(loadExaminations);
  const [activeExam, setActiveExam] = useState(null); // the exam whose form is open in the popup

  const scheduleRows = useMemo(() => {
    const subjectOf = new Map(
      (data?.overview?.enrollments ?? []).map((enrollment) => [
        String(enrollment.subjectId?._id),
        enrollment.subjectId,
      ]),
    );

    return (data?.available ?? [])
      .flatMap((exam) =>
        (exam.schedule ?? []).map((item) => {
          const subject = subjectOf.get(String(item.subjectId));
          return {
            id: `${exam._id}-${item.subjectId}`,
            exam: exam.name,
            subject: subject?.name || "Subject",
            code: subject?.code || "",
            dateValue: item.date,
            date: formatDate(item.date),
            time: `${formatTime(item.startTime)} - ${formatTime(item.endTime)}`,
            room: item.room || "Not set",
            status: exam.status,
          };
        }),
      )
      .sort((a, b) => new Date(a.dateValue) - new Date(b.dateValue));
  }, [data]);

  const eligibilityRows = useMemo(
    () =>
      (data?.eligibility?.exams ?? []).map((exam) => ({
        id: exam._id,
        exam: exam.name,
        window: `${formatDate(exam.formOpensAt)} to ${formatDate(exam.formClosesAt)}`,
        eligible: exam.eligible,
        reason: exam.eligible
          ? "You can fill the exam form."
          : exam.reasons.map((reason) => reason.message).join(" "),
        formStatus: exam.form?.status ?? null,
        raw: exam,
      })),
    [data],
  );

  const actionColumn = {
    key: "action",
    header: "Action",
    render: (row) => {
      if (!row.eligible && !row.formStatus) {
        return <span className="text-xs text-eromza-muted">-</span>;
      }
      const label = !row.formStatus
        ? "Start form"
        : row.formStatus === "draft" || row.formStatus === "pendingPayment"
          ? "Continue form"
          : "View form";
      return (
        <Button size="sm" variant="secondary" onClick={() => setActiveExam(row.raw)}>
          {label}
        </Button>
      );
    },
  };

  const formRows = useMemo(() => {
    const examOf = new Map(
      (data?.available ?? []).map((exam) => [String(exam._id), exam.name]),
    );
    for (const ticket of data?.tickets ?? []) {
      if (!examOf.has(String(ticket.examId))) {
        examOf.set(String(ticket.examId), ticket.examName);
      }
    }

    return (data?.forms ?? []).map((form) => {
      const feeStatus =
        form.status === "draft"
          ? "not started"
          : form.status === "pendingPayment"
            ? "unpaid"
            : "paid";
      return {
        id: form._id,
        exam: examOf.get(String(form.examId)) || "Examination",
        submitted: formatDate(form.submittedAt, "Not submitted"),
        fee: formatPaise(form.feeAmountPaise, "Not set"),
        feeStatus,
        status: form.status,
      };
    });
  }, [data]);

  const submittedForms = formRows.filter(
    (form) => form.status !== "draft",
  ).length;
  const approvedForms = formRows.filter(
    (form) => form.status === "approved",
  ).length;
  const issuedTickets = (data?.tickets ?? []).filter(
    (ticket) => ticket.status === "issued",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Examinations"
        description="Review your examination schedule, forms, and hall ticket readiness."
      />

      {loading ? (
        <Card>
          <Loader label="Loading examinations..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState
            title="Could not load examinations"
            description={error.message}
            onRetry={reload}
          />
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Upcoming exams"
              value={String(scheduleRows.length)}
              tone="info"
              icon={CalendarClock}
            />
            <StatCard
              label="Forms submitted"
              value={`${submittedForms}/${formRows.length}`}
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
              value={`${issuedTickets}/${(data?.tickets ?? []).length}`}
              tone="warning"
              icon={Ticket}
            />
          </div>

          <Card>
            <CardHeader
              title="Exam eligibility"
              description="Whether you can fill the exam form for each examination in your class"
            />
            <DataTable
              columns={[...eligibilityColumns, actionColumn]}
              rows={eligibilityRows}
              getRowKey={(row) => row.id}
              emptyTitle="No examinations yet"
              emptyDescription="Examinations for your class will appear here once the exam office publishes them."
            />
          </Card>

          <Card>
            <CardHeader
              title="Exam schedule"
              description="Scheduled papers for the open examinations in your class"
            />
            <DataTable
              columns={scheduleColumns}
              rows={scheduleRows}
              getRowKey={(row) => row.id}
              emptyTitle="No exams scheduled"
              emptyDescription="The examination schedule will appear here once the exam office publishes it."
            />
          </Card>

          <Card>
            <CardHeader
              title="Exam forms"
              description="Submission and approval status for each examination"
            />
            <DataTable
              columns={formColumns}
              rows={formRows}
              getRowKey={(row) => row.id}
              emptyTitle="No exam forms"
              emptyDescription="Start an exam form from an open examination to see it here."
            />
          </Card>
        </>
      )}
      <ExamFormModal
        exam={activeExam}
        onClose={() => setActiveExam(null)}
        onChanged={reload}
      />
    </div>
  );
}
