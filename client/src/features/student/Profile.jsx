import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Mail,
  Phone,
  MapPin,
  Pencil,
  Check,
  X,
  FileText,
  Download,
  BadgeCheck,
  Clock3,
  UserRound,
  GraduationCap,
  Users,
} from "lucide-react";

/*
  Content area only - render it inside your student layout (next to the sidebar).

  Everything under "SAMPLE DATA" is placeholder. Pass your own `student` object
  (same shape) and handle saving with `onSave(updatedContact)` / `onPhotoChange(file)`.
*/

/* ----------------------------- SAMPLE DATA ----------------------------- */
const sampleStudent = {
  photo: "", // image URL; leave empty to show initials
  name: "Ayesha Khan",
  course: "B.Sc. Computer Science",
  semester: "Semester 5",
  rollNo: "CS2023-045",
  status: "Active",

  personal: {
    "Full name": "Ayesha Imran Khan",
    "Date of birth": "14 March 2004",
    Gender: "Female",
    "Blood group": "B+",
    Category: "Open",
    Nationality: "Indian",
  },

  academic: {
    Course: "B.Sc. Computer Science",
    Semester: "Semester 5",
    "Roll number": "CS2023-045",
    "Enrollment number": "ENR2023004521",
    "Academic year": "2026 - 2027",
    "Admission year": "2023",
    Division: "A",
  },

  guardian: {
    "Father's name": "Imran Khan",
    "Mother's name": "Shabana Khan",
    "Guardian contact": "+91 98765 43210",
  },

  contact: {
    mobile: "9876543210",
    email: "ayesha.khan@example.com",
    address: "Flat 302, Green Park Residency, Kondhwa Road",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411048",
  },

  documents: [
    { name: "10th marksheet", status: "Verified" },
    { name: "12th marksheet", status: "Verified" },
    { name: "School leaving certificate", status: "Verified" },
    { name: "Aadhaar card", status: "Pending" },
    { name: "Passport size photo", status: "Verified" },
  ],
};

/* ------------------------------ HELPERS -------------------------------- */
const initialsOf = (name) =>
  name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

function validate(c) {
  const e = {};
  if (!/^[6-9]\d{9}$/.test(c.mobile.trim())) e.mobile = "Enter a valid 10-digit mobile number.";
  if (!/^\S+@\S+\.\S+$/.test(c.email.trim())) e.email = "Enter a valid email address.";
  if (!c.address.trim()) e.address = "Address is required.";
  if (!c.city.trim()) e.city = "City is required.";
  if (!c.state.trim()) e.state = "State is required.";
  if (!/^\d{6}$/.test(c.pincode.trim())) e.pincode = "Pincode must be 6 digits.";
  return e;
}

/* ------------------------------ COMPONENT ------------------------------- */
export default function StudentProfile({
  student = sampleStudent,
  onSave = () => {}, // receives the updated contact object
  onPhotoChange = () => {}, // receives the chosen File
  onDownloadDocument = () => {}, // receives the document name
}) {
  const [contact, setContact] = useState(student.contact);
  const [draft, setDraft] = useState(student.contact);
  const [errors, setErrors] = useState({});
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [photo, setPhoto] = useState(student.photo);
  const fileRef = useRef(null);

  // Hide the "saved" message after a few seconds
  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 3500);
    return () => clearTimeout(t);
  }, [saved]);

  // Release the temporary preview URL when it changes or the page unmounts
  useEffect(() => {
    return () => {
      if (photo && photo.startsWith("blob:")) URL.revokeObjectURL(photo);
    };
  }, [photo]);

  const startEdit = () => {
    setDraft(contact);
    setErrors({});
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setErrors({});
  };

  const saveEdit = () => {
    const e = validate(draft);
    setErrors(e);
    if (Object.keys(e).length) return;
    const clean = Object.fromEntries(Object.entries(draft).map(([k, v]) => [k, v.trim()]));
    setContact(clean);
    setEditing(false);
    setSaved(true);
    onSave(clean);
  };

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      alert("Please choose an image smaller than 2 MB.");
      return;
    }
    setPhoto(URL.createObjectURL(file));
    onPhotoChange(file);
  };

  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));

  return (
    <div
      className="min-h-screen bg-slate-50 p-5 text-slate-800 md:p-8"
      style={{ fontFamily: "'Poppins', sans-serif" }}
    >
      {/* ---------------------------- Profile banner ---------------------------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#16285a] to-[#0b1536] px-6 py-8 text-white shadow-lg md:px-9">
        <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full border-[28px] border-[#f5b800]/15" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-52 w-52 rounded-full border-[20px] border-white/5" />

        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div
              className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[#c9971c] bg-white text-4xl font-bold text-[#16285a]"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {photo ? (
                <img src={photo} alt={`${student.name}'s photo`} className="h-full w-full object-cover" />
              ) : (
                initialsOf(student.name)
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              aria-label="Change profile photo"
              className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#8b0f1f] text-white transition-colors hover:bg-[#a31326] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f5b800]"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              className="hidden"
            />
          </div>

          {/* Name + badges */}
          <div className="min-w-0">
            <h2
              className="text-[30px] font-bold leading-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {student.name}
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              {student.course} · {student.semester}
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-medium">
                Roll no. {student.rollNo}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-[#f5b800] px-3.5 py-1.5 text-xs font-semibold text-[#16285a]">
                <BadgeCheck size={14} />
                {student.status}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------ Main grid ------------------------------ */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* ---------------- Left column ---------------- */}
        <div className="space-y-6 xl:col-span-2">
          {/* Personal information */}
          <Card title="Personal information" icon={UserRound}>
            <FieldGrid data={student.personal} />
          </Card>

          {/* Contact & address (editable) */}
          <Card
            title="Contact and address"
            icon={MapPin}
            action={
              !editing && (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-[#16285a] transition-colors hover:bg-slate-50"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              )
            }
          >
            {saved && (
              <p
                role="status"
                className="mb-4 flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800"
              >
                <Check size={16} />
                Contact details saved.
              </p>
            )}

            {!editing ? (
              <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
                <Field label="Mobile number" value={`+91 ${contact.mobile}`} icon={Phone} />
                <Field label="Email address" value={contact.email} icon={Mail} />
                <div className="sm:col-span-2">
                  <Field
                    label="Address"
                    value={`${contact.address}, ${contact.city}, ${contact.state} - ${contact.pincode}`}
                    icon={MapPin}
                  />
                </div>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEdit();
                }}
                noValidate
              >
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <Input label="Mobile number" value={draft.mobile} onChange={set("mobile")} error={errors.mobile} inputMode="numeric" maxLength={10} />
                  <Input label="Email address" type="email" value={draft.email} onChange={set("email")} error={errors.email} />
                  <div className="sm:col-span-2">
                    <Input label="Address" value={draft.address} onChange={set("address")} error={errors.address} />
                  </div>
                  <Input label="City" value={draft.city} onChange={set("city")} error={errors.city} />
                  <Input label="State" value={draft.state} onChange={set("state")} error={errors.state} />
                  <Input label="Pincode" value={draft.pincode} onChange={set("pincode")} error={errors.pincode} inputMode="numeric" maxLength={6} />
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-[#16285a] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1d3375]"
                  >
                    <Check size={16} />
                    Save changes
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-slate-50"
                  >
                    <X size={16} />
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <p className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500">
              To change your name, date of birth or other details, contact the college office.
            </p>
          </Card>

          {/* Guardian */}
          <Card title="Guardian details" icon={Users}>
            <FieldGrid data={student.guardian} />
          </Card>
        </div>

        {/* ---------------- Right column ---------------- */}
        <div className="space-y-6">
          <Card title="Academic details" icon={GraduationCap}>
            <dl className="divide-y divide-slate-100">
              {Object.entries(student.academic).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <dt className="text-sm text-slate-500">{label}</dt>
                  <dd className="text-right text-sm font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Documents" icon={FileText}>
            <ul className="space-y-3">
              {student.documents.map((d) => {
                const verified = d.status === "Verified";
                return (
                  <li
                    key={d.name}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 p-3.5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#16285a]/10 text-[#16285a]">
                      <FileText size={17} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.name}</p>
                      <p
                        className={`mt-0.5 flex items-center gap-1 text-xs font-medium ${
                          verified ? "text-emerald-700" : "text-[#8b0f1f]"
                        }`}
                      >
                        {verified ? <BadgeCheck size={13} /> : <Clock3 size={13} />}
                        {d.status}
                      </p>
                    </div>
                    <button
                      onClick={() => onDownloadDocument(d.name)}
                      aria-label={`Download ${d.name}`}
                      className="rounded-lg p-2 text-[#16285a] transition-colors hover:bg-slate-100"
                    >
                      <Download size={17} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Small pieces ----------------------------- */
function Card({ title, icon: Icon, action, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3
          className="flex items-center gap-2.5 text-lg font-bold text-[#16285a]"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {Icon && <Icon size={20} strokeWidth={1.8} className="text-[#8b0f1f]" />}
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({ label, value, icon: Icon }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 flex items-start gap-2 text-sm font-medium">
        {Icon && <Icon size={16} className="mt-0.5 shrink-0 text-[#16285a]" />}
        <span className="break-words">{value}</span>
      </p>
    </div>
  );
}

function FieldGrid({ data }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
      {Object.entries(data).map(([label, value]) => (
        <Field key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function Input({ label, error, ...props }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        {...props}
        aria-invalid={!!error}
        className={`mt-1.5 w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition-colors focus:border-[#16285a] focus:ring-2 focus:ring-[#16285a]/20 ${
          error ? "border-[#8b0f1f]" : "border-slate-300"
        }`}
      />
      {error && <span className="mt-1 block text-xs text-[#8b0f1f]">{error}</span>}
    </label>
  );
}