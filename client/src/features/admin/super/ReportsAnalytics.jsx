import ReportsView from "../../../components/reports/ReportsView";

const TABS = [
  { type: "department", label: "Departments" },
  { type: "admission", label: "Admissions" },
  { type: "exam", label: "Exams" },
  { type: "payment", label: "Payments" },
];

export default function ReportsAnalytics() {
  return (
    <ReportsView
      eyebrow="Super Admin"
      title="Reports & Analytics"
      description="College-wide reports for departments, admissions, exams and payments."
      tabs={TABS}
    />
  );
}
