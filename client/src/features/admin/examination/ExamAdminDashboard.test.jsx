import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { downloadCsv } from "../../../utils/csv";
import ExamAdminDashboard from "./ExamAdminDashboard";
import { DATA_SOURCE } from "./services/dataSource";
import { demoGetDashboard } from "./services/examAdminDemoAdapter";
import { getDashboardData } from "./services/examAdminService";

// Replace the data layer so each test controls what "the server" returns.
vi.mock("./services/examAdminService", () => ({ getDashboardData: vi.fn() }));
vi.mock("../../../utils/csv", () => ({ downloadCsv: vi.fn() }));

async function demoResult(overrides = {}) {
  const data = await demoGetDashboard();
  return { source: DATA_SOURCE.DEMO, data: { ...data, ...overrides } };
}

function renderDashboard() {
  render(
    <MemoryRouter>
      <ExamAdminDashboard />
    </MemoryRouter>,
  );
}

function httpError(message, cause) {
  return new Error(message, { cause });
}

beforeEach(() => {
  getDashboardData.mockReset();
  downloadCsv.mockReset();
  getDashboardData.mockImplementation(async () => demoResult());
});

afterEach(cleanup);

describe("ExamAdminDashboard", () => {
  it("shows a loading state, then the dashboard", async () => {
    renderDashboard();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(await screen.findByText("Active Sessions")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Exam Admin Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Upcoming exams")).toBeInTheDocument();
    expect(screen.getByText("Exam sessions")).toBeInTheDocument();
    expect(screen.getByText("Advanced Accounting")).toBeInTheDocument();
  });

  it("labels sample data as demo data and never as live", async () => {
    renderDashboard();
    await screen.findByText("Active Sessions");

    expect(screen.getByRole("note")).toHaveTextContent(/demo data/i);
    expect(screen.queryByText("Live")).not.toBeInTheDocument();
  });

  it("does not show the demo banner for real server data", async () => {
    getDashboardData.mockImplementation(async () => ({
      ...(await demoResult()),
      source: DATA_SOURCE.API,
    }));
    renderDashboard();
    await screen.findByText("Active Sessions");

    expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });

  it("calculates figures from the data instead of hardcoding them", async () => {
    renderDashboard();
    await screen.findByText("Active Sessions");

    expect(screen.getByText("1,248")).toBeInTheDocument();
    expect(screen.getByText("1,102")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
    expect(screen.getByText(/146 registered students/)).toBeInTheDocument();
    expect(screen.getByText(/\+9\.3% vs previous month/)).toBeInTheDocument();
  });

  it("shows empty states when there is no data", async () => {
    getDashboardData.mockImplementation(async () =>
      demoResult({ upcomingExams: [], sessions: [], activities: [] }),
    );
    renderDashboard();

    expect(await screen.findByText("No upcoming exams")).toBeInTheDocument();
    expect(screen.getByText("No exam sessions")).toBeInTheDocument();
    expect(screen.getByText("No recent activity")).toBeInTheDocument();
  });

  it("shows an error and lets the user retry", async () => {
    getDashboardData.mockRejectedValueOnce(new Error("Server exploded"));
    renderDashboard();

    expect(await screen.findByText("Could not load data")).toBeInTheDocument();
    expect(screen.getByText("Server exploded")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /export report/i })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /try again/i }));

    expect(await screen.findByText("Active Sessions")).toBeInTheDocument();
    expect(screen.queryByText("Could not load data")).not.toBeInTheDocument();
  });

  it("shows access denied without a retry button for 401/403", async () => {
    getDashboardData.mockRejectedValueOnce(
      httpError("Forbidden", { response: { status: 403 } }),
    );
    renderDashboard();

    expect(await screen.findByText("Access denied")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("shows a network failure message", async () => {
    getDashboardData.mockRejectedValueOnce(
      httpError("Network Error", { request: {}, code: "ERR_NETWORK" }),
    );
    renderDashboard();

    expect(await screen.findByText("Cannot reach the server")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
  });

  it("exports a CSV that states its data source", async () => {
    renderDashboard();
    fireEvent.click(await screen.findByRole("button", { name: /export report/i }));

    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [filename, rows] = downloadCsv.mock.calls[0];
    expect(filename).toBe("eromza-examination-report.csv");
    expect(rows).toContainEqual(["Data source", expect.stringContaining("Demo data")]);
    expect(rows).toContainEqual(["Registered Students", "1,248"]);
  });

  it("links to the pages it points at", async () => {
    renderDashboard();
    await screen.findByText("Active Sessions");

    expect(screen.getByRole("link", { name: /manage sessions/i })).toHaveAttribute(
      "href",
      "/exam-admin/sessions",
    );
    expect(screen.getByRole("link", { name: /view timetable/i })).toHaveAttribute(
      "href",
      "/exam-admin/timetables",
    );
  });
});
