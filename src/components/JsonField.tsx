import type { ReactNode } from "react";
import { FunctionField, type RaRecord } from "react-admin";

import { RawJsonToggle } from "./RawJsonToggle";

interface JsonFieldProps {
  readonly label: string;
  readonly source: string;
  readonly collapsedByDefault?: boolean;
  readonly summary?: string;
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

function renderJson(
  value: unknown,
  collapsedByDefault: boolean,
  summary: string | undefined,
): ReactNode {
  return (
    <RawJsonToggle
      value={value}
      collapsedByDefault={collapsedByDefault}
      summary={summary}
      emptyState="-"
      maxWidth="72ch"
    />
  );
}

export function JsonField({
  label,
  source,
  collapsedByDefault = false,
  summary,
}: JsonFieldProps) {
  return (
    <FunctionField
      label={label}
      render={(record: RaRecord) =>
        renderJson(getValueByPath(record, source), collapsedByDefault, summary)
      }
    />
  );
}
