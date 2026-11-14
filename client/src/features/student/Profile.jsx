import { useState } from "react";
import { GraduationCap, Mail, MapPin, Pencil, Phone, UserRound } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import { studentProfile } from "../../mocks/studentData";
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

export default function Profile() {
  const [profile, setProfile] = useState(studentProfile);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    phone: studentProfile.phone,
    address: studentProfile.address,
  });

  const initials = profile.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  const handleSave = (event) => {
    event.preventDefault();
    setProfile((current) => ({
      ...current,
      phone: form.phone.trim() || current.phone,
      address: form.address.trim() || current.address,
    }));
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Profile"
        description="Review your personal, academic, and contact information."
        actions={
          <Button onClick={() => setModalOpen(true)}>
            <Pencil size={16} />
            Edit profile
          </Button>
        }
      />

      <Card>
        <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-eromza-sidebar text-xl font-semibold text-white">
            {initials}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight text-eromza-text">
                {profile.name}
              </h2>
              <Badge variant={getStatusVariant(profile.status)}>
                {formatStatus(profile.status)}
              </Badge>
            </div>
            <p className="mt-1 text-sm text-eromza-muted">
              {profile.rollNo} · {profile.program}
            </p>
            <p className="mt-1 text-xs text-eromza-subtle">
              Semester {profile.semester} · Division {profile.division} ·{" "}
              {profile.department}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="info">
              <GraduationCap size={12} />
              Batch {profile.admissionYear}
            </Badge>
            <Badge variant="neutral">
              <UserRound size={12} />
              {profile.gender ?? "Student"}
            </Badge>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Contact information"
            description="How the college can reach you"
          />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Detail label="Email address" value={profile.email} />
            <Detail label="Phone number" value={profile.phone} />
            <div className="sm:col-span-2">
              <Detail label="Residential address" value={profile.address} />
            </div>
            <Detail label="Guardian" value={profile.guardian} />
            <Detail label="Guardian phone" value={profile.guardianPhone} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Academic information"
            description="Your current programme and enrolment"
          />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Detail label="Programme" value={profile.program} />
            <Detail label="Department" value={profile.department} />
            <Detail label="Semester" value={profile.semester} />
            <Detail label="Division" value={profile.division} />
            <Detail label="Roll number" value={profile.rollNo} />
            <Detail label="Admission year" value={profile.admissionYear} />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Account contacts"
          description="Primary channels used by the college"
        />
        <CardBody className="grid gap-3 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-4">
            <Mail size={16} className="text-eromza-subtle" />
            <span className="text-xs text-eromza-muted">{profile.email}</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-4">
            <Phone size={16} className="text-eromza-subtle" />
            <span className="text-xs text-eromza-muted">{profile.phone}</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-4">
            <MapPin size={16} className="text-eromza-subtle" />
            <span className="text-xs text-eromza-muted">
              {profile.department} Department
            </span>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit profile"
        description="Update your contact details. Academic records are managed by the college."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="student-profile-form">
              Save changes
            </Button>
          </>
        }
      >
        <form id="student-profile-form" className="space-y-4" onSubmit={handleSave}>
          <Input
            label="Phone number"
            value={form.phone}
            onChange={(event) =>
              setForm((current) => ({ ...current, phone: event.target.value }))
            }
            required
          />
          <Input
            label="Residential address"
            value={form.address}
            onChange={(event) =>
              setForm((current) => ({ ...current, address: event.target.value }))
            }
            required
          />
        </form>
      </Modal>
    </div>
  );
}
