import { describe, expect, it } from "vitest";
import {
  buildHallTicketReadiness,
  buildKpis,
  formatCount,
  latestChange,
  percentage,
} from "./dashboardMetrics";

describe("percentage", () => {
  it("rounds to a whole number", () => {
    expect(percentage(1102, 1248)).toBe(88);
  });

  it("returns null when it cannot be calculated", () => {
    expect(percentage(5, 0)).toBeNull();
    expect(percentage(undefined, 10)).toBeNull();
  });

  it("never goes above 100", () => {
    expect(percentage(5, 3)).toBe(100);
  });
});

describe("latestChange", () => {
  it("describes growth and decline", () => {
    expect(latestChange([640, 1080, 1180])).toBe("+9.3%");
    expect(latestChange([100, 95])).toBe("-5.0%");
  });

  it("returns null without enough usable data", () => {
    expect(latestChange([])).toBeNull();
    expect(latestChange([10])).toBeNull();
    expect(latestChange([0, 10])).toBeNull();
  });
});

describe("formatCount / buildKpis", () => {
  it("formats numbers in Indian grouping and shows a dash when missing", () => {
    expect(formatCount(1248)).toBe("1,248");
    expect(formatCount(undefined)).toBe("\u2014");
    expect(buildKpis({}).every((kpi) => kpi.value === "\u2014")).toBe(true);
  });
});

describe("buildHallTicketReadiness", () => {
  it("works out how many students still lack a ticket", () => {
    expect(
      buildHallTicketReadiness({ registeredStudents: 1248, hallTicketsIssued: 1102 }),
    ).toMatchObject({ percent: 88, notYetIssued: 146 });
  });

  it("returns unknowns when figures are missing", () => {
    expect(buildHallTicketReadiness({})).toMatchObject({
      percent: null,
      notYetIssued: null,
    });
  });
});
