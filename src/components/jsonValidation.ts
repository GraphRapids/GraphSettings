export type JsonValueType = "object" | "array";

function hasExpectedShape(value: unknown, expectedType: JsonValueType): boolean {
  if (expectedType === "array") {
    return Array.isArray(value);
  }

  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateJson(
  expectedType: JsonValueType,
  required = false,
): (value: unknown) => string | undefined {
  return (value: unknown): string | undefined => {
    if (value === undefined || value === null || value === "") {
      return required ? "Required" : undefined;
    }

    if (typeof value === "string") {
      return "Invalid JSON";
    }

    if (!hasExpectedShape(value, expectedType)) {
      return expectedType === "array" ? "Must be a JSON array" : "Must be a JSON object";
    }

    return undefined;
  };
}
