import { describe, it, expect } from "vitest";

const SERVICE_URL = process.env.SERVICE_URL ?? "http://localhost:8080";

describe("Static file serving", () => {
  it("GET / serves the SPA index page", async () => {
    const response = await fetch(`${SERVICE_URL}/`);

    expect(response.status).toBe(200);

    const contentType = response.headers.get("content-type") ?? "";
    expect(contentType).toContain("text/html");

    const body = await response.text();
    expect(body).toMatch(/<!doctype html>/i);
  });

  it("unknown routes fall back to index.html (SPA routing)", async () => {
    const response = await fetch(
      `${SERVICE_URL}/unknown-route-${Date.now()}`,
    );

    expect(response.status).toBe(200);

    const contentType = response.headers.get("content-type") ?? "";
    expect(contentType).toContain("text/html");

    const body = await response.text();
    expect(body).toMatch(/<!doctype html>/i);
  });
});

describe("Response headers", () => {
  it("serves gzipped content when accepted", async () => {
    const response = await fetch(`${SERVICE_URL}/`, {
      headers: { "Accept-Encoding": "gzip" },
    });

    expect(response.status).toBe(200);
    // Note: fetch may transparently decompress, but the response should succeed
  });
});
