
import { useMemo, useState } from "react";
import { useApiData } from "../../../hooks/useApiData";
import {
  fetchAcademicDepartments,
  fetchContent,
  publishContent,
  removeContent,
  saveContent,
  unpublishContent,
} from "../../../services/websiteApi";
import {
  Search,
  Plus,
  Users,
  UserCheck,
  UserX,
  GraduationCap,
  Pencil,
  Trash2,
  Eye,
  X,
  Mail,
  Phone,
  Briefcase,
  Building2,
  Filter,
  BookOpen,
} from "lucide-react";

// A faculty profile as this screen shows it, made from the stored website content item.
const toFaculty = (item) => {
  const meta = item.meta || {};
  return {
    id: item.id,
    name: item.title,
    employeeId: meta.employeeId || "",
    designation: meta.designation || "",
    department: item.category || "",
    qualification: meta.qualification || "",
    specialization: meta.specialization || "",
    experience: meta.experience || "",
    email: meta.email || "",
    phone: meta.phone || "",
    status: item.status === "published" ? "Active" : "Inactive",
    raw: item,
  };
};

const emptyForm = {
  name: "",
  employeeId: "",
  designation: "",
  department: "",
  qualification: "",
  specialization: "",
  experience: "",
  email: "",
  phone: "",
  status: "Active",
};

// Used only when the college has no departments set up yet.
const defaultDepartments = [
  "Computer Science",
  "Commerce",
  "Arts & Humanities",
];

function FacultyProfiles() {
  const { data, loading, error, reload } = useApiData(() => fetchContent("faculty"));
  const faculty = useMemo(() => (data?.items ?? []).map(toFaculty), [data]);
  const { data: academicDepartments } = useApiData(() =>
    fetchAcademicDepartments().catch(() => [])
  );
  // Departments to choose from: the college's academic departments plus any already used on a profile.
  const departments = useMemo(() => {
    const names = new Set(
      (academicDepartments ?? []).map((d) => d.name).filter(Boolean)
    );
    faculty.forEach((item) => item.department && names.add(item.department));
    if (names.size === 0) defaultDepartments.forEach((name) => names.add(name));
    return [...names].sort();
  }, [academicDepartments, faculty]);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showForm, setShowForm] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const totalFaculty = faculty.length;
  const activeFaculty = faculty.filter(
    (item) => item.status === "Active"
  ).length;
  const inactiveFaculty = faculty.filter(
    (item) => item.status === "Inactive"
  ).length;
  const departmentsCount = new Set(
    faculty.map((item) => item.department).filter(Boolean)
  ).size;

  const filteredFaculty = useMemo(() => {
    return faculty.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.employeeId.toLowerCase().includes(search.toLowerCase()) ||
        item.designation.toLowerCase().includes(search.toLowerCase());

      const matchesDepartment =
        departmentFilter === "All" ||
        item.department === departmentFilter;

      const matchesStatus =
        statusFilter === "All" || item.status === statusFilter;

      return matchesSearch && matchesDepartment && matchesStatus;
    });
  }, [faculty, search, departmentFilter, statusFilter]);

  const openAddForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingId(item.id);
    const { raw: _raw, id: _id, ...fields } = item;
    setForm({ ...emptyForm, ...fields });
    setSelectedFaculty(null);
    setShowForm(true);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return;

    const duplicateId = faculty.some(
      (item) =>
        item.employeeId.toLowerCase() ===
          form.employeeId.trim().toLowerCase() &&
        item.id !== editingId
    );

    if (duplicateId) {
      alert("This Employee ID already exists.");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      alert("Please enter a valid email address.");
      return;
    }

    if (form.phone && !/^[0-9+\-\s]{7,15}$/.test(form.phone.trim())) {
      alert("Please enter a valid phone number.");
      return;
    }

    const current = faculty.find((item) => item.id === editingId)?.raw;
    setSaving(true);
    try {
      await saveContent({
        id: editingId,
        type: "faculty",
        current,
        fields: {
          title: form.name.trim(),
          category: form.department,
          meta: {
            employeeId: form.employeeId.trim(),
            designation: form.designation.trim(),
            qualification: form.qualification.trim(),
            specialization: form.specialization.trim(),
            experience: form.experience.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
          },
        },
        want: form.status === "Active" ? "published" : "draft",
      });
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
      reload();
    }
  };

  const toggleStatus = async (id) => {
    const item = faculty.find((entry) => entry.id === id);
    if (!item) return;
    try {
      if (item.status === "Active") await unpublishContent(id);
      else await publishContent(id);
    } catch (err) {
      alert(err.message);
    } finally {
      reload();
    }
  };

  const deleteFaculty = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this faculty profile?"
    );

    if (!confirmed) return;
    const item = faculty.find((entry) => entry.id === id);
    try {
      await removeContent(item.raw);
      setSelectedFaculty(null);
    } catch (err) {
      alert(err.message);
    } finally {
      reload();
    }
  };

  const getInitials = (name) =>
    name
      .replace(/^(Dr\.|Prof\.)\s*/i, "")
      .split(" ")
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="w-full space-y-6 pb-6">

      {/* Page Heading */}
      <div className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-r from-[#142B50] via-[#263B61] to-[#A00018] p-6 text-white shadow-lg md:flex-row md:items-center">
        <div>
          <p className="mb-2 text-sm font-medium text-white/70">
            WEBSITE ADMIN / FACULTY
          </p>
          <h1 className="text-2xl font-bold md:text-3xl">
            Faculty Profiles
          </h1>
          <p className="mt-2 text-sm text-white/75">
            Manage faculty information, academic details and profiles.
          </p>
        </div>

        <button
          onClick={openAddForm}
          className="flex items-center justify-center gap-2 rounded-xl bg-[#D6B56D] px-5 py-3 text-sm font-semibold text-[#142B50] shadow-md transition hover:bg-[#E7C77E]"
        >
          <Plus size={19} />
          Add Faculty
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            title: "Total Faculty",
            value: totalFaculty,
            icon: Users,
            color: "bg-blue-50 text-blue-700",
          },
          {
            title: "Active Faculty",
            value: activeFaculty,
            icon: UserCheck,
            color: "bg-green-50 text-green-700",
          },
          {
            title: "Inactive Faculty",
            value: inactiveFaculty,
            icon: UserX,
            color: "bg-red-50 text-red-700",
          },
          {
            title: "Departments",
            value: departmentsCount,
            icon: Building2,
            color: "bg-amber-50 text-amber-700",
          },
        ].map((stat) => {
          const Icon = stat.icon;

          return (
            <div
              key={stat.title}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">
                    {stat.title}
                  </p>
                  <h2 className="mt-2 text-3xl font-bold text-[#142B50]">
                    {stat.value}
                  </h2>
                </div>

                <div className={`rounded-xl p-3 ${stat.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Filter size={19} className="text-[#A00018]" />
          <h2 className="font-semibold text-[#142B50]">
            Search & Filter Faculty
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="relative">
            <Search
              size={19}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Search name, ID or designation..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#A00018] focus:ring-2 focus:ring-red-100"
            />
          </div>

          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#A00018]"
          >
            <option value="All">All Departments</option>
            {departments.map((department) => (
              <option key={department} value={department}>
                {department}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#A00018]"
          >
            <option value="All">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Faculty Cards */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#142B50]">
              Faculty Members
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Showing {filteredFaculty.length} faculty member(s)
            </p>
          </div>
        </div>

        {filteredFaculty.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
            <Users size={40} className="mx-auto text-gray-300" />
            <h3 className="mt-3 font-semibold text-gray-700">
              {loading ? "Loading Faculty..." : error ? "Could Not Load Faculty" : "No Faculty Found"}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {error ? error.message : loading ? "Please wait." : "Try changing your search or filter."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filteredFaculty.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="h-2 bg-gradient-to-r from-[#142B50] to-[#A00018]" />

                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[#142B50] text-lg font-bold text-white">
                        {getInitials(item.name)}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-bold text-[#142B50]">
                          {item.name}
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                          ID: {item.employeeId}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
                        item.status === "Active"
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 border-t border-gray-100 pt-4">
                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Briefcase size={17} className="shrink-0 text-[#A00018]" />
                      <span>{item.designation}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <Building2 size={17} className="shrink-0 text-[#A00018]" />
                      <span>{item.department}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <GraduationCap size={17} className="shrink-0 text-[#A00018]" />
                      <span className="line-clamp-1">
                        {item.qualification}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600">
                      <BookOpen size={17} className="shrink-0 text-[#A00018]" />
                      <span>{item.experience} Experience</span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setSelectedFaculty(item)}
                      className="flex items-center justify-center gap-2 rounded-lg border border-[#142B50] px-3 py-2.5 text-xs font-semibold text-[#142B50] transition hover:bg-[#142B50] hover:text-white"
                    >
                      <Eye size={15} />
                      View
                    </button>

                    <button
                      onClick={() => openEditForm(item)}
                      className="flex items-center justify-center gap-2 rounded-lg bg-[#A00018] px-3 py-2.5 text-xs font-semibold text-white transition hover:bg-[#7F0013]"
                    >
                      <Pencil size={15} />
                      Edit
                    </button>
                  </div>

                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => toggleStatus(item.id)}
                      className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                    >
                      {item.status === "Active"
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                    <button
                      onClick={() => deleteFaculty(item.id)}
                      className="flex items-center justify-center gap-1 rounded-lg border border-red-100 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Faculty Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center justify-between bg-[#142B50] px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-bold">
                  {editingId ? "Edit Faculty Profile" : "Add New Faculty"}
                </h2>
                <p className="mt-1 text-xs text-white/70">
                  Enter faculty academic and contact details
                </p>
              </div>

              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 transition hover:bg-white/10"
              >
                <X size={22} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {[
                  { label: "Faculty Name", name: "name", placeholder: "Enter full name" },
                  { label: "Employee ID", name: "employeeId", placeholder: "e.g. FAC007" },
                  { label: "Designation", name: "designation", placeholder: "e.g. Assistant Professor" },
                  { label: "Qualification", name: "qualification", placeholder: "Enter qualification" },
                  { label: "Specialization", name: "specialization", placeholder: "Enter specialization" },
                  { label: "Experience", name: "experience", placeholder: "e.g. 5 Years" },
                  { label: "Email Address", name: "email", placeholder: "Enter email", type: "email" },
                  { label: "Phone Number", name: "phone", placeholder: "Enter phone number", type: "tel" },
                ].map((field) => (
                  <div key={field.name}>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      {field.label} *
                    </label>
                    <input
                      type={field.type || "text"}
                      name={field.name}
                      value={form[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      required
                      className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#A00018] focus:ring-2 focus:ring-red-100"
                    />
                  </div>
                ))}

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Department *
                  </label>
                  <select
                    name="department"
                    value={form.department}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                  >
                    <option value="">Select Department</option>
                    {departments.map((department) => (
                      <option key={department} value={department}>
                        {department}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Status *
                  </label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col-reverse justify-end gap-3 border-t border-gray-100 pt-5 sm:flex-row">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-gray-300 px-6 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#A00018] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#7F0013]"
                >
                  {editingId ? "Update Faculty" : "Save Faculty"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Faculty Modal */}
      {selectedFaculty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between bg-[#142B50] p-5 text-white">
              <h2 className="text-lg font-bold">Faculty Details</h2>
              <button
                onClick={() => setSelectedFaculty(null)}
                className="rounded-lg p-2 hover:bg-white/10"
              >
                <X size={21} />
              </button>
            </div>

            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-2xl bg-[#142B50] text-2xl font-bold text-white">
                  {getInitials(selectedFaculty.name)}
                </div>
                <h3 className="mt-3 text-xl font-bold text-[#142B50]">
                  {selectedFaculty.name}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedFaculty.designation}
                </p>
                <span
                  className={`mt-3 inline-block rounded-full px-4 py-1 text-xs font-semibold ${
                    selectedFaculty.status === "Active"
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {selectedFaculty.status}
                </span>
              </div>

              <div className="mt-6 space-y-4 border-t border-gray-100 pt-5 text-sm">
                {[
                  ["Employee ID", selectedFaculty.employeeId],
                  ["Department", selectedFaculty.department],
                  ["Qualification", selectedFaculty.qualification],
                  ["Specialization", selectedFaculty.specialization],
                  ["Experience", selectedFaculty.experience],
                  ["Email", selectedFaculty.email],
                  ["Phone", selectedFaculty.phone],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex flex-col justify-between gap-1 sm:flex-row"
                  >
                    <span className="font-semibold text-gray-500">
                      {label}
                    </span>
                    <span className="break-all text-gray-800 sm:text-right">
                      {value || "Not provided"}
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => openEditForm(selectedFaculty)}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#A00018] py-3 text-sm font-semibold text-white hover:bg-[#7F0013]"
              >
                <Pencil size={16} />
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default FacultyProfiles;
