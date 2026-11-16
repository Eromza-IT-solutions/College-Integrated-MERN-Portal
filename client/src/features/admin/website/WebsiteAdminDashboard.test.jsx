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
      screen.getByRole("heading", {
        name: /Manage Your College Website With Ease/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Website Overview")).toBeInTheDocument();
    expect(screen.getByText("Website Pages")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions")).toBeInTheDocument();
    expect(screen.getByText("About Our College")).toBeInTheDocument();
  });
});
