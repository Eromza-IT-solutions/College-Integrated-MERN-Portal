import { Download, GraduationCap, Mail, MapPin, Phone, UserRound } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import { applicantApplication } from "../../mocks/applicantData";
import { downloadCsv } from "../../utils/csv";
import { formatStatus, getStatusVariant } from "../../utils/status";

function Detail({ label, value }) {
  return (
    <div className="rounded-xl bg-eromza-bg p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-eromza-text">{value}</p>
    </div>
  );
}

export default function MyApplication() {
  const handleExport = () => {
    downloadCsv("eromza-applicant-application.csv", [
      ["Field", "Value"],
      ["Application ID", applicantApplication.applicationId],
      ["Applicant", applicantApplication.name],
      ["Email", applicantApplication.email],
      ["Phone", applicantApplication.phone],
      ["Programme", applicantApplication.program],
      ["Specialization", applicantApplication.specialization],
      ["Previous school", applicantApplication.previousSchool],
      ["Previous board", applicantApplication.previousBoard],
      ["Previous percentage", applicantApplication.previousPercentage],
      ["Status", applicantApplication.status],
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admission portal"
        title="My Application"
        description="Review the details submitted with your admission application."
        actions={
          <Button variant="secondary" onClick={handleExport}>
            <Download size={16} />
            Download application
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-eromza-sidebar text-white">
            <UserRound size={24} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-eromza-text">
                {applicantApplication.name}
              </h2>
              <Badge variant={getStatusVariant(applicantApplication.status)}>
                {formatStatus(applicantApplication.status)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-eromza-muted">
              {applicantApplication.applicationId} · Submitted{" "}
              {applicantApplication.submitted}
            </p>
          </div>
          <Badge variant="info">
            <GraduationCap size={12} />
            {applicantApplication.program}
          </Badge>
        </CardBody>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Personal details"
            description="Information provided in your application"
          />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Detail label="Full name" value={applicantApplication.name} />
            <Detail label="Date of birth" value={applicantApplication.dateOfBirth} />
            <Detail label="Gender" value={applicantApplication.gender} />
            <Detail label="Category" value={applicantApplication.category} />
            <Detail label="Email address" value={applicantApplication.email} />
            <Detail label="Phone number" value={applicantApplication.phone} />
            <div className="sm:col-span-2">
              <Detail label="Address" value={applicantApplication.address} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Academic details"
            description="Your previous education and programme choice"
          />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Detail label="Programme" value={applicantApplication.program} />
            <Detail
              label="Specialization"
              value={applicantApplication.specialization}
            />
            <Detail
              label="Previous school"
              value={applicantApplication.previousSchool}
            />
            <Detail label="Board" value={applicantApplication.previousBoard} />
            <Detail
              label="Previous percentage"
              value={applicantApplication.previousPercentage}
            />
            <Detail label="Application status" value={formatStatus(applicantApplication.status)} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Guardian and contact"
          description="Emergency and guardian contact information"
        />
        <CardBody className="grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-4">
            <UserRound size={16} className="text-eromza-subtle" />
            <div>
              <p className="text-[11px] text-eromza-subtle">Guardian</p>
              <p className="text-xs font-semibold text-eromza-text">
                {applicantApplication.guardian}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-4">
            <Phone size={16} className="text-eromza-subtle" />
            <div>
              <p className="text-[11px] text-eromza-subtle">Guardian phone</p>
              <p className="text-xs font-semibold text-eromza-text">
                {applicantApplication.guardianPhone}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-4">
            <Mail size={16} className="text-eromza-subtle" />
            <div>
              <p className="text-[11px] text-eromza-subtle">Email</p>
              <p className="text-xs font-semibold text-eromza-text">
                {applicantApplication.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-4 md:col-span-3">
            <MapPin size={16} className="text-eromza-subtle" />
            <div>
              <p className="text-[11px] text-eromza-subtle">Address</p>
              <p className="text-xs font-semibold text-eromza-text">
                {applicantApplication.address}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
