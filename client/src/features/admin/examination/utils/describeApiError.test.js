import { describe, expect, it } from "vitest";
import { describeApiError } from "./describeApiError";

describe("describeApiError", () => {
  it("recognises unauthorised responses and offers no retry", () => {
    const error = new Error("Forbidden", { cause: { response: { status: 401 } } });
    expect(describeApiError(error)).toMatchObject({
      kind: "unauthorized",
      canRetry: false,
    });
  });

  it("recognises network failures", () => {
    const error = new Error("Network Error", {
      cause: { request: {}, code: "ERR_NETWORK" },
    });
    expect(describeApiError(error)).toMatchObject({ kind: "network", canRetry: true });
  });

  it("falls back to the error message", () => {
    expect(describeApiError(new Error("Boom"))).toMatchObject({
      kind: "error",
      description: "Boom",
      canRetry: true,
    });
  });
});
