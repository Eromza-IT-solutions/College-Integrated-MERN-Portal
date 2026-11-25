import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../services/adminApi", async () => {
  const { createAdminApiMock } = await import("../../../test/adminApiFixture");
  return createAdminApiMock();
});

import { enterMarks, publishResult } from "../../../services/adminApi";
import MarksAndResults from "./MarksAndResults";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  render(
    <MemoryRouter>
      <MarksAndResults />
    </MemoryRouter>,
  );
}

describe("MarksAndResults", () => {
  it("renders API-backed result sheets", async () => {
    renderPage();

    expect(await screen.findByText("Fatima Khan")).toBeInTheDocument();
    expect(screen.getByText("2024A001")).toBeInTheDocument();
    expect(screen.getByText(/87%/)).toBeInTheDocument();
    expect(screen.getAllByText(/ready to publish/i).length).toBeGreaterThan(0);
  });

  it("saves marks with canonical subject and mark fields", async () => {
    renderPage();

    fireEvent.click(await screen.findByTitle("Enter marks"));

    const dialog = screen.getByRole("dialog");

    fireEvent.change(
      within(dialog).getByRole("spinbutton", {
        name: /Internal marks/i,
      }),
      { target: { value: "38" } },
    );

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Save marks",
      }),
    );

    await waitFor(() => {
      expect(enterMarks).toHaveBeenCalledWith(
        "result-1",
        expect.arrayContaining([
          expect.objectContaining({
            subjectId: "sub-1",
            absent: false,
            internalMarks: 38,
            externalMarks: 52,
            maxInternal: 40,
            maxExternal: 60,
          }),
        ]),
      );
    });
  });

  it("publishes a result from the confirmation dialog", async () => {
    renderPage();

    fireEvent.click(await screen.findByTitle("Publish result"));

    const dialog = screen.getByRole("dialog");

    fireEvent.click(
      within(dialog).getByRole("button", {
        name: "Publish result",
      }),
    );

    await waitFor(() => {
      expect(publishResult).toHaveBeenCalledWith("result-1");
    });
  });
});