import { CheckCircle2, Circle, Clock } from "lucide-react";
import ProgressRing from "../../components/charts/ProgressRing";
import Badge from "../../components/ui/Badge";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import { applicantProfile, applicantTimeline } from "../../mocks/applicantData";
import { formatStatus, getStatusVariant } from "../../utils/status";

const TIMELINE_ICONS = {
  completed: CheckCircle2,
  "in progress": Clock,
  pending: Circle,
};

const TIMELINE_TONES = {
  completed: "bg-emerald-50 text-eromza-success",
  "in progress": "bg-amber-50 text-eromza-warning",
  pending: "bg-slate-100 text-eromza-subtle",
};

export default function ApplicationStatus() {
  const completed = applicantTimeline.filter(
    (step) => step.status === "completed",
  ).length;
  const inProgress = applicantTimeline.filter(
    (step) => step.status === "in progress",
  ).length;
  const pending = applicantTimeline.filter(
    (step) => step.status === "pending",
  ).length;
  const progress = Math.round((completed / applicantTimeline.length) * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admission portal"
        title="Application Status"
        description="Follow each stage of your admission application from submission to decision."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current stage"
          value={applicantProfile.stage}
          tone="warning"
          icon={Clock}
        />
        <StatCard
          label="Completed steps"
          value={String(completed)}
          tone="success"
          icon={CheckCircle2}
        />
        <StatCard
          label="In progress"
          value={String(inProgress)}
          tone="info"
          icon={Clock}
        />
        <StatCard
          label="Pending steps"
          value={String(pending)}
          tone="accent"
          icon={Circle}
        />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Application journey"
            description="Your progress through the admission process"
            action={
              <Badge variant={getStatusVariant(applicantProfile.status)}>
                {formatStatus(applicantProfile.status)}
              </Badge>
            }
          />
          <CardBody className="space-y-4">
            {applicantTimeline.map((step, index) => {
              const Icon = TIMELINE_ICONS[step.status] ?? Circle;
              const isLast = index === applicantTimeline.length - 1;

              return (
                <div key={step.id} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`grid h-9 w-9 place-items-center rounded-full ${TIMELINE_TONES[step.status] ?? TIMELINE_TONES.pending}`}
                    >
                      <Icon size={16} />
                    </span>
                    {!isLast ? (
                      <span className="mt-1 h-full w-px bg-eromza-border" />
                    ) : null}
                  </div>
                  <div className="min-w-0 pb-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-eromza-text">
                        {step.label}
                      </p>
                      <Badge
                        variant={
                          step.status === "completed"
                            ? "success"
                            : step.status === "in progress"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {formatStatus(step.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-eromza-muted">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Application progress"
              description="Overall completion"
            />
            <CardBody>
              <ProgressRing
                value={progress}
                label="Complete"
                caption={`${completed} of ${applicantTimeline.length} admission stages completed.`}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Next action"
              description="What you need to do now"
            />
            <CardBody>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-eromza-warning">
                  Action required
                </p>
                <p className="mt-1 text-xs leading-5 text-eromza-muted">
                  {applicantProfile.nextStep}
                </p>
              </div>
              <div className="mt-4 rounded-xl bg-eromza-bg p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Application ID
                </p>
                <p className="mt-1 text-sm font-semibold text-eromza-text">
                  {applicantProfile.applicationId}
                </p>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
