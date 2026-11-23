import ReportsView from "../../components/reports/ReportsView";

export default function DepartmentReports() {
  return (
    <ReportsView
      eyebrow="Head of Department"
      title="Department Reports"
      description="Students, teachers, attendance and marks status of your department."
      tabs={[{ type: "department", label: "Department" }]}
    />
  );
}
