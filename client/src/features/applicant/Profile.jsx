import { useState } from "react";
import { Mail, MapPin, Pencil, Phone, UserRound } from "lucide-react";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Modal from "../../components/ui/Modal";
import PageHeader from "../../components/ui/PageHeader";
import { applicantPersonalProfile } from "../../mocks/applicantData";
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
  const [profile, setProfile] = useState(applicantPersonalProfile);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    phone: applicantPersonalProfile.phone,
    address: applicantPersonalProfile.address,
    guardianPhone: applicantPersonalProfile.guardianPhone,
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
      guardianPhone: form.guardianPhone.trim() || current.guardianPhone,
    }));
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admission portal"
        title="Profile"
        description="Manage the contact information linked to your admission account."
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
            <p className="mt-1 text-sm text-eromza-muted">{profile.email}</p>
            <p className="mt-1 text-xs text-eromza-subtle">
              Preferred contact: {profile.preferredContact}
            </p>
          </div>
        </CardBody>
      </Card>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card>
          <CardHeader
            title="Personal information"
            description="Your applicant profile details"
          />
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <Detail label="Full name" value={profile.name} />
            <Detail label="Date of birth" value={profile.dateOfBirth} />
            <Detail label="Gender" value={profile.gender} />
            <Detail label="Preferred contact" value={profile.preferredContact} />
            <Detail label="Email address" value={profile.email} />
            <Detail label="Phone number" value={profile.phone} />
            <div className="sm:col-span-2">
              <Detail label="Address" value={profile.address} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Guardian information"
            description="Emergency contact details"
          />
          <CardBody className="space-y-3">
            <Detail label="Guardian name" value={profile.guardian} />
            <Detail label="Guardian phone" value={profile.guardianPhone} />
            <div className="flex items-center gap-3 rounded-xl border border-eromza-border p-4">
              <UserRound size={16} className="text-eromza-subtle" />
              <span className="text-xs text-eromza-muted">
                Update your guardian contact if your details have changed.
              </span>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Contact channels"
          description="How the admission office can reach you"
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
            <span className="text-xs text-eromza-muted">{profile.address}</span>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Edit profile"
        description="Update your contact details. Application data remains under admission review."
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="applicant-profile-form">
              Save changes
            </Button>
          </>
        }
      >
        <form
          id="applicant-profile-form"
          className="space-y-4"
          onSubmit={handleSave}
        >
          <Input
            label="Phone number"
            value={form.phone}
            onChange={(event) =>
              setForm((current) => ({ ...current, phone: event.target.value }))
            }
            required
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(event) =>
              setForm((current) => ({ ...current, address: event.target.value }))
            }
            required
          />
          <Input
            label="Guardian phone"
            value={form.guardianPhone}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                guardianPhone: event.target.value,
              }))
            }
            required
          />
        </form>
      </Modal>
    </div>
  );
}
