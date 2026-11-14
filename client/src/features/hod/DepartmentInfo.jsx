import { Link } from "react-router-dom";
import {
  Building2,
  Download,
  GraduationCap,
  Mail,
  MapPin,
  Phone,
  Users,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import PageHeader from "../../components/ui/PageHeader";
import StatCard from "../../components/ui/StatCard";
import {
  hodDepartment,
  hodKpis,
  hodTeachers,
} from "../../mocks/hodData";
import { downloadCsv } from "../../utils/csv";

export default function DepartmentInfo() {
  const totalStudents = hodDepartment.programs.reduce(
    (sum, program) => sum + program.students,
    0,
  );

  const handleExport = () => {
    downloadCsv("eromza-department-profile.csv", [
      ["Field", "Value"],
      ["Department", hodDepartment.name],
      ["Code", hodDepartment.code],
      ["HOD", hodDepartment.hod],
      ["Email", hodDepartment.email],
      ["Phone", hodDepartment.phone],
      ["Location", hodDepartment.location],
      ["Programmes", hodDepartment.programs.length],
      ["Students", totalStudents],
      ["Faculty", hodTeachers.length],
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Department"
        title="Department Info"
        description="Review department details, programmes, faculty strength, and student population."
        actions={
          <>
            <Button variant="secondary" onClick={handleExport}>
              <Download size={16} />
              Download profile
            </Button>
            <Button as={Link} to="/hod/teachers">
              <Users size={16} />
              Manage teachers
            </Button>
          </>
        }
      />

      <Card>
        <CardBody className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.7fr)]">
          <div>
            <div className="flex items-start gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-rose-50 text-eromza-accent">
                <Building2 size={22} />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight text-eromza-text">
                    {hodDepartment.name}
                  </h2>
                  <Badge variant="accent">{hodDepartment.code}</Badge>
                </div>
                <p className="mt-2 text-sm leading-6 text-eromza-muted">
                  {hodDepartment.description}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-eromza-bg p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Head of Department
                </p>
                <p className="mt-1 text-sm font-semibold text-eromza-text">
                  {hodDepartment.hod}
                </p>
              </div>
              <div className="rounded-xl bg-eromza-bg p-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-eromza-subtle">
                  Established
                </p>
                <p className="mt-1 text-sm font-semibold text-eromza-text">
                  {hodDepartment.established}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-3">
              <Mail size={16} className="shrink-0 text-eromza-subtle" />
              <span className="text-xs text-eromza-muted">
                {hodDepartment.email}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-3">
              <Phone size={16} className="shrink-0 text-eromza-subtle" />
              <span className="text-xs text-eromza-muted">
                {hodDepartment.phone}
              </span>
            </div>
            <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-3">
              <MapPin size={16} className="shrink-0 text-eromza-subtle" />
              <span className="text-xs text-eromza-muted">
                {hodDepartment.location}
              </span>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {hodKpis.map((kpi) => (
          <StatCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.id === "students" ? totalStudents.toString() : kpi.value}
            change={kpi.change}
            changeLabel="this semester"
            tone={kpi.tone}
          />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Programmes offered"
            description="Undergraduate and postgraduate programmes"
            action={<Badge variant="neutral">{hodDepartment.programs.length}</Badge>}
          />
          <CardBody className="space-y-3">
            {hodDepartment.programs.map((program) => (
              <div
                key={program.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-eromza-border p-4"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-eromza-text">
                    {program.name}
                  </p>
                  <p className="mt-1 text-[11px] text-eromza-subtle">
                    {program.level} · {program.duration}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="info">{program.students} students</Badge>
                  <GraduationCap size={16} className="text-eromza-subtle" />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Faculty overview"
            description="Current department faculty"
            action={
              <Button
                as={Link}
                to="/hod/teachers"
                variant="ghost"
                size="sm"
              >
                View all
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {hodTeachers.slice(0, 4).map((teacher) => (
              <div
                key={teacher.id}
                className="rounded-xl border border-eromza-border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-eromza-text">
                      {teacher.name}
                    </p>
                    <p className="mt-1 text-[11px] text-eromza-subtle">
                      {teacher.designation}
                    </p>
                  </div>
                  <Badge variant="neutral">{teacher.classes} classes</Badge>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
