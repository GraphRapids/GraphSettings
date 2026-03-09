import { describe, it, expect } from "vitest";

const SERVICE_URL = process.env.SERVICE_URL ?? "http://localhost:8080";

describe("GET /health", () => {
  it("returns 200 with status ok and correct content type", async () => {
    const response = await fetch(`${SERVICE_URL}/health`);

    expect(response.status).toBe(200);

    const contentType = response.headers.get("content-type") ?? "";
    expect(contentType).toContain("application/json");

    const body = await response.json();
    expect(body).toEqual({ status: "ok" });
  });

  it("responds quickly (under 500ms)", async () => {
    const start = performance.now();
    const response = await fetch(`${SERVICE_URL}/health`);
    const elapsed = performance.now() - start;

    expect(response.status).toBe(200);
    expect(elapsed).toBeLessThan(500);
  });
});
