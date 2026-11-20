import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../services/adminApi", async () => {
  const { createAdminApiMock } = await import("../../test/adminApiFixture");
  return createAdminApiMock();
});

import ManageApplications from "./admission/ManageApplications";
import FeesPayments from "./admission/FeesPayments";
import ExamSessions from "./examination/ExamSessions";
import MarksAndResults from "./examination/MarksAndResults";
import ManageContent from "./website/ManageContent";
import NoticesAndAnnouncements from "./website/NoticesAndAnnouncements";

afterEach(cleanup);

function renderPage(page) {
  render(<MemoryRouter>{page}</MemoryRouter>);
}

describe("primary admin pages", () => {
  it("renders website content management", () => {
    renderPage(<ManageContent />);
    expect(
      screen.getByRole("heading", { name: "Manage Website Content" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Content Overview")).toBeInTheDocument();
  });

  it("renders website notices", () => {
    renderPage(<NoticesAndAnnouncements />);
    expect(
      screen.getByRole("heading", { name: "Notices & Announcements" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Total Notices")).toBeInTheDocument();
  });

  it("renders admission applications", () => {
    renderPage(<ManageApplications />);
    expect(
      screen.getByRole("heading", { name: "Manage Applications" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Application Overview")).toBeInTheDocument();
    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
  });

  it("renders admission fees and payments", () => {
    renderPage(<FeesPayments />);
    expect(
      screen.getByRole("heading", { name: "Fees & Payments Management" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Payment Highlights")).toBeInTheDocument();
    expect(screen.getByText("Aarav Sharma")).toBeInTheDocument();
  });

  it("renders examination sessions", () => {
    renderPage(<ExamSessions />);
    expect(
      screen.getByRole("heading", { name: "Exam Sessions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Session Calendar")).toBeInTheDocument();
  });

  it("renders marks and results", () => {
    renderPage(<MarksAndResults />);
    expect(
      screen.getByRole("heading", { name: "Marks & Results" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Examination marks register"),
    ).toBeInTheDocument();
    expect(screen.getByText("Fatima Khan")).toBeInTheDocument();
  });
});
