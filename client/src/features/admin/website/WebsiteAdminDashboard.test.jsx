import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import WebsiteAdminDashboard from "./WebsiteAdminDashboard";

describe("WebsiteAdminDashboard", () => {
  it("renders website metrics, content, and publishing activity", () => {
    render(
      <MemoryRouter>
        <WebsiteAdminDashboard />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Website Admin Dashboard" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Published Pages")).toBeInTheDocument();
    expect(screen.getByText("Website visits")).toBeInTheDocument();
    expect(screen.getByText("Content health")).toBeInTheDocument();
    expect(screen.getByText("Recent content")).toBeInTheDocument();
    expect(screen.getByText("Publishing queue")).toBeInTheDocument();
  });
});
