import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import Applications from "./admission/Applications";
import FeesAndPayments from "./admission/FeesAndPayments";
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
      screen.getByRole("heading", { name: "Manage Content" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Content library")).toBeInTheDocument();
  });

  it("renders website notices", () => {
    renderPage(<NoticesAndAnnouncements />);
    expect(
      screen.getByRole("heading", { name: "Notices & Announcements" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Notice board")).toBeInTheDocument();
  });

  it("renders admission applications", () => {
    renderPage(<Applications />);
    expect(
      screen.getByRole("heading", { name: "Applications" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Application queue")).toBeInTheDocument();
    expect(screen.getByText("Rida Khan")).toBeInTheDocument();
  });

  it("renders admission fees and payments", () => {
    renderPage(<FeesAndPayments />);
    expect(
      screen.getByRole("heading", { name: "Fees & Payments" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Payment ledger")).toBeInTheDocument();
    expect(screen.getByText("Hasan Patel")).toBeInTheDocument();
  });

  it("renders examination sessions", () => {
    renderPage(<ExamSessions />);
    expect(
      screen.getByRole("heading", { name: "Exam Sessions" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Session calendar")).toBeInTheDocument();
  });

  it("renders marks and results", () => {
    renderPage(<MarksAndResults />);
    expect(
      screen.getByRole("heading", { name: "Marks & Results" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Marks register")).toBeInTheDocument();
    expect(screen.getByText("Fatima Khan")).toBeInTheDocument();
  });
});
