import type { ReactNode } from "react";
import { FunctionField, type RaRecord } from "react-admin";

interface JsonFieldProps {
  readonly label: string;
  readonly source: string;
}

function getValueByPath(record: RaRecord, path: string): unknown {
  const segments = path.split(".");
  let value: unknown = record;

  for (const segment of segments) {
    if (typeof value !== "object" || value === null || !(segment in value)) {
      return undefined;
    }

    value = (value as Record<string, unknown>)[segment];
  }

  return value;
}

function renderJson(value: unknown): ReactNode {
  if (value === undefined) {
    return "-";
  }

  return (
    <pre
      style={{
        margin: 0,
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        maxWidth: "72ch",
      }}
    >
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

export function JsonField({ label, source }: JsonFieldProps) {
  return (
    <FunctionField
      label={label}
      render={(record: RaRecord) => renderJson(getValueByPath(record, source))}
    />
  );
}
