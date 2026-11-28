import TimetableManager from "../academics/TimetableManager";

// HOD: manage the timetable of the classes in their own department (the server enforces the limit).
export default function ManageTimetable() {
  return <TimetableManager eyebrow="HOD" />;
}
