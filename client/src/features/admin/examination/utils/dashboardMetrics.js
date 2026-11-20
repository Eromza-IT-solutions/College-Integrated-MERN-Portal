// Pure helper functions for the Examination Admin dashboard.
// Every figure shown on the dashboard is calculated here from the data it is
// given, so nothing needs to be hardcoded in the page.

const NOT_AVAILABLE = "\u2014"; // em dash

export function formatCount(value) {
  return Number.isFinite(value) ? value.toLocaleString("en-IN") : NOT_AVAILABLE;
}

// Whole-number percentage of `part` in `whole`, or null when it cannot be worked out.
export function percentage(part, whole) {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) {
    return null;
  }
  return Math.min(100, Math.max(0, Math.round((part / whole) * 100)));
}

// Change between the last two values of a series, e.g. "+9.3%". Null if unknown.
export function latestChange(values) {
  if (!Array.isArray(values) || values.length < 2) return null;

  const previous = values.at(-2);
  const latest = values.at(-1);
  if (!Number.isFinite(previous) || !Number.isFinite(latest) || previous <= 0) {
    return null;
  }

  const change = ((latest - previous) / previous) * 100;
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
}

export function buildKpis(summary = {}) {
  return [
    {
      id: "sessions",
      label: "Active Sessions",
      value: formatCount(summary.activeSessions),
      tone: "info",
      icon: "sessions",
    },
    {
      id: "students",
      label: "Registered Students",
      value: formatCount(summary.registeredStudents),
      tone: "accent",
      icon: "students",
    },
    {
      id: "tickets",
      label: "Hall Tickets Issued",
      value: formatCount(summary.hallTicketsIssued),
      tone: "success",
      icon: "tickets",
    },
    {
      id: "results",
      label: "Results Published",
      value: formatCount(summary.resultsPublished),
      tone: "warning",
      icon: "results",
    },
  ];
}

export function buildHallTicketReadiness(summary = {}) {
  const { registeredStudents: registered, hallTicketsIssued: issued } = summary;
  const bothKnown = Number.isFinite(registered) && Number.isFinite(issued);

  return {
    percent: percentage(issued, registered),
    issued,
    registered,
    notYetIssued: bothKnown ? Math.max(registered - issued, 0) : null,
  };
}

export function buildDashboardViewModel(data) {
  const marksValues = data.submissionSeries?.values ?? [];

  return {
    kpis: buildKpis(data.summary),
    readiness: buildHallTicketReadiness(data.summary),
    marksChange: latestChange(marksValues),
    latestMarks: marksValues.length ? marksValues.at(-1) : null,
  };
}
