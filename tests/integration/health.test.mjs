import { describe, it } from "node:test";
import assert from "node:assert/strict";

const SERVICE_URL = process.env.SERVICE_URL || "http://localhost:8080";

describe("Health check", () => {
  it("GET /health returns 200 with {status: ok}", async () => {
    const res = await fetch(`${SERVICE_URL}/health`);

    assert.equal(res.status, 200);

    const contentType = res.headers.get("content-type");
    assert.ok(
      contentType && contentType.includes("application/json"),
      `Expected application/json content-type, got ${contentType}`,
    );

    const body = await res.json();
    assert.deepStrictEqual(body, { status: "ok" });
  });
});
