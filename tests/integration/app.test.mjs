import { describe, it } from "node:test";
import assert from "node:assert/strict";

const SERVICE_URL = process.env.SERVICE_URL || "http://localhost:8080";

describe("Application serving", () => {
  it("GET / returns 200 with HTML content", async () => {
    const res = await fetch(`${SERVICE_URL}/`);

    assert.equal(res.status, 200);

    const contentType = res.headers.get("content-type");
    assert.ok(
      contentType && contentType.includes("text/html"),
      `Expected text/html content-type, got ${contentType}`,
    );

    const body = await res.text();
    assert.ok(
      body.includes("<!DOCTYPE html>") || body.includes("<html"),
      "Expected response to contain an HTML document",
    );
  });

  it("GET /nonexistent-route falls back to index.html (SPA routing)", async () => {
    const res = await fetch(`${SERVICE_URL}/nonexistent-route`);

    assert.equal(res.status, 200);

    const contentType = res.headers.get("content-type");
    assert.ok(
      contentType && contentType.includes("text/html"),
      `Expected text/html content-type for SPA fallback, got ${contentType}`,
    );

    const body = await res.text();
    assert.ok(
      body.includes("<!DOCTYPE html>") || body.includes("<html"),
      "Expected SPA fallback to serve index.html",
    );
  });
});
