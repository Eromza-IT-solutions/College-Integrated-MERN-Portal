import TimetableManager from "../../academics/TimetableManager";

// Super Admin: manage the timetable of any department.
export default function SuperTimetable() {
  return <TimetableManager eyebrow="Super Admin" className="p-6 lg:p-8" />;
}
