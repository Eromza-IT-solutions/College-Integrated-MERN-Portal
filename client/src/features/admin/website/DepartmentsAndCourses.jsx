
import { useState } from "react";
import {
  GraduationCap,
  BookOpen,
  Building2,
  Users,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  Save,
  ArrowUpRight,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Layers,
  Filter,
  Eye,
} from "lucide-react";

function DepartmentsAndCourses() {
  // Demo records only. Replace with approved college data/API records.
  const [departments, setDepartments] = useState([
    {
      id: 1,
      name: "Computer Science",
      code: "CS",
      description: "Computer and information technology programs.",
      status: "Active",
      courses: [
        {
          id: 101,
          name: "Bachelor of Computer Applications",
          code: "BCA",
          level: "Undergraduate",
          duration: "3 Years",
          status: "Active",
        },
        {
          id: 102,
          name: "B.Sc. Computer Science",
          code: "BSC-CS",
          level: "Undergraduate",
          duration: "3 Years",
          status: "Active",
        },
      ],
    },
    {
      id: 2,
      name: "Commerce",
      code: "COM",
      description: "Commerce, finance and business-related programs.",
      status: "Active",
      courses: [
        {
          id: 201,
          name: "Bachelor of Commerce",
          code: "BCOM",
          level: "Undergraduate",
          duration: "3 Years",
          status: "Active",
        },
      ],
    },
    {
      id: 3,
      name: "Arts and Humanities",
      code: "ART",
      description: "Arts, humanities and social science programs.",
      status: "Active",
      courses: [
        {
          id: 301,
          name: "Bachelor of Arts",
          code: "BA",
          level: "Undergraduate",
          duration: "3 Years",
          status: "Active",
        },
      ],
    },
  ]);

  const [activeTab, setActiveTab] = useState("departments");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");

  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);

  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [editingCourseId, setEditingCourseId] = useState(null);
  const [selectedCourseDepartmentId, setSelectedCourseDepartmentId] =
    useState(null);

  const [previewDepartment, setPreviewDepartment] = useState(null);

  const [departmentForm, setDepartmentForm] = useState({
    name: "",
    code: "",
    description: "",
    status: "Active",
  });

  const [courseForm, setCourseForm] = useState({
    name: "",
    code: "",
    level: "Undergraduate",
    duration: "3 Years",
    status: "Active",
    departmentId: "",
  });

  // Statistics
  const totalDepartments = departments.length;

  const totalCourses = departments.reduce(
    (total, department) => total + department.courses.length,
    0
  );

  const activeDepartments = departments.filter(
    (department) => department.status === "Active"
  ).length;

  const activeCourses = departments.reduce(
    (total, department) =>
      total +
      department.courses.filter((course) => course.status === "Active").length,
    0
  );

  // Department Search and Filter
  const filteredDepartments = departments.filter((department) => {
    const matchesSearch =
      department.name.toLowerCase().includes(search.toLowerCase()) ||
      department.code.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === "All" || department.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Course Search and Filter
  const filteredCourses = departments.flatMap((department) =>
    department.courses
      .filter((course) => {
        const matchesSearch =
          course.name.toLowerCase().includes(search.toLowerCase()) ||
          course.code.toLowerCase().includes(search.toLowerCase()) ||
          department.name.toLowerCase().includes(search.toLowerCase());

        const matchesStatus =
          statusFilter === "All" || course.status === statusFilter;

        const matchesDepartment =
          selectedDepartment === "All" ||
          department.id === Number(selectedDepartment);

        return matchesSearch && matchesStatus && matchesDepartment;
      })
      .map((course) => ({
        ...course,
        departmentName: department.name,
        departmentId: department.id,
      }))
  );

  // Department Modal
  const openAddDepartment = () => {
    setEditingDepartmentId(null);

    setDepartmentForm({
      name: "",
      code: "",
      description: "",
      status: "Active",
    });

    setShowDepartmentModal(true);
  };

  const openEditDepartment = (department) => {
    setEditingDepartmentId(department.id);

    setDepartmentForm({
      name: department.name,
      code: department.code,
      description: department.description,
      status: department.status,
    });

    setShowDepartmentModal(true);
  };

  const saveDepartment = (e) => {
    e.preventDefault();

    const normalizedCode = departmentForm.code.trim().toUpperCase();

    const duplicate = departments.some(
      (department) =>
        department.code.toLowerCase() === normalizedCode.toLowerCase() &&
        department.id !== editingDepartmentId
    );

    if (duplicate) {
      alert("This department code already exists.");
      return;
    }

    if (editingDepartmentId) {
      setDepartments((prev) =>
        prev.map((department) =>
          department.id === editingDepartmentId
            ? { ...department, ...departmentForm, code: normalizedCode }
            : department
        )
      );
    } else {
      setDepartments((prev) => [
        ...prev,
        {
          id: Date.now(),
          ...departmentForm,
          code: normalizedCode,
          courses: [],
        },
      ]);
    }

    setShowDepartmentModal(false);
  };

  const deleteDepartment = (id) => {
    const department = departments.find((item) => item.id === id);

    if (!department) return;

    if (department.courses.length > 0) {
      alert(
        "This department has courses. Remove or reassign its courses before deleting it."
      );
      return;
    }

    if (window.confirm("Are you sure you want to delete this department?")) {
      setDepartments((prev) =>
        prev.filter((department) => department.id !== id)
      );
    }
  };

  const toggleDepartmentStatus = (id) => {
    setDepartments((prev) =>
      prev.map((department) =>
        department.id === id
          ? {
              ...department,
              status:
                department.status === "Active" ? "Inactive" : "Active",
            }
          : department
      )
    );
  };

  // Course Modal
  const openAddCourse = (departmentId = "") => {
    setEditingCourseId(null);

    setCourseForm({
      name: "",
      code: "",
      level: "Undergraduate",
      duration: "3 Years",
      status: "Active",
      departmentId: departmentId ? String(departmentId) : "",
    });

    setShowCourseModal(true);
  };

  const openEditCourse = (course) => {
    setEditingCourseId(course.id);

    setCourseForm({
      name: course.name,
      code: course.code,
      level: course.level,
      duration: course.duration,
      status: course.status,
      departmentId: String(course.departmentId),
    });

    setShowCourseModal(true);
  };

  const saveCourse = (e) => {
    e.preventDefault();

    const departmentId = Number(courseForm.departmentId);

    const targetDepartment = departments.find(
      (department) => department.id === departmentId
    );

    if (!targetDepartment) {
      alert("Please select a department.");
      return;
    }

    const normalizedCode = courseForm.code.trim().toUpperCase();

    const duplicate = departments.some((department) =>
      department.courses.some(
        (course) =>
          course.code.toLowerCase() === normalizedCode.toLowerCase() &&
          course.id !== editingCourseId
      )
    );

    if (duplicate) {
      alert("This course code already exists.");
      return;
    }

    if (editingCourseId) {
      setDepartments((prev) =>
        prev.map((department) => ({
          ...department,
          courses: department.courses
            .filter((course) => course.id !== editingCourseId)
            .concat(
              department.id === departmentId
                ? [
                    {
                      id: editingCourseId,
                      name: courseForm.name,
                      code: normalizedCode,
                      level: courseForm.level,
                      duration: courseForm.duration,
                      status: courseForm.status,
                    },
                  ]
                : []
            ),
        }))
      );
    } else {
      setDepartments((prev) =>
        prev.map((department) =>
          department.id === departmentId
            ? {
                ...department,
                courses: [
                  ...department.courses,
                  {
                    id: Date.now(),
                    name: courseForm.name,
                    code: normalizedCode,
                    level: courseForm.level,
                    duration: courseForm.duration,
                    status: courseForm.status,
                  },
                ],
              }
            : department
        )
      );
    }

    setShowCourseModal(false);
  };

  const deleteCourse = (courseId) => {
    if (window.confirm("Are you sure you want to delete this course?")) {
      setDepartments((prev) =>
        prev.map((department) => ({
          ...department,
          courses: department.courses.filter(
            (course) => course.id !== courseId
          ),
        }))
      );
    }
  };

  const toggleCourseStatus = (courseId) => {
    setDepartments((prev) =>
      prev.map((department) => ({
        ...department,
        courses: department.courses.map((course) =>
          course.id === courseId
            ? {
                ...course,
                status: course.status === "Active" ? "Inactive" : "Active",
              }
            : course
        ),
      }))
    );
  };

  const stats = [
    {
      title: "Total Departments",
      value: totalDepartments,
      description: "Academic departments",
      icon: Building2,
      color: "text-[#142B50]",
      bg: "bg-[#142B50]/10",
      border: "border-t-[#142B50]",
    },
    {
      title: "Total Courses",
      value: totalCourses,
      description: "Available programs",
      icon: BookOpen,
      color: "text-[#A00018]",
      bg: "bg-[#A00018]/10",
      border: "border-t-[#A00018]",
    },
    {
      title: "Active Departments",
      value: activeDepartments,
      description: "Currently active",
      icon: CheckCircle2,
      color: "text-emerald-700",
      bg: "bg-emerald-100",
      border: "border-t-emerald-600",
    },
    {
      title: "Active Courses",
      value: activeCourses,
      description: "Active academic programs",
      icon: GraduationCap,
      color: "text-[#997000]",
      bg: "bg-[#D4AF37]/20",
      border: "border-t-[#D4AF37]",
    },
  ];

  return (
    <div className="flex w-full flex-col gap-6 pb-6">

      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#101D3A] via-[#172E55] to-[#8E0018] p-6 text-white shadow-xl md:p-8">

        <div className="pointer-events-none absolute -right-12 -top-20 h-64 w-64 rounded-full border-[35px] border-white/5" />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-5">
          <div>
            <div className="mb-3 flex w-fit items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-white/10 px-3 py-1.5">
              <GraduationCap size={15} className="text-[#FFD76A]" />
              <span className="text-xs font-semibold tracking-wider text-[#FFE8A3]">
                ACADEMIC MANAGEMENT
              </span>
            </div>

            <h1 className="text-2xl font-extrabold md:text-3xl">
              Departments & Courses
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/75">
              Organize academic departments and manage the courses offered
              under each department from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={openAddDepartment}
              className="flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              <Building2 size={17} />
              Add Department
            </button>

            <button
              onClick={() => openAddCourse()}
              disabled={departments.length === 0}
              className="flex items-center gap-2 rounded-xl bg-[#D4AF37] px-4 py-3 text-sm font-bold text-[#172951] shadow-lg transition hover:-translate-y-1 hover:bg-[#F2D477] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus size={18} />
              Add Course
            </button>
          </div>
        </div>
      </section>

      {/* Statistics */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-extrabold text-[#142B50]">
            Academic Overview
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Overview of departments and available courses
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className={`rounded-2xl border border-gray-100 border-t-4 ${item.border} bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg`}
              >
                <div className="flex items-center justify-between">
                  <div className={`rounded-xl p-3 ${item.bg} ${item.color}`}>
                    <Icon size={23} />
                  </div>
                  <ArrowUpRight size={19} className="text-gray-300" />
                </div>

                <p className="mt-4 text-sm font-semibold text-gray-500">
                  {item.title}
                </p>

                <h3 className="mt-1 text-3xl font-extrabold text-[#142B50]">
                  {item.value}
                </h3>

                <p className={`mt-1 text-xs font-medium ${item.color}`}>
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Department and Course Tabs */}
      <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 p-5">
          <div>
            <h2 className="text-lg font-extrabold text-[#142B50]">
              Academic Structure
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Manage departments and their courses
            </p>
          </div>

          <div className="flex rounded-xl bg-[#F3F5F9] p-1">
            <button
              onClick={() => {
                setActiveTab("departments");
                setSearch("");
                setStatusFilter("All");
              }}
              className={`rounded-lg px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "departments"
                  ? "bg-[#142B50] text-white shadow"
                  : "text-gray-500 hover:text-[#142B50]"
              }`}
            >
              Departments
            </button>

            <button
              onClick={() => {
                setActiveTab("courses");
                setSearch("");
                setStatusFilter("All");
              }}
              className={`rounded-lg px-4 py-2.5 text-xs font-bold transition ${
                activeTab === "courses"
                  ? "bg-[#142B50] text-white shadow"
                  : "text-gray-500 hover:text-[#142B50]"
              }`}
            >
              Courses
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col gap-3 border-b border-gray-100 bg-[#F8F9FC] p-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="relative w-full lg:max-w-sm">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              placeholder={
                activeTab === "departments"
                  ? "Search departments..."
                  : "Search courses or departments..."
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#A00018] focus:ring-2 focus:ring-[#A00018]/10"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "courses" && (
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="max-w-[190px] rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-xs font-semibold text-gray-600 outline-none focus:border-[#A00018]"
              >
                <option value="All">All Departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            )}

            <Filter size={17} className="text-[#142B50]" />

            {["All", "Active", "Inactive"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`rounded-lg px-3 py-2.5 text-xs font-bold transition ${
                  statusFilter === status
                    ? "bg-[#142B50] text-white shadow"
                    : "border border-gray-200 bg-white text-gray-500 hover:text-[#142B50]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Departments Tab */}
        {activeTab === "departments" && (
          <div className="p-5">
            {filteredDepartments.length === 0 ? (
              <div className="py-12 text-center">
                <Building2 size={38} className="mx-auto mb-3 text-gray-300" />
                <p className="font-bold text-[#142B50]">
                  No departments found
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Try another search or add a department.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                {filteredDepartments.map((department, index) => (
                  <div
                    key={department.id}
                    className="group overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-[#A00018]/20 hover:shadow-xl"
                  >
                    <div className="flex items-start justify-between bg-gradient-to-r from-[#142B50] to-[#243F69] p-5 text-white">
                      <div className="rounded-xl border border-white/10 bg-white/10 p-3">
                        <GraduationCap size={25} className="text-[#FFD76A]" />
                      </div>

                      <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white">
                        {department.code}
                      </span>
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-base font-extrabold text-[#142B50]">
                            {department.name}
                          </h3>

                          <p className="mt-2 min-h-10 text-xs leading-5 text-gray-500">
                            {department.description}
                          </p>
                        </div>

                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${
                            department.status === "Active"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {department.status}
                        </span>
                      </div>

                      <div className="mt-5 flex items-center justify-between rounded-xl bg-[#F8F9FC] p-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-600">
                          <BookOpen size={17} className="text-[#A00018]" />
                          Courses
                        </div>

                        <span className="text-lg font-extrabold text-[#142B50]">
                          {department.courses.length}
                        </span>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                        <button
                          onClick={() => openEditDepartment(department)}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#142B50]/5 px-3 py-2.5 text-xs font-bold text-[#142B50] transition hover:bg-[#142B50] hover:text-white"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>

                        <button
                          onClick={() => {
                            setSelectedCourseDepartmentId(department.id);
                            openAddCourse(department.id);
                          }}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#A00018]/5 px-3 py-2.5 text-xs font-bold text-[#A00018] transition hover:bg-[#A00018] hover:text-white"
                        >
                          <Plus size={14} />
                          Add Course
                        </button>

                        <button
                          onClick={() => toggleDepartmentStatus(department.id)}
                          title="Change status"
                          className="rounded-lg border border-gray-100 p-2.5 text-gray-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <CheckCircle2 size={16} />
                        </button>

                        <button
                          onClick={() => deleteDepartment(department.id)}
                          title="Delete department"
                          className="rounded-lg border border-gray-100 p-2.5 text-gray-500 transition hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <button
                        onClick={() => setPreviewDepartment(department)}
                        className="mt-3 flex w-full items-center justify-center gap-2 text-xs font-bold text-[#A00018] transition hover:gap-3"
                      >
                        View Department Courses
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === "courses" && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-[#F8F9FC]">
                <tr className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  <th className="px-5 py-4">Course Details</th>
                  <th className="px-5 py-4">Department</th>
                  <th className="px-5 py-4">Level</th>
                  <th className="px-5 py-4">Duration</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredCourses.map((course) => (
                  <tr
                    key={course.id}
                    className="transition hover:bg-[#FAF7F7]"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-[#A00018]/10 p-3 text-[#A00018]">
                          <BookOpen size={19} />
                        </div>

                        <div>
                          <p className="text-sm font-bold text-[#142B50]">
                            {course.name}
                          </p>
                          <p className="mt-1 text-xs text-gray-400">
                            Code: {course.code}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-lg bg-[#142B50]/5 px-3 py-1.5 text-xs font-semibold text-[#142B50]">
                        {course.departmentName}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-xs font-medium text-gray-600">
                      {course.level}
                    </td>

                    <td className="px-5 py-4 text-xs font-medium text-gray-600">
                      {course.duration}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                          course.status === "Active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {course.status}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          title="Edit course"
                          onClick={() => openEditCourse(course)}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-amber-50 hover:text-amber-700"
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          title="Change status"
                          onClick={() => toggleCourseStatus(course.id)}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <CheckCircle2 size={17} />
                        </button>

                        <button
                          title="Delete course"
                          onClick={() => deleteCourse(course.id)}
                          className="rounded-lg p-2 text-gray-500 transition hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredCourses.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-5 py-12 text-center">
                      <BookOpen
                        size={36}
                        className="mx-auto mb-3 text-gray-300"
                      />
                      <p className="font-bold text-[#142B50]">
                        No courses found
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Try another search or add a course.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 px-5 py-4">
          <p className="text-xs text-gray-500">
            {activeTab === "departments"
              ? `Showing ${filteredDepartments.length} of ${totalDepartments} departments`
              : `Showing ${filteredCourses.length} of ${totalCourses} courses`}
          </p>

          <span className="text-xs font-semibold text-[#A00018]">
            Academic Management Panel
          </span>
        </div>
      </section>

      {/* Department Add / Edit Modal */}
      {showDepartmentModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#101D3A]/70 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between bg-gradient-to-r from-[#142B50] to-[#8E0018] px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-extrabold">
                  {editingDepartmentId ? "Edit Department" : "Add Department"}
                </h2>
                <p className="mt-1 text-xs text-white/70">
                  Enter department information
                </p>
              </div>

              <button
                onClick={() => setShowDepartmentModal(false)}
                className="rounded-lg p-2 transition hover:bg-white/15"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={saveDepartment} className="space-y-5 p-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-[#142B50]">
                  Department Name *
                </label>
                <input
                  required
                  value={departmentForm.name}
                  onChange={(e) =>
                    setDepartmentForm({
                      ...departmentForm,
                      name: e.target.value,
                    })
                  }
                  placeholder="Enter department name"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#A00018] focus:ring-2 focus:ring-[#A00018]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#142B50]">
                  Department Code *
                </label>
                <input
                  required
                  value={departmentForm.code}
                  onChange={(e) =>
                    setDepartmentForm({
                      ...departmentForm,
                      code: e.target.value,
                    })
                  }
                  placeholder="Example: CS"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm uppercase outline-none focus:border-[#A00018] focus:ring-2 focus:ring-[#A00018]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#142B50]">
                  Description
                </label>
                <textarea
                  rows="3"
                  value={departmentForm.description}
                  onChange={(e) =>
                    setDepartmentForm({
                      ...departmentForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Write department description..."
                  className="w-full resize-none rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#142B50]">
                  Status
                </label>
                <select
                  value={departmentForm.status}
                  onChange={(e) =>
                    setDepartmentForm({
                      ...departmentForm,
                      status: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setShowDepartmentModal(false)}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-[#A00018] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#780013]"
                >
                  <Save size={16} />
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Add / Edit Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#101D3A]/70 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between bg-gradient-to-r from-[#142B50] to-[#8E0018] px-6 py-5 text-white">
              <div>
                <h2 className="text-xl font-extrabold">
                  {editingCourseId ? "Edit Course" : "Add New Course"}
                </h2>
                <p className="mt-1 text-xs text-white/70">
                  Enter academic program details
                </p>
              </div>

              <button
                onClick={() => setShowCourseModal(false)}
                className="rounded-lg p-2 transition hover:bg-white/15"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={saveCourse} className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-bold text-[#142B50]">
                  Course Name *
                </label>
                <input
                  required
                  value={courseForm.name}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, name: e.target.value })
                  }
                  placeholder="Enter course name"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#142B50]">
                  Course Code *
                </label>
                <input
                  required
                  value={courseForm.code}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, code: e.target.value })
                  }
                  placeholder="Example: BCA"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm uppercase outline-none focus:border-[#A00018]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#142B50]">
                  Department *
                </label>
                <select
                  required
                  value={courseForm.departmentId}
                  onChange={(e) =>
                    setCourseForm({
                      ...courseForm,
                      departmentId: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                >
                  <option value="">Select Department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold text-[#142B50]">
                    Course Level
                  </label>
                  <select
                    value={courseForm.level}
                    onChange={(e) =>
                      setCourseForm({ ...courseForm, level: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#A00018]"
                  >
                    <option>Undergraduate</option>
                    <option>Postgraduate</option>
                    <option>Diploma</option>
                    <option>Certificate</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-[#142B50]">
                    Duration
                  </label>
                  <select
                    value={courseForm.duration}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        duration: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm outline-none focus:border-[#A00018]"
                  >
                    <option>1 Year</option>
                    <option>2 Years</option>
                    <option>3 Years</option>
                    <option>4 Years</option>
                    <option>5 Years</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[#142B50]">
                  Status
                </label>
                <select
                  value={courseForm.status}
                  onChange={(e) =>
                    setCourseForm({ ...courseForm, status: e.target.value })
                  }
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#A00018]"
                >
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="flex items-center gap-2 rounded-xl bg-[#A00018] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#780013]"
                >
                  <Save size={16} />
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Department Preview Modal */}
      {previewDepartment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#101D3A]/70 p-4 backdrop-blur-sm">
          <div className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">

            <div className="flex items-center justify-between bg-gradient-to-r from-[#142B50] to-[#8E0018] px-6 py-5 text-white">
              <div>
                <p className="text-xs font-semibold text-[#FFE8A3]">
                  DEPARTMENT DETAILS
                </p>
                <h2 className="mt-1 text-xl font-extrabold">
                  {previewDepartment.name}
                </h2>
              </div>

              <button
                onClick={() => setPreviewDepartment(null)}
                className="rounded-lg p-2 hover:bg-white/15"
              >
                <X size={21} />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <span className="rounded-lg bg-[#142B50]/10 px-3 py-1.5 text-xs font-bold text-[#142B50]">
                  Code: {previewDepartment.code}
                </span>

                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  {previewDepartment.status}
                </span>
              </div>

              <p className="text-sm leading-6 text-gray-500">
                {previewDepartment.description}
              </p>

              <div className="mt-6 flex items-center justify-between">
                <h3 className="font-extrabold text-[#142B50]">
                  Courses under this department
                </h3>
                <span className="rounded-full bg-[#A00018]/10 px-3 py-1 text-xs font-bold text-[#A00018]">
                  {previewDepartment.courses.length} Courses
                </span>
              </div>

              <div className="mt-3 space-y-3">
                {previewDepartment.courses.map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center gap-3 rounded-xl border border-gray-100 bg-[#F8F9FC] p-3"
                  >
                    <div className="rounded-lg bg-[#A00018]/10 p-2.5 text-[#A00018]">
                      <BookOpen size={18} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#142B50]">
                        {course.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {course.code} • {course.duration}
                      </p>
                    </div>
                  </div>
                ))}

                {previewDepartment.courses.length === 0 && (
                  <p className="rounded-xl bg-gray-50 p-5 text-center text-sm text-gray-400">
                    No courses added to this department yet.
                  </p>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setPreviewDepartment(null)}
                  className="rounded-xl bg-[#142B50] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#203D68]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default DepartmentsAndCourses;
