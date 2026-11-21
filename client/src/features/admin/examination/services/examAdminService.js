// Examination Admin data access.
//
// STATUS: BACKEND NOT CONNECTED. Every function below currently returns DEMO
// data. No API endpoint is called, because no backend route for this module
// has been confirmed. Do not describe any action here as "saved to the server".
//
// Every function returns { source, data }. `source` is DATA_SOURCE.DEMO today
// and will be DATA_SOURCE.API once real calls replace the demo adapter.
//
// PROPOSED contract for the backend team (a request, NOT something that exists):
//   Dashboard payload `data` should contain:
//     summary:          { activeSessions, registeredStudents, hallTicketsIssued, resultsPublished }  (numbers)
//     submissionSeries: { labels: string[], values: number[] }   (monthly marks submitted)
//     resultsProgress:  [{ label, value, color? }]
//     upcomingExams:    [{ id, exam, subject, date, time, room, status }]
//     sessions:         [{ id, name, term, startDate, endDate, status }]
//     activities:       [{ id, title, time, icon, tone }]
//   Errors: HTTP 401/403 for unauthorised, with { message } in the body.
//   Access must be enforced by the server; frontend role checks are only for UX.
//
// To connect: import `http` from "../../../../services/http", call the confirmed
// endpoint here, and return { source: DATA_SOURCE.API, data: <response data> }.

import { DATA_SOURCE } from "./dataSource";
import { demoGetDashboard } from "./examAdminDemoAdapter";

export async function getDashboardData() {
  const data = await demoGetDashboard();
  return { source: DATA_SOURCE.DEMO, data };
}
