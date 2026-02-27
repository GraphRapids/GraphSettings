import { TextInput, type TextInputProps } from "react-admin";

import type { JsonValueType } from "./jsonValidation";

function formatJson(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function parseJson(value: string): unknown {
  if (value.trim().length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

interface JsonInputProps extends Omit<TextInputProps, "format" | "parse"> {
  readonly expectedType?: JsonValueType;
}

export function JsonInput({
  expectedType = "object",
  helperText,
  ...props
}: JsonInputProps) {
  const guidance =
    expectedType === "array" ? "Enter a JSON array" : "Enter a JSON object";

  return (
    <TextInput
      {...props}
      multiline
      minRows={8}
      format={formatJson}
      parse={parseJson}
      helperText={helperText ?? guidance}
      fullWidth
    />
  );
}
