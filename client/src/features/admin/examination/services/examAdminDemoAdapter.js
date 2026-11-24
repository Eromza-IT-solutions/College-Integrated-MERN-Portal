// DEMO ADAPTER - the ONLY place in the dashboard data layer that reads mock files.
// When the backend is ready, examAdminService.js stops calling this file and
// this file (plus mocks/examDashboardDemo.js) can be deleted.

import {
  examActivities,
  examResultsProgress,
  examSessions,
  examSubmissionSeries,
  examUpcomingExams,
} from "../../../../mocks/examAdminData";
import { examDashboardSummaryDemo } from "../../../../mocks/examDashboardDemo";

export async function demoGetDashboard() {
  return {
    summary: {
      // Counted from the sessions list so the two can never disagree.
      activeSessions: examSessions.filter((session) => session.status === "active")
        .length,
      ...examDashboardSummaryDemo,
    },
    submissionSeries: examSubmissionSeries,
    resultsProgress: [...examResultsProgress],
    upcomingExams: [...examUpcomingExams],
    sessions: [...examSessions],
    activities: [...examActivities],
  };
}
