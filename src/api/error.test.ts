import { describe, expect, it } from "vitest";

import { normalizeApiError } from "./error";

describe("normalizeApiError", () => {
  it("normalizes API error response payloads", () => {
    const error = normalizeApiError(
      {
        error: {
          code: "conflict",
          message: "Resource already exists",
          details: null,
        },
      },
      409,
    );

    expect(error.message).toBe("Resource already exists");
    expect(error.status).toBe(409);
    expect(error.body).toEqual({
      code: "conflict",
      details: null,
      errors: {
        "root.serverError": "Resource already exists",
      },
    });
  });

  it("maps validation errors into field-level errors", () => {
    const error = normalizeApiError(
      {
        detail: [
          {
            loc: ["body", "name"],
            msg: "Field required",
            type: "missing",
          },
          {
            loc: ["body", "layoutSetRef", "layoutSetVersion"],
            msg: "Must be >= 1",
            type: "value_error",
          },
        ],
      },
      422,
    );

    expect(error.status).toBe(422);
    expect(error.message).toBe("Field required");
    expect(error.body).toEqual({
      errors: {
        name: "Field required",
        "layoutSetRef.layoutSetVersion": "Must be >= 1",
      },
    });
  });
});
