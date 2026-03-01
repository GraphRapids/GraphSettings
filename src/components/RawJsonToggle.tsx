import { Box, Button, Stack, Typography } from "@mui/material";
import { useMemo, useState, type ReactNode } from "react";

interface RawJsonToggleProps {
  readonly value: unknown;
  readonly collapsedByDefault?: boolean;
  readonly summary?: string;
  readonly showRawLabel?: string;
  readonly hideRawLabel?: string;
  readonly emptyState?: ReactNode;
  readonly maxWidth?: string;
  readonly formatForRaw?: (value: unknown) => string;
}

function summarizeValue(value: unknown): string {
  if (Array.isArray(value)) {
    const count = value.length;
    return `${count} item${count === 1 ? "" : "s"}`;
  }

  if (value !== null && typeof value === "object") {
    const count = Object.keys(value as Record<string, unknown>).length;
    return `${count} field${count === 1 ? "" : "s"}`;
  }

  if (typeof value === "string") {
    const count = value.length;
    return `${count} character${count === 1 ? "" : "s"}`;
  }

  return String(value);
}

export function RawJsonToggle({
  value,
  collapsedByDefault = false,
  summary,
  showRawLabel = "See Raw",
  hideRawLabel = "Hide Raw",
  emptyState = null,
  maxWidth,
  formatForRaw,
}: RawJsonToggleProps) {
  const formattedValue = useMemo(() => {
    if (formatForRaw) {
      try {
        return formatForRaw(value);
      } catch {
        return String(value);
      }
    }

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [formatForRaw, value]);
  const [showRaw, setShowRaw] = useState(() => !collapsedByDefault);

  if (value === undefined) {
    return <>{emptyState}</>;
  }

  return (
    <Stack spacing={1}>
      {collapsedByDefault ? (
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          alignItems={{ sm: "center" }}
          justifyContent="space-between"
        >
          <Typography variant="body2" color="text.secondary">
            {summary ?? summarizeValue(value)}
          </Typography>
          <Button size="small" onClick={() => setShowRaw((current) => !current)}>
            {showRaw ? hideRawLabel : showRawLabel}
          </Button>
        </Stack>
      ) : null}

      {!collapsedByDefault || showRaw ? (
        <Box
          component="pre"
          sx={{
            mt: 0,
            mb: 0,
            p: 2,
            borderRadius: 1,
            overflowX: "auto",
            backgroundColor: "grey.100",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxWidth,
          }}
        >
          {formattedValue}
        </Box>
      ) : null}
    </Stack>
  );
}
