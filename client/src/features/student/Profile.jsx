import { useState } from "react";
import {
  GraduationCap,
  Mail,
  MapPin,
  Pencil,
  Phone,
} from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import ErrorState from "../../components/ui/ErrorState";
import Input from "../../components/ui/Input";
import Loader from "../../components/ui/Loader";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import { useAuth } from "../../hooks/useAuth";
import { useApiData } from "../../hooks/useApiData";
import {
  fetchStudentOverview,
  updateStudentMobile,
} from "../../services/studentApi";
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
  const { user: authUser } = useAuth();
  const { data, loading, error, reload } = useApiData(fetchStudentOverview);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ mobile: "" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const student = data?.student;
  const program = data?.program;
  const department = data?.department;
  const user = data?.user;
  const admissionYear = data?.admissionYear;

  const name = user?.fullName || authUser?.name || "Student";
  const email = user?.email || authUser?.email || "Not set";
  const phone = user?.mobile || "Not provided";
  const aadhaar = user?.aadhaarLast4
    ? `XXXX XXXX ${user.aadhaarLast4}`
    : "Not set";
  const status = student?.status || authUser?.status || "active";
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2);

  const openEditor = () => {
    setForm({ mobile: user?.mobile || "" });
    setSaveError("");
    setModalOpen(true);
  };

  const handleSave = async (event) => {
    event.preventDefault();
    const mobile = form.mobile.trim();
    if (!/^\d{10}$/.test(mobile)) {
      setSaveError("Enter a 10-digit mobile number.");
      return;
    }

    setSaving(true);
    setSaveError("");
    try {
      await updateStudentMobile(student._id, mobile);
      setModalOpen(false);
      reload();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Student workspace"
        title="Profile"
        description="Review your personal, academic, and contact information."
        actions={
          <Button onClick={openEditor} disabled={!student}>
            <Pencil size={16} />
            Edit profile
          </Button>
        }
      />

      {loading ? (
        <Card>
          <Loader label="Loading profile..." />
        </Card>
      ) : error ? (
        <Card>
          <ErrorState
            title="Could not load profile"
            description={error.message}
            onRetry={reload}
          />
        </Card>
      ) : (
        <>
          <Card>
            <CardBody className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-eromza-sidebar text-xl font-semibold text-white">
                {initials}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight text-eromza-text">
                    {name}
                  </h2>
                  <Badge variant={getStatusVariant(status)}>
                    {formatStatus(status)}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-eromza-muted">
                  {student?.enrollmentNumber || "Enrollment number not set"} -{" "}
                  {program?.name || "Programme not set"}
                </p>
                <p className="mt-1 text-xs text-eromza-subtle">
                  Semester {student?.currentSemester ?? "Not set"} - Division{" "}
                  {student?.division || "Not set"} -{" "}
                  {department?.name || "Department not set"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="info">
                  <GraduationCap size={12} />
                  Batch {admissionYear?.label || "Not set"}
                </Badge>
                <Badge variant="neutral">{program?.level || "Student"}</Badge>
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
                <Detail label="Email address" value={email} />
                <Detail label="Phone number" value={phone} />
                <Detail label="Aadhaar number" value={aadhaar} />
                <Detail
                  label="Admission year"
                  value={admissionYear?.label || "Not set"}
                />
              </CardBody>
            </Card>

            <Card>
              <CardHeader
                title="Academic information"
                description="Your current programme and enrolment"
              />
              <CardBody className="grid gap-3 sm:grid-cols-2">
                <Detail label="Programme" value={program?.name || "Not set"} />
                <Detail
                  label="Department"
                  value={department?.name || "Not set"}
                />
                <Detail
                  label="Semester"
                  value={String(student?.currentSemester ?? "Not set")}
                />
                <Detail label="Division" value={student?.division || "Not set"} />
                <Detail
                  label="Roll number"
                  value={student?.enrollmentNumber || "Not set"}
                />
                <Detail
                  label="Year of study"
                  value={String(student?.yearOfStudy ?? "Not set")}
                />
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
                <span className="text-xs text-eromza-muted">{email}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-4">
                <Phone size={16} className="text-eromza-subtle" />
                <span className="text-xs text-eromza-muted">{phone}</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-4">
                <MapPin size={16} className="text-eromza-subtle" />
                <span className="text-xs text-eromza-muted">
                  {department?.name || "Department not set"}
                </span>
              </div>
            </CardBody>
          </Card>
        </>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit profile"
        description="Update your mobile number. Academic records are managed by the college."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="student-profile-form"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </>
        }
      >
        <form
          id="student-profile-form"
          className="space-y-4"
          onSubmit={handleSave}
        >
          <Input
            label="Mobile number"
            inputMode="numeric"
            maxLength={10}
            value={form.mobile}
            onChange={(event) =>
              setForm({ mobile: event.target.value.replace(/\D/g, "") })
            }
            required
          />
          {saveError ? (
            <p className="text-xs text-eromza-error">{saveError}</p>
          ) : null}
        </form>
      </Modal>
    </div>
  );
}
