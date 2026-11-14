import { useState } from "react";
import { RotateCcw, Save, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import Badge from "../../../components/ui/Badge";
import Button from "../../../components/ui/Button";
import Card, { CardBody, CardHeader } from "../../../components/ui/Card";
import Input from "../../../components/ui/Input";
import PageHeader from "../../../components/ui/PageHeader";
import Toggle from "../../../components/ui/Toggle";
import { superAdminSettings } from "../../../mocks/superAdminData";

export default function Settings() {
  const [institution, setInstitution] = useState(superAdminSettings.institution);
  const [notifications, setNotifications] = useState(
    superAdminSettings.notifications,
  );
  const [security, setSecurity] = useState(superAdminSettings.security);
  const [saved, setSaved] = useState(false);

  const updateInstitution = (field, value) => {
    setInstitution((current) => ({ ...current, [field]: value }));
    setSaved(false);
  };

  const toggleSetting = (setter, id) => {
    setter((current) =>
      current.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item,
      ),
    );
    setSaved(false);
  };

  const handleReset = () => {
    setInstitution(superAdminSettings.institution);
    setNotifications(superAdminSettings.notifications);
    setSecurity(superAdminSettings.security);
    setSaved(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform configuration"
        title="System Settings"
        description="Configure institution details, notification preferences, and security controls."
        actions={
          <>
            <Button variant="secondary" onClick={handleReset}>
              <RotateCcw size={16} />
              Reset
            </Button>
            <Button onClick={() => setSaved(true)}>
              <Save size={16} />
              Save changes
            </Button>
          </>
        }
      />

      {saved ? (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-eromza-success">
          <ShieldCheck size={16} />
          Settings saved for this demo session.
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,1fr)]">
        <Card>
          <CardHeader
            title="Institution profile"
            description="Core details shown across the platform"
            action={<Badge variant="neutral">Required</Badge>}
          />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Institution name"
              value={institution.name}
              onChange={(event) =>
                updateInstitution("name", event.target.value)
              }
              className="sm:col-span-2"
            />
            <Input
              label="Institution code"
              value={institution.code}
              onChange={(event) =>
                updateInstitution("code", event.target.value)
              }
            />
            <Input
              label="Contact email"
              type="email"
              value={institution.email}
              onChange={(event) =>
                updateInstitution("email", event.target.value)
              }
            />
            <Input
              label="Phone number"
              value={institution.phone}
              onChange={(event) =>
                updateInstitution("phone", event.target.value)
              }
            />
            <Input
              label="Address"
              value={institution.address}
              onChange={(event) =>
                updateInstitution("address", event.target.value)
              }
              className="sm:col-span-2"
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            title="Notification preferences"
            description="Choose how platform updates are delivered"
          />
          <CardBody className="space-y-3">
            {notifications.map((item) => (
              <Toggle
                key={item.id}
                id={`notification-${item.id}`}
                label={item.label}
                description={item.description}
                checked={item.enabled}
                onChange={() => toggleSetting(setNotifications, item.id)}
              />
            ))}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Security & access"
          description="Platform-wide account and audit controls"
          action={
            <span className="inline-flex items-center gap-1.5 text-[11px] text-eromza-muted">
              <SettingsIcon size={13} />
              Super Admin only
            </span>
          }
        />
        <CardBody className="grid gap-3 md:grid-cols-3">
          {security.map((item) => (
            <Toggle
              key={item.id}
              id={`security-${item.id}`}
              label={item.label}
              description={item.description}
              checked={item.enabled}
              onChange={() => toggleSetting(setSecurity, item.id)}
            />
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
