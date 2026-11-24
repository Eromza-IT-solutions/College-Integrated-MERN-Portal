
// import { useState } from "react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
// import StudentSidebar from "./StudentSidebar";
import StudentSidebar, { menuItems } from "./StudentSidebar";
import StudentTopbar from "./StudentTopbar";
import StudentDashboard from "./StudentDashboard";
import StudentProfile from "./Profile";
import StudentAttendance from "./Attendance";
import StudentTimetable from "./Timetable";
import StudentHallTickets from "./HallTickets";
import StudentResults from "./Results";
import StudentNotices from "./Notices";
import ExamDashboard from "./examinations/ExamDashboard";
import ExamForm from "./examinations/ExamForm";
import ExamFeePayment from "./examinations/ExamFeePayment";
import ExamAbcId from "./examinations/ExamAbcId";
import ExamUploadPhoto from "./examinations/ExamUploadPhoto";
import ExamRevaluation from "./examinations/ExamRevaluation";
import { ExamProvider } from "./examinations/ExamShared";
import AdmissionFillForm from "./admission/AdmissionFillForm";
import AdmissionUpdateForm from "./admission/AdmissionUpdateForm";
import AdmissionPrintForm from "./admission/AdmissionPrintForm";
import AdmissionDownloadForm from "./admission/AdmissionDownloadForm";
import AdmissionSubmissionDates from "./admission/AdmissionSubmissionDates";
import AdmissionFeeDetails from "./admission/AdmissionFeeDetails";
import AdmissionMyInfo from "./admission/AdmissionMyInfo";
import { AdmissionProvider } from "./admission/AdmissionShared";
import { useAuth } from "../../hooks/useAuth";
import { PaymentsProvider } from "./payments/PaymentsShared";
import BrochureCodes from "./payments/BrochureCodes";
import PayAdmissionFee from "./payments/PayAdmissionFee";
import PayPendingFee from "./payments/PayPendingFee";
import PayMiscFee from "./payments/PayMiscFee";
import DownloadPaymentReceipts from "./payments/DownloadPaymentReceipts";
import DownloadCollegeReceipts from "./payments/DownloadCollegeReceipts";

export default function StudentLayout() {
 const { logout, user } = useAuth();
  // const [activePage, setActivePage] = useState("dashboard");
  const { pathname } = useLocation();
  const routePage = pathname.startsWith("/student/") ? pathname.slice("/student/".length) : "dashboard";
  const [activePage, setActivePage] = useState(routePage);
  useEffect(() => { setActivePage(routePage); }, [routePage]);
  const pageTitle = menuItems.find((item) => item.id === activePage)?.label
    ?? activePage.split("/").pop().replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
<PaymentsProvider
  onNavigate={(id) =>
    setActivePage(
      id === "brochures" ? "payments/brochure-codes" :
      id === "admission" ? "payments/pay-admission-fee" :
      id === "pending" ? "payments/pay-pending-fee" :
      id === "misc" ? "payments/pay-miscellaneous-fee" :
      id === "receipts" ? "payments/download-payment-receipts" :
      id === "college" ? "payments/download-college-receipts" :
      "payments/brochure-codes"
    )
  }
>

   <AdmissionProvider
  onNavigate={(id) =>
    setActivePage(
      id === "fill" ? "admission/fill-form" :
      id === "update" ? "admission/update-form" :
      id === "print" ? "admission/print-form" :
      id === "download" ? "admission/download-form" :
      id === "dates" ? "admission/form-submission-dates" :
      id === "fee" ? "admission/view-fee-details" :
      id === "info" ? "admission/my-admission-info" :
      "admission/fill-form"
    )
  }
>
  <ExamProvider
  onNavigate={(id) =>
    setActivePage(
      id === "form" ? "examinations/examination-form" :
      id === "fee" ? "examinations/form-fee-payment" :
      id === "abc" ? "examinations/abc-id" :
      id === "photo" ? "examinations/upload-student-photo" :
      id === "reval" ? "examinations/revaluation-form" :
      "examinations/dashboard"
    )
  }
>
    <div className="flex h-screen overflow-hidden bg-[#f5f6fa]">

      {/* Sidebar */}
      <StudentSidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={async () => {
  await logout();
  window.location.href = "/login";
}}
      />

      {/* Right Section */}
      <div className="flex min-w-0 flex-1 flex-col h-screen">

        {/* Fixed Topbar */}
        <div className="shrink-0">
         <StudentTopbar
  title={pageTitle}
  student={{
    name: user?.name || "Student",
    rollNo: user?.rollNo || "N/A",
  }}
  onNavigate={setActivePage}
  onProfile={() => setActivePage("profile")}
  onViewNotices={() => setActivePage("notices")}
  onLogout={async () => {
    await logout();
    window.location.href = "/login";
  }}
/>
        </div>

        {/* Scrollable Main Content */}
        <main className="min-h-0 flex-1 overflow-y-auto">
       {activePage === "dashboard" ? (
  <StudentDashboard onNavigate={setActivePage} />
) : activePage === "profile" ? (
  <StudentProfile />
) : activePage === "attendance" ? (
  <StudentAttendance />
) : activePage === "timetable" ? (
  <StudentTimetable />
) : activePage === "hall-tickets" ? (
  <StudentHallTickets />
) : activePage === "results" ? (
  <StudentResults />
) : activePage === "notices" ? (
  <StudentNotices />
  ) : activePage === "admission/fill-form" ? (
  <AdmissionFillForm />
) : activePage === "admission/update-form" ? (
  <AdmissionUpdateForm />
) : activePage === "admission/print-form" ? (
  <AdmissionPrintForm />
) : activePage === "admission/download-form" ? (
  <AdmissionDownloadForm />
) : activePage === "admission/form-submission-dates" ? (
  <AdmissionSubmissionDates />
) : activePage === "admission/view-fee-details" ? (
  <AdmissionFeeDetails />
) : activePage === "admission/my-admission-info" ? (
  <AdmissionMyInfo />
  ) : activePage === "examinations/dashboard" ? (
  <ExamDashboard />
) : activePage === "examinations/examination-form" ? (
  <ExamForm />
) : activePage === "examinations/form-fee-payment" ? (
  <ExamFeePayment />
) : activePage === "examinations/abc-id" ? (
  <ExamAbcId />
) : activePage === "examinations/upload-student-photo" ? (
  <ExamUploadPhoto />
) : activePage === "examinations/revaluation-form" ? (
  <ExamRevaluation />
) : activePage === "payments/view-brochure-codes" ? (
  <BrochureCodes />
) : activePage === "payments/pay-admission-fee" ? (
  <PayAdmissionFee />
) : activePage === "payments/pay-pending-fee" ? (
  <PayPendingFee />
) : activePage === "payments/pay-miscellaneous-fee" ? (
  <PayMiscFee />
) : activePage === "payments/download-payment-receipts" ? (
  <DownloadPaymentReceipts />
) : activePage === "payments/download-college-receipts" ? (
  <DownloadCollegeReceipts />
) : (
  <div className="p-6">
    <h1 className="text-2xl font-bold text-[#14264b]">
      {activePage}
    </h1>
  </div>
)}
        </main>

      </div>
    </div>
  </ExamProvider>
</AdmissionProvider>
</PaymentsProvider>

  );
}
