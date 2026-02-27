import { HttpError } from "react-admin";

import type { ErrorResponse, HttpValidationError, ValidationError } from "./scopedTypes";

interface ValidationErrorPayload {
  readonly message: string;
  readonly fieldErrors: Record<string, string>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidationError(value: unknown): value is ValidationError {
  if (!isObject(value)) {
    return false;
  }

  return (
    Array.isArray(value.loc) &&
    typeof value.msg === "string" &&
    typeof value.type === "string"
  );
}

function isHttpValidationError(value: unknown): value is HttpValidationError {
  if (!isObject(value)) {
    return false;
  }

  if (value.detail === undefined) {
    return false;
  }

  return Array.isArray(value.detail) && value.detail.every(isValidationError);
}

function isErrorResponse(value: unknown): value is ErrorResponse {
  if (!isObject(value) || !isObject(value.error)) {
    return false;
  }

  return typeof value.error.code === "string" && typeof value.error.message === "string";
}

function toFieldPath(loc: ValidationError["loc"]): string {
  const filtered = loc
    .map((segment) => String(segment))
    .filter((segment) => segment !== "body");

  if (filtered.length === 0) {
    return "root.serverError";
  }

  return filtered.join(".");
}

function parseValidationError(error: HttpValidationError): ValidationErrorPayload {
  const fieldErrors: Record<string, string> = {};

  for (const issue of error.detail ?? []) {
    const fieldPath = toFieldPath(issue.loc);
    fieldErrors[fieldPath] = issue.msg;
  }

  const message =
    Object.values(fieldErrors).at(0) ?? "Validation failed for this request.";

  return {
    message,
    fieldErrors,
  };
}

export function normalizeApiError(error: unknown, status = 500): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  if (isErrorResponse(error)) {
    return new HttpError(error.error.message, status, {
      code: error.error.code,
      details: error.error.details,
      errors: {
        "root.serverError": error.error.message,
      },
    });
  }

  if (isHttpValidationError(error)) {
    const parsed = parseValidationError(error);
    return new HttpError(parsed.message, status, {
      errors: parsed.fieldErrors,
    });
  }

  if (error instanceof Error) {
    return new HttpError(error.message, status, {
      errors: {
        "root.serverError": error.message,
      },
    });
  }

  return new HttpError("Unexpected API error", status, {
    errors: {
      "root.serverError": "Unexpected API error",
    },
  });
}
