import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  useNotify,
  useRecordContext,
  useRedirect,
  useRefresh,
  type RaRecord,
} from "react-admin";

import {
  scopedApiAdapter,
  type ResourceStage,
  type StageVersionQuery,
} from "../api/scopedApiAdapter";
import type {
  GraphTypeBundle,
  GraphTypeCreateRequest,
  GraphTypeUpdateRequest,
  IconSetBundle,
  IconSetCreateRequest,
  IconSetRecord,
  IconSetResolveRequest,
  IconSetSummary,
  IconSetUpdateRequest,
  LayoutSetBundle,
  LayoutSetCreateRequest,
  LayoutSetRecord,
  LayoutSetSummary,
  LayoutSetEntryUpsertRequest,
  LayoutSetUpdateRequest,
  LinkSetBundle,
  LinkSetCreateRequest,
  LinkSetRecord,
  LinkSetSummary,
  LinkSetEntryUpsertRequest,
  LinkSetUpdateRequest,
  PropertyCatalogResponse,
  PropertyDefinition,
  ThemeBundle,
  ThemeCreateRequest,
  ThemeRecord,
  ThemeSummary,
  ThemeUpdateRequest,
  ThemeVariableUpsertRequest,
} from "../api/scopedTypes";
import { RawJsonToggle } from "../components/RawJsonToggle";
import { CssMonacoEditor } from "../components/CssMonacoEditor";
import { JsonMonacoEditor } from "../components/JsonMonacoEditor";
import type { ScopedResourceName } from "./scopedResources";

type ResourceIdField =
  | "iconSetId"
  | "layoutSetId"
  | "linkSetId"
  | "graphTypeId"
  | "themeId";

interface BaseOperationProps {
  readonly resource: ScopedResourceName;
  readonly idField: ResourceIdField;
}

interface StageVersionState {
  readonly stage: ResourceStage;
  readonly version: string;
}

interface KeyValueRow {
  readonly id: number;
  readonly key: string;
  readonly value: string;
}

interface StringItemRow {
  readonly id: number;
  readonly value: string;
}

interface FlattenedLayoutPathRow {
  readonly path: string;
  readonly segments: string[];
  readonly value: unknown;
}

interface GraphLayoutSetRef {
  readonly layoutSetId: string;
  readonly layoutSetVersion: number;
}

interface GraphIconSetRef {
  readonly iconSetId: string;
  readonly iconSetVersion: number;
}

interface GraphLinkSetRef {
  readonly linkSetId: string;
  readonly linkSetVersion: number;
}

interface GraphIconSetRefRow {
  readonly rowId: number;
  readonly iconSetId: string;
  readonly iconSetVersion: number | null;
}

type LayoutValueKind = "string" | "number" | "boolean" | "null" | "object" | "array";

const stageOptions: ResourceStage[] = ["draft", "published"];
const conflictOptions: Array<"reject" | "first-wins" | "last-wins"> = [
  "reject",
  "first-wins",
  "last-wins",
];
const variableTypeOptions: ThemeVariableUpsertRequest["valueType"][] = [
  "color",
  "float",
  "length",
  "percent",
  "string",
  "custom",
];
const themeVariableEmptyDisplay = "—";
const linkEdgeMarkerStartPropertyKey = "graphrapids.edge.marker_start";
const linkEdgeStylePropertyKey = "graphrapids.edge.style";
const linkEdgeMarkerEndPropertyKey = "graphrapids.edge.marker_end";
const linkEdgeThicknessPropertyKey = "org.eclipse.elk.edge.thickness";
const linkEdgePropertyKeys = new Set<string>([
  linkEdgeMarkerStartPropertyKey,
  linkEdgeStylePropertyKey,
  linkEdgeMarkerEndPropertyKey,
  linkEdgeThicknessPropertyKey,
]);
const linkEdgeMarkerFallbackOptions = [
  "NONE",
  "OPEN_ARROW",
  "SOLID_ARROW",
  "HOLLOW_ARROW",
  "SOLID_DIAMOND",
  "HOLLOW_DIAMOND",
];
const linkEdgeStyleFallbackOptions = [
  "SOLID",
  "DASH",
  "DOT",
  "DASH_DOT",
  "LONG_DASH_DOT",
];
const linkSetKeyColumnSx = { width: "25%" };
const linkSetLabelColumnSx = { width: "25%" };
const linkSetPreviewColumnSx = { width: "50%", minWidth: 180 };

interface LinkEdgeSelection {
  readonly markerStart: string;
  readonly edgeStyle: string;
  readonly markerEnd: string;
  readonly thickness: number;
}

interface LinkEdgePropertyCatalog {
  readonly markerStartOptions: string[];
  readonly edgeStyleOptions: string[];
  readonly markerEndOptions: string[];
  readonly defaults: LinkEdgeSelection;
}

const defaultLinkEdgeSelection: LinkEdgeSelection = {
  markerStart: "NONE",
  edgeStyle: "SOLID",
  markerEnd: "NONE",
  thickness: 1,
};
const defaultLinkEdgePropertyCatalog: LinkEdgePropertyCatalog = {
  markerStartOptions: [...linkEdgeMarkerFallbackOptions],
  edgeStyleOptions: [...linkEdgeStyleFallbackOptions],
  markerEndOptions: [...linkEdgeMarkerFallbackOptions],
  defaults: defaultLinkEdgeSelection,
};

function dedupeStringValues(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (typeof candidate !== "string") {
      continue;
    }
    const normalized = candidate.trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduped.push(normalized);
  }

  return deduped.length > 0 ? deduped : [...fallback];
}

function resolveEdgePropertyDefinition(
  definitions: readonly PropertyDefinition[],
  propertyKey: string,
  fallbackOptions: readonly string[],
  fallbackDefault: string,
): { options: string[]; defaultValue: string } {
  const definition = definitions.find(
    (candidate) => candidate.key === propertyKey && candidate.valueType === "enum",
  );
  const options = dedupeStringValues(definition?.enumValues, fallbackOptions);
  const defaultCandidate =
    typeof definition?.defaultValue === "string"
      ? definition.defaultValue.trim()
      : fallbackDefault;
  const defaultValue = options.includes(defaultCandidate)
    ? defaultCandidate
    : (options[0] ?? fallbackDefault);

  return { options, defaultValue };
}

function normalizeEdgeThicknessValue(value: unknown, fallback: number): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : Number.NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function formatThicknessValue(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(2).replace(/\.?0+$/, "");
}

function resolveEdgeThicknessDefinition(definitions: readonly PropertyDefinition[]): number {
  const definition = definitions.find(
    (candidate) => candidate.key === linkEdgeThicknessPropertyKey && candidate.valueType === "number",
  );
  return normalizeEdgeThicknessValue(definition?.defaultValue, defaultLinkEdgeSelection.thickness);
}

function edgePropertyCatalogFromDefinitions(
  definitions: readonly PropertyDefinition[],
): LinkEdgePropertyCatalog {
  const markerStart = resolveEdgePropertyDefinition(
    definitions,
    linkEdgeMarkerStartPropertyKey,
    linkEdgeMarkerFallbackOptions,
    defaultLinkEdgeSelection.markerStart,
  );
  const edgeStyle = resolveEdgePropertyDefinition(
    definitions,
    linkEdgeStylePropertyKey,
    linkEdgeStyleFallbackOptions,
    defaultLinkEdgeSelection.edgeStyle,
  );
  const markerEnd = resolveEdgePropertyDefinition(
    definitions,
    linkEdgeMarkerEndPropertyKey,
    linkEdgeMarkerFallbackOptions,
    defaultLinkEdgeSelection.markerEnd,
  );
  const thickness = resolveEdgeThicknessDefinition(definitions);

  return {
    markerStartOptions: markerStart.options,
    edgeStyleOptions: edgeStyle.options,
    markerEndOptions: markerEnd.options,
    defaults: {
      markerStart: markerStart.defaultValue,
      edgeStyle: edgeStyle.defaultValue,
      markerEnd: markerEnd.defaultValue,
      thickness,
    },
  };
}

function edgePropertyCatalogFromResponse(payload: PropertyCatalogResponse): LinkEdgePropertyCatalog {
  const edgeDefinitions = payload.elements?.edge;
  return edgePropertyCatalogFromDefinitions(
    Array.isArray(edgeDefinitions) ? edgeDefinitions : [],
  );
}

function normalizeEdgePropertyValue(
  value: unknown,
  options: readonly string[],
  fallback: string,
): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized && options.includes(normalized)) {
    return normalized;
  }

  if (options.includes(fallback)) {
    return fallback;
  }
  return options[0] ?? fallback;
}

function linkEntryPropertiesRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function getLinkEntryEdgeSelection(
  entry: LinkSetEntryUpsertRequest,
  catalog: LinkEdgePropertyCatalog,
): LinkEdgeSelection {
  const properties = linkEntryPropertiesRecord(entry.elkProperties);
  return {
    markerStart: normalizeEdgePropertyValue(
      properties[linkEdgeMarkerStartPropertyKey],
      catalog.markerStartOptions,
      catalog.defaults.markerStart,
    ),
    edgeStyle: normalizeEdgePropertyValue(
      properties[linkEdgeStylePropertyKey],
      catalog.edgeStyleOptions,
      catalog.defaults.edgeStyle,
    ),
    markerEnd: normalizeEdgePropertyValue(
      properties[linkEdgeMarkerEndPropertyKey],
      catalog.markerEndOptions,
      catalog.defaults.markerEnd,
    ),
    thickness: normalizeEdgeThicknessValue(
      properties[linkEdgeThicknessPropertyKey],
      catalog.defaults.thickness,
    ),
  };
}

function toCustomLinkPropertyRows(entry: LinkSetEntryUpsertRequest): KeyValueRow[] {
  const properties = linkEntryPropertiesRecord(entry.elkProperties);
  return Object.entries(properties)
    .filter(([propertyKey]) => !linkEdgePropertyKeys.has(propertyKey))
    .map(([propertyKey, propertyValue], index) => ({
      id: Date.now() + index,
      key: propertyKey,
      value: formatValue(propertyValue),
    }));
}

function createLinkEntryWithEdgeDefaults(
  label: string,
  selection: LinkEdgeSelection,
): LinkSetEntryUpsertRequest {
  return {
    label,
    elkProperties: {
      [linkEdgeMarkerStartPropertyKey]: selection.markerStart,
      [linkEdgeStylePropertyKey]: selection.edgeStyle,
      [linkEdgeMarkerEndPropertyKey]: selection.markerEnd,
      [linkEdgeThicknessPropertyKey]: selection.thickness,
    },
  };
}

function buildLinkEntryPayload(
  label: string,
  selection: LinkEdgeSelection,
  rows: readonly KeyValueRow[],
): LinkSetEntryUpsertRequest {
  const properties: Record<string, unknown> = {
    [linkEdgeMarkerStartPropertyKey]: selection.markerStart,
    [linkEdgeStylePropertyKey]: selection.edgeStyle,
    [linkEdgeMarkerEndPropertyKey]: selection.markerEnd,
    [linkEdgeThicknessPropertyKey]: selection.thickness,
  };

  for (const row of rows) {
    const propertyKey = row.key.trim();
    if (propertyKey.length === 0 || linkEdgePropertyKeys.has(propertyKey)) {
      continue;
    }
    properties[propertyKey] = row.value;
  }

  return {
    label,
    elkProperties: properties,
  };
}

function edgeStyleDashArray(style: string): string | undefined {
  switch (style) {
    case "DASH":
      return "10 6";
    case "DOT":
      return "2 6";
    case "DASH_DOT":
      return "10 6 2 6";
    case "LONG_DASH_DOT":
      return "18 8 2 8";
    default:
      return undefined;
  }
}

function edgeMarkerLineOffset(markerType: string): number {
  switch (markerType) {
    case "OPEN_ARROW":
    case "SOLID_ARROW":
    case "HOLLOW_ARROW":
      return 8;
    case "SOLID_DIAMOND":
    case "HOLLOW_DIAMOND":
      return 10;
    default:
      return 0;
  }
}

function edgeEndpointMarker(
  markerType: string,
  x: number,
  y: number,
  side: "start" | "end",
  strokeWidth: number,
): ReactNode {
  const isStart = side === "start";
  const arrowBackX = isStart ? x + 8 : x - 8;
  const diamondNearX = isStart ? x + 5 : x - 5;
  const diamondFarX = isStart ? x + 10 : x - 10;
  const markerStrokeWidth = Math.max(1.6, Math.min(strokeWidth, 4));

  switch (markerType) {
    case "OPEN_ARROW":
      return (
        <polyline
          points={`${arrowBackX},${y - 6} ${x},${y} ${arrowBackX},${y + 6}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={markerStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    case "SOLID_ARROW":
      return (
        <polygon
          points={`${x},${y} ${arrowBackX},${y - 6} ${arrowBackX},${y + 6}`}
          fill="currentColor"
        />
      );
    case "HOLLOW_ARROW":
      return (
        <polygon
          points={`${x},${y} ${arrowBackX},${y - 6} ${arrowBackX},${y + 6}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={markerStrokeWidth}
          strokeLinejoin="round"
        />
      );
    case "SOLID_DIAMOND":
      return (
        <polygon
          points={`${x},${y} ${diamondNearX},${y - 5} ${diamondFarX},${y} ${diamondNearX},${y + 5}`}
          fill="currentColor"
        />
      );
    case "HOLLOW_DIAMOND":
      return (
        <polygon
          points={`${x},${y} ${diamondNearX},${y - 5} ${diamondFarX},${y} ${diamondNearX},${y + 5}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={markerStrokeWidth}
          strokeLinejoin="round"
        />
      );
    default:
      return null;
  }
}

function EdgePreview({
  markerStart,
  edgeStyle,
  markerEnd,
  thickness,
  compact = false,
}: {
  readonly markerStart: string;
  readonly edgeStyle: string;
  readonly markerEnd: string;
  readonly thickness: number;
  readonly compact?: boolean;
}) {
  const effectiveThickness = Math.max(0.5, Math.min(thickness, 12));
  const strokeDasharray = edgeStyleDashArray(edgeStyle);
  const lineY = 19;
  const startTipX = 18;
  const endTipX = 202;
  const lineStartX = startTipX + edgeMarkerLineOffset(markerStart);
  const lineEndX = endTipX - edgeMarkerLineOffset(markerEnd);

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        backgroundColor: "background.default",
        px: compact ? 1 : 1.5,
        py: compact ? 0.5 : 1,
      }}
    >
      <svg
        width="100%"
        height={compact ? 28 : 38}
        viewBox="0 0 220 38"
        role="img"
        aria-label="Selected edge preview"
      >
        <line
          x1={lineStartX}
          y1={lineY}
          x2={lineEndX}
          y2={lineY}
          stroke="currentColor"
          strokeWidth={effectiveThickness}
          strokeLinecap="round"
          strokeDasharray={strokeDasharray}
        />
        {edgeEndpointMarker(markerStart, startTipX, lineY, "start", effectiveThickness)}
        {edgeEndpointMarker(markerEnd, endTipX, lineY, "end", effectiveThickness)}
      </svg>
    </Box>
  );
}

function useLinkEdgePropertyCatalog(): {
  readonly catalog: LinkEdgePropertyCatalog;
  readonly loading: boolean;
} {
  const notify = useNotify();
  const [catalog, setCatalog] = useState<LinkEdgePropertyCatalog>(defaultLinkEdgePropertyCatalog);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      setLoading(true);
      try {
        const payload = await scopedApiAdapter.getPropertyCatalog("edge");
        if (!active) {
          return;
        }
        setCatalog(edgePropertyCatalogFromResponse(payload));
      } catch (error) {
        if (!active) {
          return;
        }
        notify(`Unable to load edge catalog; using fallback options. ${toErrorMessage(error)}`, {
          type: "warning",
        });
        setCatalog(defaultLinkEdgePropertyCatalog);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadCatalog();

    return () => {
      active = false;
    };
  }, [notify]);

  return { catalog, loading };
}

function isThemeVariableValueType(
  value: unknown,
): value is ThemeVariableUpsertRequest["valueType"] {
  return (
    typeof value === "string" &&
    (variableTypeOptions as readonly string[]).includes(value)
  );
}

function isColorThemeVariable(
  valueType: ThemeVariableUpsertRequest["valueType"],
): boolean {
  return valueType === "color";
}

function normalizeThemeVariableText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeThemeVariableEntry(value: unknown): ThemeVariableUpsertRequest | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const source = value as Record<string, unknown>;
  const valueType = source.valueType;
  if (!isThemeVariableValueType(valueType)) {
    return null;
  }

  if (isColorThemeVariable(valueType)) {
    return {
      valueType,
      lightValue: normalizeThemeVariableText(source.lightValue),
      darkValue: normalizeThemeVariableText(source.darkValue),
    };
  }

  return {
    valueType,
    value: normalizeThemeVariableText(source.value),
  };
}

function themeVariableDisplayValue(value: string | null | undefined): string {
  const normalized = normalizeThemeVariableText(value);
  return normalized.length > 0 ? normalized : themeVariableEmptyDisplay;
}

function toColorPickerValue(value: string): string {
  const normalized = normalizeThemeVariableText(value);
  const matched = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.exec(
    normalized,
  );
  if (!matched) {
    return "#000000";
  }

  const raw = matched[1] ?? "";
  if (!raw) {
    return "#000000";
  }
  if (raw.length === 3 || raw.length === 4) {
    const expanded = raw
      .split("")
      .map((segment) => `${segment}${segment}`)
      .join("");
    return `#${expanded.slice(0, 6).toLowerCase()}`;
  }

  return `#${raw.slice(0, 6).toLowerCase()}`;
}

function ThemeVariableColorValue({
  value,
}: {
  readonly value: string | null | undefined;
}): ReactNode {
  const display = themeVariableDisplayValue(value);
  if (display === themeVariableEmptyDisplay) {
    return display;
  }

  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Box
        data-testid="theme-color-swatch"
        sx={{
          width: 14,
          height: 14,
          borderRadius: 0.5,
          border: "1px solid",
          borderColor: "divider",
          backgroundColor: display,
          flexShrink: 0,
        }}
      />
      <Typography component="code" variant="body2">
        {display}
      </Typography>
    </Stack>
  );
}

function ThemeVariableColorInput({
  label,
  value,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (nextValue: string) => void;
}): ReactNode {
  return (
    <Stack spacing={1}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }}>
        <Box
          component="input"
          type="color"
          aria-label={`${label} Color Picker`}
          value={toColorPickerValue(value)}
          onChange={(event) => onChange((event.target as HTMLInputElement).value)}
          sx={{
            width: { xs: "100%", sm: 56 },
            minWidth: { sm: 56 },
            height: 40,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            backgroundColor: "background.paper",
            p: 0.5,
            cursor: "pointer",
          }}
        />
        <TextField
          label={`${label} Hex`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="#RRGGBB"
          fullWidth
          inputProps={{
            spellCheck: false,
            autoCapitalize: "none",
            autoCorrect: "off",
          }}
        />
      </Stack>
      <ThemeVariableColorValue value={value} />
    </Stack>
  );
}

function parseVersionOrThrow(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error("Version must be an integer greater than or equal to 1.");
  }

  return parsed;
}

function parseJsonOrThrow(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON.`);
  }
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Request failed.";
}

function formatValue(value: unknown): string {
  if (value === null) {
    return "null";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return JSON.stringify(value);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneUnknown(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => cloneUnknown(item));
  }

  if (isObjectRecord(value)) {
    const output: Record<string, unknown> = {};
    for (const [key, childValue] of Object.entries(value)) {
      output[key] = cloneUnknown(childValue);
    }
    return output;
  }

  return value;
}

function flattenLayoutObjectPaths(
  value: unknown,
  parentSegments: string[] = [],
): FlattenedLayoutPathRow[] {
  if (!isObjectRecord(value)) {
    return [];
  }

  const rows: FlattenedLayoutPathRow[] = [];
  const entries = Object.entries(value).sort((left, right) =>
    left[0].localeCompare(right[0]),
  );

  for (const [key, childValue] of entries) {
    const segments = [...parentSegments, key];
    if (isObjectRecord(childValue)) {
      const nested = flattenLayoutObjectPaths(childValue, segments);
      if (nested.length === 0) {
        rows.push({
          path: segments.join("."),
          segments,
          value: childValue,
        });
      } else {
        rows.push(...nested);
      }
      continue;
    }

    rows.push({
      path: segments.join("."),
      segments,
      value: childValue,
    });
  }

  return rows;
}

function setNestedLayoutValue(
  target: Record<string, unknown>,
  segments: string[],
  value: unknown,
) {
  let cursor = target;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === undefined) {
      return;
    }
    const isLast = index === segments.length - 1;
    if (isLast) {
      cursor[segment] = value;
      return;
    }

    const next = cursor[segment];
    if (!isObjectRecord(next)) {
      cursor[segment] = {};
    }

    cursor = cursor[segment] as Record<string, unknown>;
  }
}

function deleteNestedLayoutValue(target: Record<string, unknown>, segments: string[]) {
  if (segments.length === 0) {
    return;
  }

  const stack: Array<{ object: Record<string, unknown>; segment: string }> = [];
  let cursor = target;

  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    if (segment === undefined) {
      return;
    }
    const next = cursor[segment];
    if (!isObjectRecord(next)) {
      return;
    }
    stack.push({ object: cursor, segment });
    cursor = next;
  }

  const leaf = segments[segments.length - 1];
  if (leaf === undefined) {
    return;
  }
  delete cursor[leaf];

  for (let index = stack.length - 1; index >= 0; index -= 1) {
    const item = stack[index];
    if (!item) {
      continue;
    }
    const { object, segment } = item;
    const child = object[segment];
    if (isObjectRecord(child) && Object.keys(child).length === 0) {
      delete object[segment];
      continue;
    }
    break;
  }
}

function parseGraphLayoutSetRef(value: unknown): GraphLayoutSetRef | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  const layoutSetId = value.layoutSetId;
  const layoutSetVersion = value.layoutSetVersion;
  if (typeof layoutSetId !== "string" || typeof layoutSetVersion !== "number") {
    return null;
  }

  return { layoutSetId, layoutSetVersion };
}

function parseGraphLinkSetRef(value: unknown): GraphLinkSetRef | null {
  if (!isObjectRecord(value)) {
    return null;
  }

  const linkSetId = value.linkSetId;
  const linkSetVersion = value.linkSetVersion;
  if (typeof linkSetId !== "string" || typeof linkSetVersion !== "number") {
    return null;
  }

  return { linkSetId, linkSetVersion };
}

function parseGraphIconSetRefs(value: unknown): GraphIconSetRef[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isObjectRecord)
    .map((candidate) => ({
      iconSetId: candidate.iconSetId,
      iconSetVersion: candidate.iconSetVersion,
    }))
    .filter(
      (candidate): candidate is GraphIconSetRef =>
        typeof candidate.iconSetId === "string" &&
        typeof candidate.iconSetVersion === "number",
    );
}

function extractDraftName(record: unknown): string | null {
  if (!isObjectRecord(record)) {
    return null;
  }

  const topLevelName = record.name;
  if (typeof topLevelName === "string" && topLevelName.trim().length > 0) {
    return topLevelName;
  }

  const draft = record.draft;
  if (!isObjectRecord(draft)) {
    return null;
  }

  const draftName = draft.name;
  if (typeof draftName !== "string" || draftName.trim().length === 0) {
    return null;
  }

  return draftName;
}

function extractPublishedVersionNumbers(record: unknown, versionField: string): number[] {
  if (!isObjectRecord(record)) {
    return [];
  }

  const publishedVersions = record.publishedVersions;
  if (!Array.isArray(publishedVersions)) {
    return [];
  }

  const versions = publishedVersions
    .filter(isObjectRecord)
    .map((bundle) => bundle[versionField])
    .filter((value): value is number => typeof value === "number")
    .sort((left, right) => right - left);

  return [...new Set(versions)];
}

function renderLayoutTableValue(value: unknown): ReactNode {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return (
      <Box
        component="pre"
        sx={{
          my: 0,
          fontFamily: "monospace",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {JSON.stringify(value, null, 2)}
      </Box>
    );
  }

  return formatValue(value);
}

function kindFromLayoutValue(value: unknown): LayoutValueKind {
  if (value === null) {
    return "null";
  }
  if (Array.isArray(value)) {
    return "array";
  }

  switch (typeof value) {
    case "string":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "object":
      return "object";
    default:
      return "string";
  }
}

function defaultStageQuery(): StageVersionState {
  return {
    stage: "draft",
    version: "",
  };
}

function JsonPreview({
  value,
  collapsedByDefault = false,
}: {
  readonly value: unknown;
  readonly collapsedByDefault?: boolean;
}): ReactNode {
  if (value === null || value === undefined) {
    return null;
  }

  return <RawJsonToggle value={value} collapsedByDefault={collapsedByDefault} />;
}

function StageVersionControls({
  state,
  onChange,
}: {
  readonly state: StageVersionState;
  readonly onChange: (next: StageVersionState) => void;
}) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
      <TextField
        select
        label="Stage"
        value={state.stage}
        onChange={(event) =>
          onChange({
            ...state,
            stage: event.target.value as ResourceStage,
          })
        }
        size="small"
      >
        {stageOptions.map((stageOption) => (
          <MenuItem key={stageOption} value={stageOption}>
            {stageOption}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        label="Version (optional)"
        value={state.version}
        onChange={(event) =>
          onChange({
            ...state,
            version: event.target.value,
          })
        }
        placeholder="e.g. 2"
        size="small"
      />
    </Stack>
  );
}

function PanelError({ message }: { readonly message: string | null }) {
  if (!message) {
    return null;
  }

  return <Alert severity="error">{message}</Alert>;
}

function EmptyMessage({ text }: { readonly text: string }) {
  return (
    <Typography variant="body2" color="text.secondary">
      {text}
    </Typography>
  );
}

function SectionHeader({ title }: { readonly title: string }) {
  return (
    <Box
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: 1,
        backgroundColor: "action.hover",
        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
        {title}
      </Typography>
    </Box>
  );
}

function useOperationContext(idField: ResourceIdField) {
  const record = useRecordContext<RaRecord>();
  const notify = useNotify();
  const refresh = useRefresh();

  const resourceIdCandidate = record?.[idField];
  const resourceId =
    typeof resourceIdCandidate === "string" ? resourceIdCandidate : undefined;

  return {
    notify,
    refresh,
    resourceId,
  };
}

function normalizeIconEntries(value: unknown): Record<string, string> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const output: Record<string, string> = {};
  for (const [key, iconValue] of Object.entries(value as Record<string, unknown>)) {
    output[String(key)] = String(iconValue);
  }
  return output;
}

function normalizeLayoutEntries(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  return { ...(value as Record<string, unknown>) };
}

function normalizeLinkEntries(value: unknown): Record<string, LinkSetEntryUpsertRequest> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const output: Record<string, LinkSetEntryUpsertRequest> = {};
  for (const [key, definition] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof definition !== "object" ||
      definition === null ||
      Array.isArray(definition)
    ) {
      continue;
    }

    const source = definition as Record<string, unknown>;
    const label = String(source.label ?? "").trim();
    if (!label) {
      continue;
    }

    const normalized: LinkSetEntryUpsertRequest = { label };

    if (
      typeof source.elkProperties === "object" &&
      source.elkProperties !== null &&
      !Array.isArray(source.elkProperties)
    ) {
      normalized.elkProperties = {
        ...(source.elkProperties as Record<string, unknown>),
      };
    }

    output[String(key)] = normalized;
  }

  return output;
}

function normalizeThemeVariables(
  value: unknown,
): Record<string, ThemeVariableUpsertRequest> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }

  const output: Record<string, ThemeVariableUpsertRequest> = {};
  for (const [key, variable] of Object.entries(value as Record<string, unknown>)) {
    const normalized = normalizeThemeVariableEntry(variable);
    if (!normalized) {
      continue;
    }
    output[String(key)] = normalized;
  }

  return output;
}

function entriesToSortedRows(
  entries: Record<string, string>,
): Array<{ key: string; icon: string }> {
  return Object.entries(entries)
    .map(([key, icon]) => ({ key, icon }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function iconifySvgUrl(iconName: string): string {
  return `https://api.iconify.design/${encodeURIComponent(iconName)}.svg`;
}

function rgbCssToHex(color: string): string | null {
  const matched = color
    .replace(/\s+/g, "")
    .match(/^rgba?\((\d{1,3}),(\d{1,3}),(\d{1,3})(?:,[^)]+)?\)$/i);
  if (!matched) {
    return null;
  }

  const channels = matched.slice(1, 4).map((value) => {
    const parsed = Number(value);
    const clamped = Number.isFinite(parsed) ? Math.max(0, Math.min(255, parsed)) : 0;
    return clamped.toString(16).padStart(2, "0");
  });

  return `#${channels.join("")}`;
}

function normalizeIconPreviewColor(value: string, fallback: string): string {
  const normalized = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(normalized)) {
    return normalized;
  }

  const rgbHex = rgbCssToHex(normalized);
  if (rgbHex) {
    return rgbHex;
  }

  if (/^[a-z]+$/i.test(normalized)) {
    return normalized;
  }

  return fallback;
}

function iconifySvgUrlWithColor(iconName: string, color: string): string {
  const base = iconifySvgUrl(iconName);
  const query = `color=${encodeURIComponent(color)}`;
  return `${base}?${query}`;
}

function IconifyIconCell({ iconName }: { readonly iconName: string }) {
  const theme = useTheme();
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const fallbackColor = theme.palette.mode === "dark" ? "#ffffff" : "#111111";
  const iconColor = normalizeIconPreviewColor(theme.palette.text.primary, fallbackColor);
  const iconSrc = iconifySvgUrlWithColor(iconName, iconColor);

  if (failedSrc === iconSrc || iconName.trim().length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        n/a
      </Typography>
    );
  }

  return (
    <img
      src={iconSrc}
      alt={iconName}
      width={20}
      height={20}
      style={{ display: "block" }}
      loading="lazy"
      onError={() => setFailedSrc(iconSrc)}
    />
  );
}

function IconSelectionPreview({ iconName }: { readonly iconName: string }): ReactNode {
  const normalized = iconName.trim();

  return (
    <Stack direction="row" spacing={1} alignItems="center" data-testid="icon-selection-preview">
      <Typography variant="body2" color="text.secondary">
        Selected Icon:
      </Typography>
      <IconifyIconCell iconName={normalized} />
      <Typography
        component="code"
        variant="body2"
        data-testid="icon-selection-preview-value"
      >
        {normalized.length > 0 ? normalized : "n/a"}
      </Typography>
    </Stack>
  );
}

const DUMMY_ICON_ENTRY_KEY = "placeholder";
const DUMMY_ICON_ENTRY_NAME = "mdi:help-circle-outline";
const DUMMY_LAYOUT_SETTING_KEY = "placeholder.setting";
const DUMMY_LAYOUT_SETTING_VALUE = "placeholder";
const DUMMY_LINK_ENTRY_KEY = "placeholder";
const DUMMY_LINK_ENTRY_LABEL = "Placeholder";
const DUMMY_THEME_CSS_BODY = "/* Placeholder theme body */";

interface PublishedVersionOption {
  readonly version: number;
  readonly updatedAt: string;
  readonly entryCount: number;
}

export function IconSetCreateEditor() {
  const notify = useNotify();
  const redirect = useRedirect();
  const refresh = useRefresh();

  const [iconSetId, setIconSetId] = useState("");
  const [name, setName] = useState("");
  const [sourceIconSetId, setSourceIconSetId] = useState("");
  const [sourceVersion, setSourceVersion] = useState("");

  const [sourceOptions, setSourceOptions] = useState<IconSetSummary[]>([]);
  const [versionOptions, setVersionOptions] = useState<PublishedVersionOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSourceOptions = useCallback(async () => {
    setLoadingSources(true);
    try {
      const list = (await scopedApiAdapter.list("icon-sets")) as IconSetSummary[];
      const publishedSets = list
        .filter((item) => typeof item.publishedVersion === "number")
        .sort((left, right) => left.iconSetId.localeCompare(right.iconSetId));
      setSourceOptions(publishedSets);
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setLoadingSources(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadSourceOptions();
  }, [loadSourceOptions]);

  const loadSourceVersions = useCallback(async () => {
    if (!sourceIconSetId) {
      setVersionOptions([]);
      setSourceVersion("");
      return;
    }

    setLoadingVersions(true);
    try {
      const record = (await scopedApiAdapter.get(
        "icon-sets",
        sourceIconSetId,
      )) as IconSetRecord;
      const published = Array.isArray(record.publishedVersions)
        ? record.publishedVersions
        : [];
      const options = published
        .map((bundle) => ({
          version: bundle.iconSetVersion,
          updatedAt: bundle.updatedAt,
          entryCount: Object.keys(normalizeIconEntries(bundle.entries)).length,
        }))
        .sort((left, right) => right.version - left.version);
      setVersionOptions(options);
      const latestVersion = options[0]?.version;
      setSourceVersion(latestVersion !== undefined ? String(latestVersion) : "");
    } catch (error) {
      const message = toErrorMessage(error);
      setVersionOptions([]);
      setSourceVersion("");
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setLoadingVersions(false);
    }
  }, [notify, sourceIconSetId]);

  useEffect(() => {
    void loadSourceVersions();
  }, [loadSourceVersions]);

  const handleCreate = async () => {
    const normalizedId = iconSetId.trim();
    const normalizedName = name.trim();

    if (!normalizedId) {
      notify("Icon Set ID is required.", { type: "warning" });
      return;
    }
    if (!normalizedName) {
      notify("Name is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      let entries: Record<string, string> = {
        [DUMMY_ICON_ENTRY_KEY]: DUMMY_ICON_ENTRY_NAME,
      };
      let createMode = "with placeholder entry";

      if (sourceIconSetId) {
        const parsedVersion = Number(sourceVersion);
        if (!Number.isInteger(parsedVersion) || parsedVersion < 1) {
          throw new Error("Select a published source version.");
        }

        const sourceBundle = (await scopedApiAdapter.getBundle(
          "icon-sets",
          sourceIconSetId,
          {
            stage: "published",
            version: parsedVersion,
          },
        )) as IconSetBundle;
        entries = normalizeIconEntries(sourceBundle.entries);
        createMode = `from ${sourceIconSetId} v${parsedVersion}`;
      }

      const payload: IconSetCreateRequest = {
        iconSetId: normalizedId,
        name: normalizedName,
        entries,
      };
      const created = (await scopedApiAdapter.create(
        "icon-sets",
        payload,
      )) as IconSetRecord;
      refresh();
      notify(`Icon set '${created.iconSetId}' created ${createMode}.`, {
        type: "success",
      });
      redirect(`/icon-sets/${created.iconSetId}/edit`);
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Create Icon Set" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            No JSON needed. Optionally copy from a published icon-set version; otherwise a
            placeholder entry is added automatically.
          </Alert>
          <TextField
            label="Icon Set ID"
            value={iconSetId}
            onChange={(event) => setIconSetId(event.target.value)}
            placeholder="e.g. app-icons"
            fullWidth
            size="small"
          />
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. App Icons"
            fullWidth
            size="small"
          />
          <TextField
            select
            label="Start From"
            value={sourceIconSetId}
            onChange={(event) => setSourceIconSetId(event.target.value)}
            size="small"
            disabled={loadingSources}
            helperText="Optional: copy entries from a published icon-set."
          >
            <MenuItem value="">No source (use placeholder entry)</MenuItem>
            {sourceOptions.map((option) => (
              <MenuItem key={option.iconSetId} value={option.iconSetId}>
                {option.iconSetId} ({option.name})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Published Version"
            value={sourceVersion}
            onChange={(event) => setSourceVersion(event.target.value)}
            size="small"
            disabled={!sourceIconSetId || loadingVersions || versionOptions.length === 0}
            helperText={
              sourceIconSetId
                ? "Choose which published version to copy."
                : "Select a source icon-set first."
            }
          >
            {versionOptions.map((option) => (
              <MenuItem key={option.version} value={String(option.version)}>
                v{option.version} ({option.entryCount} entries)
              </MenuItem>
            ))}
          </TextField>

          <PanelError message={errorMessage} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" onClick={handleCreate} disabled={busy}>
              Create Icon Set
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setIconSetId("");
                setName("");
                setSourceIconSetId("");
                setSourceVersion("");
                setVersionOptions([]);
                setErrorMessage(null);
              }}
              disabled={busy}
            >
              Clear
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function IconSetPublishedView() {
  const { notify, resourceId } = useOperationContext("iconSetId");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bundle, setBundle] = useState<IconSetBundle | null>(null);

  const rows = useMemo(
    () => (bundle ? entriesToSortedRows(normalizeIconEntries(bundle.entries)) : []),
    [bundle],
  );

  const loadPublished = useCallback(async () => {
    if (!resourceId) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const payload = (await scopedApiAdapter.getBundle("icon-sets", resourceId, {
        stage: "published",
      })) as IconSetBundle;
      setBundle(payload);
    } catch (error) {
      const message = toErrorMessage(error);
      setBundle(null);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }, [notify, resourceId]);

  useEffect(() => {
    void loadPublished();
  }, [loadPublished]);

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Published Icon Set" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            This view shows only the latest published icon-set version.
          </Alert>
          <Button
            variant="outlined"
            onClick={loadPublished}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            Refresh Published Version
          </Button>
          <PanelError message={errorMessage} />

          {!bundle && !busy ? (
            <EmptyMessage text="No published version available yet." />
          ) : null}

          {bundle ? (
            <>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography variant="body2">
                  <strong>ID:</strong> {bundle.iconSetId}
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {bundle.name}
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography variant="body2">
                  <strong>Version:</strong> {bundle.iconSetVersion}
                </Typography>
                <Typography variant="body2">
                  <strong>Updated:</strong> {new Date(bundle.updatedAt).toLocaleString()}
                </Typography>
              </Stack>

              {rows.length === 0 ? (
                <EmptyMessage text="Published version contains no entries." />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Key</TableCell>
                      <TableCell>Icon</TableCell>
                      <TableCell>Icon Name</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>{row.key}</TableCell>
                        <TableCell>
                          <IconifyIconCell iconName={row.icon} />
                        </TableCell>
                        <TableCell>{row.icon}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              <RawJsonToggle
                value={bundle}
                collapsedByDefault
                summary={`Published bundle v${bundle.iconSetVersion}`}
              />
            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function IconSetDraftEditor() {
  const record = useRecordContext<RaRecord>();
  const { notify, refresh, resourceId } = useOperationContext("iconSetId");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [draftName, setDraftName] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [iconInput, setIconInput] = useState("");
  const appliedDraftSignatureRef = useRef<string | null>(null);

  const draftSignature = `${resourceId ?? ""}:${
    typeof record?.iconSetVersion === "number" ? record.iconSetVersion : ""
  }:${typeof record?.updatedAt === "string" ? record.updatedAt : ""}`;
  const rows = useMemo(() => entriesToSortedRows(entries), [entries]);

  useEffect(() => {
    if (appliedDraftSignatureRef.current === draftSignature) {
      return;
    }

    appliedDraftSignatureRef.current = draftSignature;
    setDraftName(typeof record?.name === "string" ? record.name : "");
    setEntries(normalizeIconEntries(record?.entries));
    setIsDirty(false);
    setErrorMessage(null);
  }, [draftSignature, record?.entries, record?.name]);

  const openCreate = () => {
    setEditingKey(null);
    setKeyInput("");
    setIconInput("");
    setDialogOpen(true);
  };

  const openEdit = (row: { key: string; icon: string }) => {
    setEditingKey(row.key);
    setKeyInput(row.key);
    setIconInput(row.icon);
    setDialogOpen(true);
  };

  const saveEntryLocal = () => {
    const normalizedKey = keyInput.trim();
    const normalizedIcon = iconInput.trim();
    if (normalizedKey.length === 0 || normalizedIcon.length === 0) {
      notify("Entry key and icon are required.", { type: "warning" });
      return;
    }

    setEntries((current) => {
      const next = { ...current };
      if (editingKey && editingKey !== normalizedKey) {
        delete next[editingKey];
      }
      next[normalizedKey] = normalizedIcon;
      return next;
    });
    setIsDirty(true);
    setDialogOpen(false);
  };

  const deleteEntryLocal = (entryKey: string) => {
    if (!window.confirm(`Delete entry '${entryKey}' from draft?`)) {
      return;
    }
    setEntries((current) => {
      const next = { ...current };
      delete next[entryKey];
      return next;
    });
    setIsDirty(true);
  };

  const resetDraftChanges = () => {
    setDraftName(typeof record?.name === "string" ? record.name : "");
    setEntries(normalizeIconEntries(record?.entries));
    setIsDirty(false);
    setErrorMessage(null);
  };

  const applyDraftFromRecord = (response: unknown): number | undefined => {
    const responseRecord =
      typeof response === "object" && response !== null
        ? (response as Record<string, unknown>)
        : {};
    const draft =
      typeof responseRecord.draft === "object" && responseRecord.draft !== null
        ? (responseRecord.draft as Record<string, unknown>)
        : {};

    if (typeof draft.name === "string") {
      setDraftName(draft.name);
    }
    setEntries(normalizeIconEntries(draft.entries));
    setIsDirty(false);

    return typeof draft.iconSetVersion === "number" ? draft.iconSetVersion : undefined;
  };

  const saveDraft = async () => {
    if (!resourceId) {
      return;
    }

    const normalizedName = draftName.trim();
    if (normalizedName.length === 0) {
      notify("Icon-set name is required.", { type: "warning" });
      return;
    }
    if (Object.keys(entries).length === 0) {
      notify("At least one entry is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const payload: IconSetUpdateRequest = {
        name: normalizedName,
        entries,
      };
      const response = await scopedApiAdapter.update("icon-sets", resourceId, payload);
      const savedVersion = applyDraftFromRecord(response);
      refresh();
      const version = savedVersion !== undefined ? ` (v${savedVersion})` : "";
      notify(`Draft saved${version}`, { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const publishDraft = async () => {
    if (!resourceId) {
      return;
    }

    const normalizedName = draftName.trim();
    if (normalizedName.length === 0) {
      notify("Icon-set name is required.", { type: "warning" });
      return;
    }
    if (Object.keys(entries).length === 0) {
      notify("At least one entry is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      if (isDirty) {
        const payload: IconSetUpdateRequest = {
          name: normalizedName,
          entries,
        };
        const response = await scopedApiAdapter.update("icon-sets", resourceId, payload);
        applyDraftFromRecord(response);
      }

      const published = (await scopedApiAdapter.publish(
        "icon-sets",
        resourceId,
      )) as IconSetBundle;
      refresh();
      notify(`Published v${published.iconSetVersion}`, { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Draft Entries Editor" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            Edit draft entries locally, then press Save Draft. Draft version is set
            automatically by the API.
          </Alert>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              onClick={openCreate}
              disabled={busy}
              startIcon={<AddIcon />}
            >
              Add Entry
            </Button>
            <Button
              variant="outlined"
              onClick={resetDraftChanges}
              disabled={busy || !isDirty}
            >
              Reset Changes
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={saveDraft}
              disabled={busy || !isDirty}
              startIcon={busy ? <CircularProgress size={16} /> : undefined}
            >
              Save Draft
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={publishDraft}
              disabled={busy}
            >
              Publish Draft
            </Button>
          </Stack>

          <PanelError message={errorMessage} />

          {rows.length === 0 ? (
            <EmptyMessage text="No draft entries. Add at least one entry." />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>Icon</TableCell>
                  <TableCell>Icon Name</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell>
                      <IconifyIconCell iconName={row.icon} />
                    </TableCell>
                    <TableCell>{row.icon}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteEntryLocal(row.key)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>{editingKey ? "Edit Icon Entry" : "Add Icon Entry"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Entry Key"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                fullWidth
              />
              <TextField
                label="Icon"
                value={iconInput}
                onChange={(event) => setIconInput(event.target.value)}
                fullWidth
              />
              <IconSelectionPreview iconName={iconInput} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEntryLocal} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface VersionCountOption {
  readonly version: number;
  readonly itemCount: number;
}

export function LayoutSetCreateEditor() {
  const notify = useNotify();
  const redirect = useRedirect();
  const refresh = useRefresh();

  const [layoutSetId, setLayoutSetId] = useState("");
  const [name, setName] = useState("");
  const [sourceLayoutSetId, setSourceLayoutSetId] = useState("");
  const [sourceVersion, setSourceVersion] = useState("");

  const [sourceOptions, setSourceOptions] = useState<LayoutSetSummary[]>([]);
  const [versionOptions, setVersionOptions] = useState<VersionCountOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSourceOptions = useCallback(async () => {
    setLoadingSources(true);
    try {
      const list = (await scopedApiAdapter.list("layout-sets")) as LayoutSetSummary[];
      const publishedSets = list
        .filter((item) => typeof item.publishedVersion === "number")
        .sort((left, right) => left.layoutSetId.localeCompare(right.layoutSetId));
      setSourceOptions(publishedSets);
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setLoadingSources(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadSourceOptions();
  }, [loadSourceOptions]);

  const loadSourceVersions = useCallback(async () => {
    if (!sourceLayoutSetId) {
      setVersionOptions([]);
      setSourceVersion("");
      return;
    }

    setLoadingVersions(true);
    try {
      const record = (await scopedApiAdapter.get(
        "layout-sets",
        sourceLayoutSetId,
      )) as LayoutSetRecord;
      const published = Array.isArray(record.publishedVersions)
        ? record.publishedVersions
        : [];
      const options = published
        .map((bundle) => ({
          version: bundle.layoutSetVersion,
          itemCount: Object.keys(normalizeLayoutEntries(bundle.elkSettings)).length,
        }))
        .sort((left, right) => right.version - left.version);
      setVersionOptions(options);
      const latestVersion = options[0]?.version;
      setSourceVersion(latestVersion !== undefined ? String(latestVersion) : "");
    } catch (error) {
      const message = toErrorMessage(error);
      setVersionOptions([]);
      setSourceVersion("");
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setLoadingVersions(false);
    }
  }, [notify, sourceLayoutSetId]);

  useEffect(() => {
    void loadSourceVersions();
  }, [loadSourceVersions]);

  const handleCreate = async () => {
    const normalizedId = layoutSetId.trim();
    const normalizedName = name.trim();

    if (!normalizedId) {
      notify("Layout Set ID is required.", { type: "warning" });
      return;
    }
    if (!normalizedName) {
      notify("Name is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      let elkSettings: Record<string, unknown> = {
        [DUMMY_LAYOUT_SETTING_KEY]: DUMMY_LAYOUT_SETTING_VALUE,
      };
      let createMode = "with placeholder settings";

      if (sourceLayoutSetId) {
        const parsedVersion = Number(sourceVersion);
        if (!Number.isInteger(parsedVersion) || parsedVersion < 1) {
          throw new Error("Select a published source version.");
        }

        const sourceBundle = (await scopedApiAdapter.getBundle(
          "layout-sets",
          sourceLayoutSetId,
          {
            stage: "published",
            version: parsedVersion,
          },
        )) as LayoutSetBundle;
        elkSettings = normalizeLayoutEntries(sourceBundle.elkSettings);
        createMode = `from ${sourceLayoutSetId} v${parsedVersion}`;
      }

      const payload: LayoutSetCreateRequest = {
        layoutSetId: normalizedId,
        name: normalizedName,
        elkSettings,
      };
      const created = (await scopedApiAdapter.create(
        "layout-sets",
        payload,
      )) as LayoutSetRecord;
      refresh();
      notify(`Layout set '${created.layoutSetId}' created ${createMode}.`, {
        type: "success",
      });
      redirect(`/layout-sets/${created.layoutSetId}/edit`);
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Create Layout Set" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            No JSON needed. Optionally copy from a published layout-set version; otherwise
            a placeholder setting is added automatically.
          </Alert>
          <TextField
            label="Layout Set ID"
            value={layoutSetId}
            onChange={(event) => setLayoutSetId(event.target.value)}
            placeholder="e.g. app-layout"
            fullWidth
            size="small"
          />
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. App Layout"
            fullWidth
            size="small"
          />
          <TextField
            select
            label="Start From"
            value={sourceLayoutSetId}
            onChange={(event) => setSourceLayoutSetId(event.target.value)}
            size="small"
            disabled={loadingSources}
            helperText="Optional: copy settings from a published layout-set."
          >
            <MenuItem value="">No source (use placeholder setting)</MenuItem>
            {sourceOptions.map((option) => (
              <MenuItem key={option.layoutSetId} value={option.layoutSetId}>
                {option.layoutSetId} ({option.name})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Published Version"
            value={sourceVersion}
            onChange={(event) => setSourceVersion(event.target.value)}
            size="small"
            disabled={
              !sourceLayoutSetId || loadingVersions || versionOptions.length === 0
            }
            helperText={
              sourceLayoutSetId
                ? "Choose which published version to copy."
                : "Select a source layout-set first."
            }
          >
            {versionOptions.map((option) => (
              <MenuItem key={option.version} value={String(option.version)}>
                v{option.version} ({option.itemCount} settings)
              </MenuItem>
            ))}
          </TextField>

          <PanelError message={errorMessage} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" onClick={handleCreate} disabled={busy}>
              Create Layout Set
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setLayoutSetId("");
                setName("");
                setSourceLayoutSetId("");
                setSourceVersion("");
                setVersionOptions([]);
                setErrorMessage(null);
              }}
              disabled={busy}
            >
              Clear
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function LayoutSetPublishedView() {
  const { notify, resourceId } = useOperationContext("layoutSetId");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bundle, setBundle] = useState<LayoutSetBundle | null>(null);

  const topLevelRows = useMemo(
    () =>
      bundle
        ? Object.entries(normalizeLayoutEntries(bundle.elkSettings))
            .filter(([, value]) => kindFromLayoutValue(value) !== "object")
            .map(([key, value]) => ({ key, value }))
            .sort((left, right) => left.key.localeCompare(right.key))
        : [],
    [bundle],
  );

  const objectSections = useMemo(
    () =>
      bundle
        ? Object.entries(normalizeLayoutEntries(bundle.elkSettings))
            .filter(([, value]) => kindFromLayoutValue(value) === "object")
            .map(([key, value]) => ({
              key,
              properties: flattenLayoutObjectPaths(value),
            }))
            .sort((left, right) => left.key.localeCompare(right.key))
        : [],
    [bundle],
  );

  const loadPublished = useCallback(async () => {
    if (!resourceId) {
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const payload = (await scopedApiAdapter.getBundle("layout-sets", resourceId, {
        stage: "published",
      })) as LayoutSetBundle;
      setBundle(payload);
    } catch (error) {
      const message = toErrorMessage(error);
      setBundle(null);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }, [notify, resourceId]);

  useEffect(() => {
    void loadPublished();
  }, [loadPublished]);

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Published Layout Set" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            This view shows only the latest published layout-set version.
          </Alert>
          <Button
            variant="outlined"
            onClick={loadPublished}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            Refresh Published Version
          </Button>
          <PanelError message={errorMessage} />

          {!bundle && !busy ? (
            <EmptyMessage text="No published version available yet." />
          ) : null}

          {bundle ? (
            <>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography variant="body2">
                  <strong>ID:</strong> {bundle.layoutSetId}
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {bundle.name}
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography variant="body2">
                  <strong>Version:</strong> {bundle.layoutSetVersion}
                </Typography>
                <Typography variant="body2">
                  <strong>Updated:</strong> {new Date(bundle.updatedAt).toLocaleString()}
                </Typography>
              </Stack>

              {topLevelRows.length === 0 && objectSections.length === 0 ? (
                <EmptyMessage text="Published version contains no settings." />
              ) : (
                <Stack spacing={2}>
                  <SectionHeader title="Top-Level Settings" />
                  {topLevelRows.length === 0 ? (
                    <EmptyMessage text="No non-object top-level settings." />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Key</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Value</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {topLevelRows.map((row) => (
                          <TableRow key={row.key}>
                            <TableCell>{row.key}</TableCell>
                            <TableCell>{kindFromLayoutValue(row.value)}</TableCell>
                            <TableCell>{renderLayoutTableValue(row.value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}

                  {objectSections.length > 0 ? <Divider /> : null}

                  {objectSections.map((section) => (
                    <Stack key={section.key} spacing={1}>
                      <SectionHeader title={section.key} />
                      {section.properties.length === 0 ? (
                        <EmptyMessage text="No properties in this section." />
                      ) : (
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Path</TableCell>
                              <TableCell>Type</TableCell>
                              <TableCell>Value</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {section.properties.map((property) => (
                              <TableRow key={`${section.key}:${property.path}`}>
                                <TableCell>{property.path}</TableCell>
                                <TableCell>
                                  {kindFromLayoutValue(property.value)}
                                </TableCell>
                                <TableCell>
                                  {renderLayoutTableValue(property.value)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </Stack>
                  ))}
                </Stack>
              )}

              <RawJsonToggle
                value={bundle}
                collapsedByDefault
                summary={`Published bundle v${bundle.layoutSetVersion}`}
              />
            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function LayoutSetDraftEditor() {
  const record = useRecordContext<RaRecord>();
  const { notify, refresh, resourceId } = useOperationContext("layoutSetId");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, unknown>>({});
  const [draftName, setDraftName] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [valueKind, setValueKind] = useState<LayoutValueKind>("string");
  const [stringValue, setStringValue] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [booleanValue, setBooleanValue] = useState(false);
  const [objectRows, setObjectRows] = useState<KeyValueRow[]>([]);
  const [arrayRows, setArrayRows] = useState<StringItemRow[]>([]);
  const [propertyDialogOpen, setPropertyDialogOpen] = useState(false);
  const [propertySectionKey, setPropertySectionKey] = useState<string | null>(null);
  const [propertySegments, setPropertySegments] = useState<string[]>([]);
  const [propertyPathLabel, setPropertyPathLabel] = useState("");
  const [propertyValueKind, setPropertyValueKind] = useState<LayoutValueKind>("string");
  const [propertyStringValue, setPropertyStringValue] = useState("");
  const [propertyNumberValue, setPropertyNumberValue] = useState("");
  const [propertyBooleanValue, setPropertyBooleanValue] = useState(false);
  const [propertyJsonValue, setPropertyJsonValue] = useState("{}");
  const appliedDraftSignatureRef = useRef<string | null>(null);

  const draftSignature = `${resourceId ?? ""}:${
    typeof record?.layoutSetVersion === "number" ? record.layoutSetVersion : ""
  }:${typeof record?.updatedAt === "string" ? record.updatedAt : ""}`;

  const topLevelRows = useMemo(
    () =>
      Object.entries(entries)
        .filter(([, value]) => kindFromLayoutValue(value) !== "object")
        .map(([key, value]) => ({ key, value }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    [entries],
  );

  const objectSections = useMemo(
    () =>
      Object.entries(entries)
        .filter(([, value]) => kindFromLayoutValue(value) === "object")
        .map(([key, value]) => ({
          key,
          properties: flattenLayoutObjectPaths(value),
        }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    [entries],
  );

  useEffect(() => {
    if (appliedDraftSignatureRef.current === draftSignature) {
      return;
    }

    appliedDraftSignatureRef.current = draftSignature;
    setDraftName(typeof record?.name === "string" ? record.name : "");
    setEntries(normalizeLayoutEntries(record?.elkSettings));
    setIsDirty(false);
    setErrorMessage(null);
  }, [draftSignature, record?.elkSettings, record?.name]);

  const resetValueInputs = () => {
    setValueKind("string");
    setStringValue("");
    setNumberValue("");
    setBooleanValue(false);
    setObjectRows([{ id: Date.now(), key: "", value: "" }]);
    setArrayRows([{ id: Date.now(), value: "" }]);
  };

  const applyValueToInputs = (value: unknown) => {
    const detectedKind = kindFromLayoutValue(value);
    setValueKind(detectedKind);

    if (detectedKind === "string") {
      setStringValue(String(value ?? ""));
      return;
    }

    if (detectedKind === "number") {
      setNumberValue(String(value));
      return;
    }

    if (detectedKind === "boolean") {
      setBooleanValue(Boolean(value));
      return;
    }

    if (detectedKind === "object") {
      const inputRows = Object.entries(value as Record<string, unknown>).map(
        ([entryKey, entryValue], index) => ({
          id: Date.now() + index,
          key: entryKey,
          value: formatValue(entryValue),
        }),
      );
      setObjectRows(
        inputRows.length > 0 ? inputRows : [{ id: Date.now(), key: "", value: "" }],
      );
      return;
    }

    if (detectedKind === "array") {
      const inputRows = (value as unknown[]).map((entryValue, index) => ({
        id: Date.now() + index,
        value: formatValue(entryValue),
      }));
      setArrayRows(inputRows.length > 0 ? inputRows : [{ id: Date.now(), value: "" }]);
    }
  };

  const openCreate = () => {
    setEditingKey(null);
    setKeyInput("");
    resetValueInputs();
    setDialogOpen(true);
  };

  const openEdit = (row: { key: string; value: unknown }) => {
    setEditingKey(row.key);
    setKeyInput(row.key);
    resetValueInputs();
    applyValueToInputs(row.value);
    setDialogOpen(true);
  };

  const addObjectRow = () => {
    setObjectRows((current) => [...current, { id: Date.now(), key: "", value: "" }]);
  };

  const addArrayRow = () => {
    setArrayRows((current) => [...current, { id: Date.now(), value: "" }]);
  };

  const buildValue = (): unknown => {
    switch (valueKind) {
      case "string":
        return stringValue;
      case "number": {
        const parsed = Number(numberValue);
        if (!Number.isFinite(parsed)) {
          throw new Error("Number value is invalid.");
        }
        return parsed;
      }
      case "boolean":
        return booleanValue;
      case "null":
        return null;
      case "object": {
        const output: Record<string, string> = {};
        for (const row of objectRows) {
          const key = row.key.trim();
          if (key.length === 0) {
            continue;
          }
          output[key] = row.value;
        }
        return output;
      }
      case "array":
        return arrayRows
          .map((row) => row.value)
          .filter((value) => value.trim().length > 0);
    }
  };

  const renameObjectSection = (sectionKey: string) => {
    const nextSectionKeyInput = window.prompt("Rename section key", sectionKey);
    if (nextSectionKeyInput === null) {
      return;
    }

    const nextSectionKey = nextSectionKeyInput.trim();
    if (nextSectionKey.length === 0) {
      notify("Section key is required.", { type: "warning" });
      return;
    }

    if (nextSectionKey === sectionKey) {
      return;
    }

    if (entries[nextSectionKey] !== undefined) {
      notify(`A setting with key '${nextSectionKey}' already exists.`, {
        type: "warning",
      });
      return;
    }

    setEntries((current) => {
      if (current[sectionKey] === undefined) {
        return current;
      }

      const next = { ...current };
      const sectionValue = next[sectionKey];
      delete next[sectionKey];
      next[nextSectionKey] = sectionValue;
      return next;
    });
    setIsDirty(true);
  };

  const deleteObjectSection = (sectionKey: string) => {
    if (!window.confirm(`Delete section '${sectionKey}' from draft?`)) {
      return;
    }

    setEntries((current) => {
      const next = { ...current };
      delete next[sectionKey];
      return next;
    });
    setIsDirty(true);
  };

  const addObjectProperty = (sectionKey: string) => {
    const propertyKeyInput = window.prompt(
      `Add property key to section '${sectionKey}'`,
      "",
    );
    if (propertyKeyInput === null) {
      return;
    }

    const propertyKey = propertyKeyInput.trim();
    if (propertyKey.length === 0) {
      notify("Property key is required.", { type: "warning" });
      return;
    }

    const sectionValue = normalizeLayoutEntries(entries[sectionKey]);
    if (sectionValue[propertyKey] !== undefined) {
      notify(`Property '${propertyKey}' already exists in '${sectionKey}'.`, {
        type: "warning",
      });
      return;
    }

    setEntries((current) => {
      const nextSection = cloneUnknown(
        normalizeLayoutEntries(current[sectionKey]),
      ) as Record<string, unknown>;
      nextSection[propertyKey] = "";
      return {
        ...current,
        [sectionKey]: nextSection,
      };
    });
    setIsDirty(true);
  };

  const openEditObjectProperty = (
    sectionKey: string,
    property: FlattenedLayoutPathRow,
  ) => {
    setPropertySectionKey(sectionKey);
    setPropertySegments(property.segments);
    setPropertyPathLabel(property.path);

    const detectedKind = kindFromLayoutValue(property.value);
    setPropertyValueKind(detectedKind);
    setPropertyStringValue("");
    setPropertyNumberValue("");
    setPropertyBooleanValue(false);
    setPropertyJsonValue("{}");

    if (detectedKind === "string") {
      setPropertyStringValue(String(property.value ?? ""));
    } else if (detectedKind === "number") {
      setPropertyNumberValue(String(property.value));
    } else if (detectedKind === "boolean") {
      setPropertyBooleanValue(Boolean(property.value));
    } else if (detectedKind === "array" || detectedKind === "object") {
      setPropertyJsonValue(JSON.stringify(property.value, null, 2));
    }

    setPropertyDialogOpen(true);
  };

  const buildPropertyValue = (): unknown => {
    switch (propertyValueKind) {
      case "string":
        return propertyStringValue;
      case "number": {
        const parsed = Number(propertyNumberValue);
        if (!Number.isFinite(parsed)) {
          throw new Error("Number value is invalid.");
        }
        return parsed;
      }
      case "boolean":
        return propertyBooleanValue;
      case "null":
        return null;
      case "array": {
        const parsed = parseJsonOrThrow(propertyJsonValue, "Array value");
        if (!Array.isArray(parsed)) {
          throw new Error("Array value must be valid JSON array.");
        }
        return parsed;
      }
      case "object": {
        const parsed = parseJsonOrThrow(propertyJsonValue, "Object value");
        if (!isObjectRecord(parsed)) {
          throw new Error("Object value must be valid JSON object.");
        }
        return parsed;
      }
    }
  };

  const saveObjectPropertyValue = () => {
    if (!propertySectionKey || propertySegments.length === 0) {
      return;
    }

    try {
      const nextValue = buildPropertyValue();
      setEntries((current) => {
        const next = { ...current };
        const section = cloneUnknown(
          normalizeLayoutEntries(current[propertySectionKey]),
        ) as Record<string, unknown>;
        setNestedLayoutValue(section, propertySegments, nextValue);
        next[propertySectionKey] = section;
        return next;
      });
      setPropertyDialogOpen(false);
      setIsDirty(true);
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    }
  };

  const deleteObjectProperty = (sectionKey: string, property: FlattenedLayoutPathRow) => {
    if (
      !window.confirm(`Delete property '${property.path}' from section '${sectionKey}'?`)
    ) {
      return;
    }

    setEntries((current) => {
      const section = cloneUnknown(normalizeLayoutEntries(current[sectionKey])) as Record<
        string,
        unknown
      >;
      deleteNestedLayoutValue(section, property.segments);
      return {
        ...current,
        [sectionKey]: section,
      };
    });
    setIsDirty(true);
  };

  const saveEntryLocal = () => {
    const normalizedKey = keyInput.trim();
    if (normalizedKey.length === 0) {
      notify("Entry key is required.", { type: "warning" });
      return;
    }

    try {
      const value = buildValue();
      setEntries((current) => {
        const next = { ...current };
        if (editingKey && editingKey !== normalizedKey) {
          delete next[editingKey];
        }
        next[normalizedKey] = value;
        return next;
      });
      setDialogOpen(false);
      setIsDirty(true);
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    }
  };

  const deleteEntryLocal = (entryKey: string) => {
    if (!window.confirm(`Delete entry '${entryKey}' from draft?`)) {
      return;
    }
    setEntries((current) => {
      const next = { ...current };
      delete next[entryKey];
      return next;
    });
    setIsDirty(true);
  };

  const resetDraftChanges = () => {
    setDraftName(typeof record?.name === "string" ? record.name : "");
    setEntries(normalizeLayoutEntries(record?.elkSettings));
    setIsDirty(false);
    setErrorMessage(null);
  };

  const applyDraftFromRecord = (response: unknown): number | undefined => {
    const responseRecord =
      typeof response === "object" && response !== null
        ? (response as Record<string, unknown>)
        : {};
    const draft =
      typeof responseRecord.draft === "object" && responseRecord.draft !== null
        ? (responseRecord.draft as Record<string, unknown>)
        : {};

    if (typeof draft.name === "string") {
      setDraftName(draft.name);
    }
    setEntries(normalizeLayoutEntries(draft.elkSettings));
    setIsDirty(false);

    return typeof draft.layoutSetVersion === "number"
      ? draft.layoutSetVersion
      : undefined;
  };

  const saveDraft = async () => {
    if (!resourceId) {
      return;
    }

    const normalizedName = draftName.trim();
    if (normalizedName.length === 0) {
      notify("Layout-set name is required.", { type: "warning" });
      return;
    }
    if (Object.keys(entries).length === 0) {
      notify("At least one setting is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const payload: LayoutSetUpdateRequest = {
        name: normalizedName,
        elkSettings: entries,
      };
      const response = await scopedApiAdapter.update("layout-sets", resourceId, payload);
      const savedVersion = applyDraftFromRecord(response);
      refresh();
      const version = savedVersion !== undefined ? ` (v${savedVersion})` : "";
      notify(`Draft saved${version}`, { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const publishDraft = async () => {
    if (!resourceId) {
      return;
    }

    const normalizedName = draftName.trim();
    if (normalizedName.length === 0) {
      notify("Layout-set name is required.", { type: "warning" });
      return;
    }
    if (Object.keys(entries).length === 0) {
      notify("At least one setting is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      if (isDirty) {
        const payload: LayoutSetUpdateRequest = {
          name: normalizedName,
          elkSettings: entries,
        };
        const response = await scopedApiAdapter.update(
          "layout-sets",
          resourceId,
          payload,
        );
        applyDraftFromRecord(response);
      }

      const published = (await scopedApiAdapter.publish(
        "layout-sets",
        resourceId,
      )) as LayoutSetBundle;
      refresh();
      notify(`Published v${published.layoutSetVersion}`, { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Draft Settings Editor" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            Edit draft settings locally, then save or publish. Object sections are shown
            with flat dotted paths to keep the table easy to scan.
          </Alert>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              onClick={openCreate}
              disabled={busy}
              startIcon={<AddIcon />}
            >
              Add Setting
            </Button>
            <Button
              variant="outlined"
              onClick={resetDraftChanges}
              disabled={busy || !isDirty}
            >
              Reset Changes
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={saveDraft}
              disabled={busy || !isDirty}
              startIcon={busy ? <CircularProgress size={16} /> : undefined}
            >
              Save Draft
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={publishDraft}
              disabled={busy}
            >
              Publish Draft
            </Button>
          </Stack>

          <PanelError message={errorMessage} />

          {topLevelRows.length === 0 && objectSections.length === 0 ? (
            <EmptyMessage text="No draft settings. Add at least one setting." />
          ) : (
            <Stack spacing={2}>
              <SectionHeader title="Top-Level Settings" />
              {topLevelRows.length === 0 ? (
                <EmptyMessage text="No non-object top-level settings." />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Key</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Value</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {topLevelRows.map((row) => (
                      <TableRow key={row.key}>
                        <TableCell>{row.key}</TableCell>
                        <TableCell>{kindFromLayoutValue(row.value)}</TableCell>
                        <TableCell>{renderLayoutTableValue(row.value)}</TableCell>
                        <TableCell align="right">
                          <Tooltip title="Edit">
                            <IconButton size="small" onClick={() => openEdit(row)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => deleteEntryLocal(row.key)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {objectSections.length > 0 ? <Divider /> : null}

              {objectSections.map((section) => (
                <Stack key={section.key} spacing={1}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    justifyContent="space-between"
                    alignItems={{ sm: "center" }}
                  >
                    <SectionHeader title={section.key} />
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => renameObjectSection(section.key)}
                        disabled={busy}
                      >
                        Rename Section
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => addObjectProperty(section.key)}
                        disabled={busy}
                      >
                        Add Property
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        variant="outlined"
                        onClick={() => deleteObjectSection(section.key)}
                        disabled={busy}
                      >
                        Delete Section
                      </Button>
                    </Stack>
                  </Stack>

                  {section.properties.length === 0 ? (
                    <EmptyMessage text="No properties in this section." />
                  ) : (
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Path</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Value</TableCell>
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {section.properties.map((property) => (
                          <TableRow key={`${section.key}:${property.path}`}>
                            <TableCell>{property.path}</TableCell>
                            <TableCell>{kindFromLayoutValue(property.value)}</TableCell>
                            <TableCell>
                              {renderLayoutTableValue(property.value)}
                            </TableCell>
                            <TableCell align="right">
                              <Tooltip title="Edit property value">
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    openEditObjectProperty(section.key, property)
                                  }
                                >
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Delete property">
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() =>
                                    deleteObjectProperty(section.key, property)
                                  }
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </Stack>
              ))}
            </Stack>
          )}
        </Stack>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>{editingKey ? "Edit Setting" : "Add Setting"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Setting Key"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                fullWidth
              />

              <TextField
                select
                label="Value Type"
                value={valueKind}
                onChange={(event) => setValueKind(event.target.value as LayoutValueKind)}
                fullWidth
              >
                <MenuItem value="string">String</MenuItem>
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="boolean">Boolean</MenuItem>
                <MenuItem value="null">Null</MenuItem>
                <MenuItem value="object">Object (property table)</MenuItem>
                <MenuItem value="array">Array (item table)</MenuItem>
              </TextField>

              {valueKind === "string" && (
                <TextField
                  label="String Value"
                  value={stringValue}
                  onChange={(event) => setStringValue(event.target.value)}
                  fullWidth
                />
              )}

              {valueKind === "number" && (
                <TextField
                  label="Number Value"
                  value={numberValue}
                  onChange={(event) => setNumberValue(event.target.value)}
                  fullWidth
                />
              )}

              {valueKind === "boolean" && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={booleanValue}
                      onChange={(event) => setBooleanValue(event.target.checked)}
                    />
                  }
                  label="Boolean Value"
                />
              )}

              {valueKind === "null" && (
                <Typography variant="body2" color="text.secondary">
                  This value will be stored as null.
                </Typography>
              )}

              {valueKind === "object" && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Object Properties</Typography>
                  {objectRows.map((row) => (
                    <Stack
                      key={row.id}
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                    >
                      <TextField
                        label="Property"
                        value={row.key}
                        onChange={(event) =>
                          setObjectRows((current) =>
                            current.map((candidate) =>
                              candidate.id === row.id
                                ? { ...candidate, key: event.target.value }
                                : candidate,
                            ),
                          )
                        }
                        fullWidth
                      />
                      <TextField
                        label="Value"
                        value={row.value}
                        onChange={(event) =>
                          setObjectRows((current) =>
                            current.map((candidate) =>
                              candidate.id === row.id
                                ? { ...candidate, value: event.target.value }
                                : candidate,
                            ),
                          )
                        }
                        fullWidth
                      />
                      <IconButton
                        color="error"
                        onClick={() =>
                          setObjectRows((current) =>
                            current.length > 1
                              ? current.filter((candidate) => candidate.id !== row.id)
                              : current,
                          )
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button
                    variant="outlined"
                    onClick={addObjectRow}
                    startIcon={<AddIcon />}
                  >
                    Add Property
                  </Button>
                </Stack>
              )}

              {valueKind === "array" && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Array Items</Typography>
                  {arrayRows.map((row) => (
                    <Stack
                      key={row.id}
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                    >
                      <TextField
                        label="Item"
                        value={row.value}
                        onChange={(event) =>
                          setArrayRows((current) =>
                            current.map((candidate) =>
                              candidate.id === row.id
                                ? { ...candidate, value: event.target.value }
                                : candidate,
                            ),
                          )
                        }
                        fullWidth
                      />
                      <IconButton
                        color="error"
                        onClick={() =>
                          setArrayRows((current) =>
                            current.length > 1
                              ? current.filter((candidate) => candidate.id !== row.id)
                              : current,
                          )
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button
                    variant="outlined"
                    onClick={addArrayRow}
                    startIcon={<AddIcon />}
                  >
                    Add Item
                  </Button>
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEntryLocal} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={propertyDialogOpen}
          onClose={() => setPropertyDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Edit Property Value</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Path" value={propertyPathLabel} disabled fullWidth />
              <TextField
                select
                label="Value Type"
                value={propertyValueKind}
                onChange={(event) =>
                  setPropertyValueKind(event.target.value as LayoutValueKind)
                }
                fullWidth
              >
                <MenuItem value="string">String</MenuItem>
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="boolean">Boolean</MenuItem>
                <MenuItem value="null">Null</MenuItem>
                <MenuItem value="object">Object (JSON)</MenuItem>
                <MenuItem value="array">Array (JSON)</MenuItem>
              </TextField>

              {propertyValueKind === "string" && (
                <TextField
                  label="String Value"
                  value={propertyStringValue}
                  onChange={(event) => setPropertyStringValue(event.target.value)}
                  fullWidth
                />
              )}

              {propertyValueKind === "number" && (
                <TextField
                  label="Number Value"
                  value={propertyNumberValue}
                  onChange={(event) => setPropertyNumberValue(event.target.value)}
                  fullWidth
                />
              )}

              {propertyValueKind === "boolean" && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={propertyBooleanValue}
                      onChange={(event) => setPropertyBooleanValue(event.target.checked)}
                    />
                  }
                  label="Boolean Value"
                />
              )}

              {propertyValueKind === "null" && (
                <Typography variant="body2" color="text.secondary">
                  This value will be stored as null.
                </Typography>
              )}

              {(propertyValueKind === "object" || propertyValueKind === "array") && (
                <JsonMonacoEditor
                  label={propertyValueKind === "object" ? "Object JSON" : "Array JSON"}
                  value={propertyJsonValue}
                  onChange={setPropertyJsonValue}
                  minHeight={960}
                  testId="layout-property-json-editor"
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPropertyDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveObjectPropertyValue} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function LinkSetCreateEditor() {
  const notify = useNotify();
  const redirect = useRedirect();
  const refresh = useRefresh();
  const { catalog: edgeCatalog } = useLinkEdgePropertyCatalog();

  const [linkSetId, setLinkSetId] = useState("");
  const [name, setName] = useState("");
  const [sourceLinkSetId, setSourceLinkSetId] = useState("");
  const [sourceVersion, setSourceVersion] = useState("");

  const [sourceOptions, setSourceOptions] = useState<LinkSetSummary[]>([]);
  const [versionOptions, setVersionOptions] = useState<VersionCountOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadSourceOptions = useCallback(async () => {
    setLoadingSources(true);
    try {
      const list = (await scopedApiAdapter.list("link-sets")) as LinkSetSummary[];
      const publishedSets = list
        .filter((item) => typeof item.publishedVersion === "number")
        .sort((left, right) => left.linkSetId.localeCompare(right.linkSetId));
      setSourceOptions(publishedSets);
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setLoadingSources(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadSourceOptions();
  }, [loadSourceOptions]);

  const loadSourceVersions = useCallback(async () => {
    if (!sourceLinkSetId) {
      setVersionOptions([]);
      setSourceVersion("");
      return;
    }

    setLoadingVersions(true);
    try {
      const record = (await scopedApiAdapter.get(
        "link-sets",
        sourceLinkSetId,
      )) as LinkSetRecord;
      const published = Array.isArray(record.publishedVersions)
        ? record.publishedVersions
        : [];
      const options = published
        .map((bundle) => ({
          version: bundle.linkSetVersion,
          itemCount: Object.keys(normalizeLinkEntries(bundle.entries)).length,
        }))
        .sort((left, right) => right.version - left.version);
      setVersionOptions(options);
      const latestVersion = options[0]?.version;
      setSourceVersion(latestVersion !== undefined ? String(latestVersion) : "");
    } catch (error) {
      const message = toErrorMessage(error);
      setVersionOptions([]);
      setSourceVersion("");
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setLoadingVersions(false);
    }
  }, [notify, sourceLinkSetId]);

  useEffect(() => {
    void loadSourceVersions();
  }, [loadSourceVersions]);

  const handleCreate = async () => {
    const normalizedId = linkSetId.trim();
    const normalizedName = name.trim();

    if (!normalizedId) {
      notify("Link Set ID is required.", { type: "warning" });
      return;
    }
    if (!normalizedName) {
      notify("Name is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      let entries: Record<string, LinkSetEntryUpsertRequest> = {
        [DUMMY_LINK_ENTRY_KEY]: createLinkEntryWithEdgeDefaults(
          DUMMY_LINK_ENTRY_LABEL,
          edgeCatalog.defaults,
        ),
      };
      let createMode = "with placeholder entry";

      if (sourceLinkSetId) {
        const parsedVersion = Number(sourceVersion);
        if (!Number.isInteger(parsedVersion) || parsedVersion < 1) {
          throw new Error("Select a published source version.");
        }

        const sourceBundle = (await scopedApiAdapter.getBundle(
          "link-sets",
          sourceLinkSetId,
          {
            stage: "published",
            version: parsedVersion,
          },
        )) as LinkSetBundle;
        entries = normalizeLinkEntries(sourceBundle.entries);
        createMode = `from ${sourceLinkSetId} v${parsedVersion}`;
      }

      const payload: LinkSetCreateRequest = {
        linkSetId: normalizedId,
        name: normalizedName,
        entries,
      };
      const created = (await scopedApiAdapter.create(
        "link-sets",
        payload,
      )) as LinkSetRecord;
      refresh();
      notify(`Link set '${created.linkSetId}' created ${createMode}.`, {
        type: "success",
      });
      redirect(`/link-sets/${created.linkSetId}/edit`);
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Create Link Set" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            No JSON needed. Optionally copy from a published link-set version; otherwise a
            placeholder entry is added automatically.
          </Alert>
          <TextField
            label="Link Set ID"
            value={linkSetId}
            onChange={(event) => setLinkSetId(event.target.value)}
            placeholder="e.g. app-links"
            fullWidth
            size="small"
          />
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. App Links"
            fullWidth
            size="small"
          />
          <TextField
            select
            label="Start From"
            value={sourceLinkSetId}
            onChange={(event) => setSourceLinkSetId(event.target.value)}
            size="small"
            disabled={loadingSources}
            helperText="Optional: copy entries from a published link-set."
          >
            <MenuItem value="">No source (use placeholder entry)</MenuItem>
            {sourceOptions.map((option) => (
              <MenuItem key={option.linkSetId} value={option.linkSetId}>
                {option.linkSetId} ({option.name})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Published Version"
            value={sourceVersion}
            onChange={(event) => setSourceVersion(event.target.value)}
            size="small"
            disabled={!sourceLinkSetId || loadingVersions || versionOptions.length === 0}
            helperText={
              sourceLinkSetId
                ? "Choose which published version to copy."
                : "Select a source link-set first."
            }
          >
            {versionOptions.map((option) => (
              <MenuItem key={option.version} value={String(option.version)}>
                v{option.version} ({option.itemCount} entries)
              </MenuItem>
            ))}
          </TextField>

          <PanelError message={errorMessage} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" onClick={handleCreate} disabled={busy}>
              Create Link Set
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setLinkSetId("");
                setName("");
                setSourceLinkSetId("");
                setSourceVersion("");
                setVersionOptions([]);
                setErrorMessage(null);
              }}
              disabled={busy}
            >
              Clear
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function LinkSetPublishedView() {
  const { notify, resourceId } = useOperationContext("linkSetId");
  const { catalog: edgeCatalog } = useLinkEdgePropertyCatalog();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bundle, setBundle] = useState<LinkSetBundle | null>(null);

  const rows = useMemo(
    () =>
      bundle
        ? Object.entries(normalizeLinkEntries(bundle.entries))
            .map(([key, value]) => ({ key, value }))
            .sort((left, right) => left.key.localeCompare(right.key))
        : [],
    [bundle],
  );

  const loadPublished = useCallback(async () => {
    if (!resourceId) {
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const payload = (await scopedApiAdapter.getBundle("link-sets", resourceId, {
        stage: "published",
      })) as LinkSetBundle;
      setBundle(payload);
    } catch (error) {
      const message = toErrorMessage(error);
      setBundle(null);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }, [notify, resourceId]);

  useEffect(() => {
    void loadPublished();
  }, [loadPublished]);

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Published Link Set" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            This view shows only the latest published link-set version.
          </Alert>
          <Button
            variant="outlined"
            onClick={loadPublished}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            Refresh Published Version
          </Button>
          <PanelError message={errorMessage} />

          {!bundle && !busy ? (
            <EmptyMessage text="No published version available yet." />
          ) : null}

          {bundle ? (
            <>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography variant="body2">
                  <strong>ID:</strong> {bundle.linkSetId}
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {bundle.name}
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography variant="body2">
                  <strong>Version:</strong> {bundle.linkSetVersion}
                </Typography>
                <Typography variant="body2">
                  <strong>Updated:</strong> {new Date(bundle.updatedAt).toLocaleString()}
                </Typography>
              </Stack>

              {rows.length === 0 ? (
                <EmptyMessage text="Published version contains no entries." />
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={linkSetKeyColumnSx}>Key</TableCell>
                      <TableCell sx={linkSetLabelColumnSx}>Label</TableCell>
                      <TableCell sx={linkSetPreviewColumnSx}>Edge Preview</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row) => {
                      const edgeSelection = getLinkEntryEdgeSelection(row.value, edgeCatalog);
                      return (
                        <TableRow key={row.key}>
                          <TableCell sx={linkSetKeyColumnSx}>{row.key}</TableCell>
                          <TableCell sx={linkSetLabelColumnSx}>{row.value.label}</TableCell>
                          <TableCell sx={linkSetPreviewColumnSx}>
                            <EdgePreview
                              markerStart={edgeSelection.markerStart}
                              edgeStyle={edgeSelection.edgeStyle}
                              markerEnd={edgeSelection.markerEnd}
                              thickness={edgeSelection.thickness}
                              compact
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              <RawJsonToggle
                value={bundle}
                collapsedByDefault
                summary={`Published bundle v${bundle.linkSetVersion}`}
              />
            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function LinkSetDraftEditor() {
  const record = useRecordContext<RaRecord>();
  const { notify, refresh, resourceId } = useOperationContext("linkSetId");
  const { catalog: edgeCatalog, loading: loadingEdgeCatalog } = useLinkEdgePropertyCatalog();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, LinkSetEntryUpsertRequest>>({});
  const [draftName, setDraftName] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [markerStartInput, setMarkerStartInput] = useState(
    defaultLinkEdgeSelection.markerStart,
  );
  const [edgeStyleInput, setEdgeStyleInput] = useState(defaultLinkEdgeSelection.edgeStyle);
  const [markerEndInput, setMarkerEndInput] = useState(defaultLinkEdgeSelection.markerEnd);
  const [thicknessInput, setThicknessInput] = useState(
    formatThicknessValue(defaultLinkEdgeSelection.thickness),
  );
  const [propertiesRows, setPropertiesRows] = useState<KeyValueRow[]>([]);
  const appliedDraftSignatureRef = useRef<string | null>(null);

  const draftSignature = `${resourceId ?? ""}:${
    typeof record?.linkSetVersion === "number" ? record.linkSetVersion : ""
  }:${typeof record?.updatedAt === "string" ? record.updatedAt : ""}`;

  const rows = useMemo(
    () =>
      Object.entries(entries)
        .map(([key, value]) => ({ key, value }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    [entries],
  );

  useEffect(() => {
    setMarkerStartInput((current) =>
      normalizeEdgePropertyValue(
        current,
        edgeCatalog.markerStartOptions,
        edgeCatalog.defaults.markerStart,
      ),
    );
    setEdgeStyleInput((current) =>
      normalizeEdgePropertyValue(
        current,
        edgeCatalog.edgeStyleOptions,
        edgeCatalog.defaults.edgeStyle,
      ),
    );
    setMarkerEndInput((current) =>
      normalizeEdgePropertyValue(
        current,
        edgeCatalog.markerEndOptions,
        edgeCatalog.defaults.markerEnd,
      ),
    );
    setThicknessInput((current) =>
      formatThicknessValue(
        normalizeEdgeThicknessValue(current, edgeCatalog.defaults.thickness),
      ),
    );
  }, [edgeCatalog]);

  useEffect(() => {
    if (appliedDraftSignatureRef.current === draftSignature) {
      return;
    }
    appliedDraftSignatureRef.current = draftSignature;
    setDraftName(typeof record?.name === "string" ? record.name : "");
    setEntries(normalizeLinkEntries(record?.entries));
    setIsDirty(false);
    setErrorMessage(null);
  }, [draftSignature, record?.entries, record?.name]);

  const resetForm = () => {
    setLabelInput("");
    setMarkerStartInput(edgeCatalog.defaults.markerStart);
    setEdgeStyleInput(edgeCatalog.defaults.edgeStyle);
    setMarkerEndInput(edgeCatalog.defaults.markerEnd);
    setThicknessInput(formatThicknessValue(edgeCatalog.defaults.thickness));
    setPropertiesRows([{ id: Date.now(), key: "", value: "" }]);
  };

  const openCreate = () => {
    setEditingKey(null);
    setKeyInput("");
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (row: { key: string; value: LinkSetEntryUpsertRequest }) => {
    setEditingKey(row.key);
    setKeyInput(row.key);
    setLabelInput(row.value.label);
    const edgeSelection = getLinkEntryEdgeSelection(row.value, edgeCatalog);
    setMarkerStartInput(edgeSelection.markerStart);
    setEdgeStyleInput(edgeSelection.edgeStyle);
    setMarkerEndInput(edgeSelection.markerEnd);
    setThicknessInput(formatThicknessValue(edgeSelection.thickness));

    const mappedRows = toCustomLinkPropertyRows(row.value);

    setPropertiesRows(
      mappedRows.length > 0 ? mappedRows : [{ id: Date.now(), key: "", value: "" }],
    );
    setDialogOpen(true);
  };

  const addPropertyRow = () => {
    setPropertiesRows((current) => [...current, { id: Date.now(), key: "", value: "" }]);
  };

  const saveEntryLocal = () => {
    const normalizedKey = keyInput.trim();
    const normalizedLabel = labelInput.trim();
    if (normalizedKey.length === 0 || normalizedLabel.length === 0) {
      notify("Entry key and label are required.", { type: "warning" });
      return;
    }

    const payload = buildLinkEntryPayload(
      normalizedLabel,
      {
        markerStart: markerStartInput,
        edgeStyle: edgeStyleInput,
        markerEnd: markerEndInput,
        thickness: normalizeEdgeThicknessValue(thicknessInput, edgeCatalog.defaults.thickness),
      },
      propertiesRows,
    );

    setEntries((current) => {
      const next = { ...current };
      if (editingKey && editingKey !== normalizedKey) {
        delete next[editingKey];
      }
      next[normalizedKey] = payload;
      return next;
    });
    setDialogOpen(false);
    setIsDirty(true);
  };

  const deleteEntryLocal = (entryKey: string) => {
    if (!window.confirm(`Delete entry '${entryKey}' from draft?`)) {
      return;
    }
    setEntries((current) => {
      const next = { ...current };
      delete next[entryKey];
      return next;
    });
    setIsDirty(true);
  };

  const resetDraftChanges = () => {
    setDraftName(typeof record?.name === "string" ? record.name : "");
    setEntries(normalizeLinkEntries(record?.entries));
    setIsDirty(false);
    setErrorMessage(null);
  };

  const applyDraftFromRecord = (response: unknown): number | undefined => {
    const responseRecord =
      typeof response === "object" && response !== null
        ? (response as Record<string, unknown>)
        : {};
    const draft =
      typeof responseRecord.draft === "object" && responseRecord.draft !== null
        ? (responseRecord.draft as Record<string, unknown>)
        : {};

    if (typeof draft.name === "string") {
      setDraftName(draft.name);
    }
    setEntries(normalizeLinkEntries(draft.entries));
    setIsDirty(false);

    return typeof draft.linkSetVersion === "number" ? draft.linkSetVersion : undefined;
  };

  const saveDraft = async () => {
    if (!resourceId) {
      return;
    }
    const normalizedName = draftName.trim();
    if (normalizedName.length === 0) {
      notify("Link-set name is required.", { type: "warning" });
      return;
    }
    if (Object.keys(entries).length === 0) {
      notify("At least one entry is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const payload: LinkSetUpdateRequest = {
        name: normalizedName,
        entries,
      };
      const response = await scopedApiAdapter.update("link-sets", resourceId, payload);
      const savedVersion = applyDraftFromRecord(response);
      refresh();
      const version = savedVersion !== undefined ? ` (v${savedVersion})` : "";
      notify(`Draft saved${version}`, { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const publishDraft = async () => {
    if (!resourceId) {
      return;
    }

    const normalizedName = draftName.trim();
    if (normalizedName.length === 0) {
      notify("Link-set name is required.", { type: "warning" });
      return;
    }
    if (Object.keys(entries).length === 0) {
      notify("At least one entry is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      if (isDirty) {
        const payload: LinkSetUpdateRequest = {
          name: normalizedName,
          entries,
        };
        const response = await scopedApiAdapter.update("link-sets", resourceId, payload);
        applyDraftFromRecord(response);
      }

      const published = (await scopedApiAdapter.publish(
        "link-sets",
        resourceId,
      )) as LinkSetBundle;
      refresh();
      notify(`Published v${published.linkSetVersion}`, { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Draft Entries Editor" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            Edit draft entries locally, then save or publish. Draft version is set
            automatically by the API.
          </Alert>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              onClick={openCreate}
              disabled={busy}
              startIcon={<AddIcon />}
            >
              Add Entry
            </Button>
            <Button
              variant="outlined"
              onClick={resetDraftChanges}
              disabled={busy || !isDirty}
            >
              Reset Changes
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={saveDraft}
              disabled={busy || !isDirty}
              startIcon={busy ? <CircularProgress size={16} /> : undefined}
            >
              Save Draft
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={publishDraft}
              disabled={busy}
            >
              Publish Draft
            </Button>
          </Stack>

          <PanelError message={errorMessage} />

          {rows.length === 0 ? (
            <EmptyMessage text="No draft entries. Add at least one entry." />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={linkSetKeyColumnSx}>Key</TableCell>
                  <TableCell sx={linkSetLabelColumnSx}>Label</TableCell>
                  <TableCell sx={linkSetPreviewColumnSx}>Edge Preview</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const edgeSelection = getLinkEntryEdgeSelection(row.value, edgeCatalog);
                  return (
                    <TableRow key={row.key}>
                      <TableCell sx={linkSetKeyColumnSx}>{row.key}</TableCell>
                      <TableCell sx={linkSetLabelColumnSx}>{row.value.label}</TableCell>
                      <TableCell sx={linkSetPreviewColumnSx}>
                        <EdgePreview
                          markerStart={edgeSelection.markerStart}
                          edgeStyle={edgeSelection.edgeStyle}
                          markerEnd={edgeSelection.markerEnd}
                          thickness={edgeSelection.thickness}
                          compact
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteEntryLocal(row.key)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Stack>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>{editingKey ? "Edit Link Entry" : "Add Link Entry"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Entry Key"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                fullWidth
              />
              <TextField
                label="Label"
                value={labelInput}
                onChange={(event) => setLabelInput(event.target.value)}
                fullWidth
              />

              <Typography variant="subtitle2">Selected Edge</Typography>
              <EdgePreview
                markerStart={markerStartInput}
                edgeStyle={edgeStyleInput}
                markerEnd={markerEndInput}
                thickness={normalizeEdgeThicknessValue(thicknessInput, edgeCatalog.defaults.thickness)}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  select
                  label="Marker Start"
                  value={markerStartInput}
                  onChange={(event) => setMarkerStartInput(event.target.value)}
                  fullWidth
                  disabled={loadingEdgeCatalog}
                >
                  {edgeCatalog.markerStartOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Edge Style"
                  value={edgeStyleInput}
                  onChange={(event) => setEdgeStyleInput(event.target.value)}
                  fullWidth
                  disabled={loadingEdgeCatalog}
                >
                  {edgeCatalog.edgeStyleOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Marker End"
                  value={markerEndInput}
                  onChange={(event) => setMarkerEndInput(event.target.value)}
                  fullWidth
                  disabled={loadingEdgeCatalog}
                >
                  {edgeCatalog.markerEndOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Thickness"
                  type="number"
                  value={thicknessInput}
                  onChange={(event) => setThicknessInput(event.target.value)}
                  fullWidth
                  inputProps={{ min: 0.1, step: 0.1 }}
                />
              </Stack>

              <Typography variant="subtitle2">ELK Properties</Typography>
              {propertiesRows.map((row) => (
                <Stack key={row.id} direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    label="Property"
                    value={row.key}
                    onChange={(event) =>
                      setPropertiesRows((current) =>
                        current.map((candidate) =>
                          candidate.id === row.id
                            ? { ...candidate, key: event.target.value }
                            : candidate,
                        ),
                      )
                    }
                    fullWidth
                  />
                  <TextField
                    label="Value"
                    value={row.value}
                    onChange={(event) =>
                      setPropertiesRows((current) =>
                        current.map((candidate) =>
                          candidate.id === row.id
                            ? { ...candidate, value: event.target.value }
                            : candidate,
                        ),
                      )
                    }
                    fullWidth
                  />
                  <IconButton
                    color="error"
                    onClick={() =>
                      setPropertiesRows((current) =>
                        current.length > 1
                          ? current.filter((candidate) => candidate.id !== row.id)
                          : current,
                      )
                    }
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              <Button variant="outlined" onClick={addPropertyRow} startIcon={<AddIcon />}>
                Add Property
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEntryLocal} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function ThemeCreateEditor() {
  const notify = useNotify();
  const redirect = useRedirect();
  const refresh = useRefresh();

  const [themeId, setThemeId] = useState("");
  const [name, setName] = useState("");
  const [sourceThemeId, setSourceThemeId] = useState("");
  const [sourceVersion, setSourceVersion] = useState("");
  const [draftCssBody, setDraftCssBody] = useState(DUMMY_THEME_CSS_BODY);
  const [variables, setVariables] = useState<Record<string, ThemeVariableUpsertRequest>>(
    {},
  );

  const [sourceOptions, setSourceOptions] = useState<ThemeSummary[]>([]);
  const [versionOptions, setVersionOptions] = useState<VersionCountOption[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingSources, setLoadingSources] = useState(false);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [loadingSourceBundle, setLoadingSourceBundle] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [valueType, setValueType] =
    useState<ThemeVariableUpsertRequest["valueType"]>("color");
  const [valueInput, setValueInput] = useState("");
  const [lightValue, setLightValue] = useState("");
  const [darkValue, setDarkValue] = useState("");

  const rows = useMemo(
    () =>
      Object.entries(variables)
        .map(([key, value]) => ({ key, value }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    [variables],
  );
  const isColorDialogType = isColorThemeVariable(valueType);

  const loadSourceOptions = useCallback(async () => {
    setLoadingSources(true);
    try {
      const list = (await scopedApiAdapter.list("themes")) as ThemeSummary[];
      const publishedSets = list
        .filter((item) => typeof item.publishedVersion === "number")
        .sort((left, right) => left.themeId.localeCompare(right.themeId));
      setSourceOptions(publishedSets);
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setLoadingSources(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadSourceOptions();
  }, [loadSourceOptions]);

  const loadSourceVersions = useCallback(async () => {
    if (!sourceThemeId) {
      setVersionOptions([]);
      setSourceVersion("");
      return;
    }

    setLoadingVersions(true);
    try {
      const record = (await scopedApiAdapter.get("themes", sourceThemeId)) as ThemeRecord;
      const published = Array.isArray(record.publishedVersions)
        ? record.publishedVersions
        : [];
      const options = published
        .map((bundle) => ({
          version: bundle.themeVersion,
          itemCount: Object.keys(normalizeThemeVariables(bundle.variables)).length,
        }))
        .sort((left, right) => right.version - left.version);
      setVersionOptions(options);
      const latestVersion = options[0]?.version;
      setSourceVersion(latestVersion !== undefined ? String(latestVersion) : "");
    } catch (error) {
      const message = toErrorMessage(error);
      setVersionOptions([]);
      setSourceVersion("");
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setLoadingVersions(false);
    }
  }, [notify, sourceThemeId]);

  useEffect(() => {
    void loadSourceVersions();
  }, [loadSourceVersions]);

  const loadSourceBundle = useCallback(async () => {
    if (!sourceThemeId) {
      setDraftCssBody(DUMMY_THEME_CSS_BODY);
      setVariables({});
      return;
    }

    const parsedVersion = Number(sourceVersion);
    if (!Number.isInteger(parsedVersion) || parsedVersion < 1) {
      return;
    }

    setLoadingSourceBundle(true);
    setErrorMessage(null);
    try {
      const sourceBundle = (await scopedApiAdapter.getBundle("themes", sourceThemeId, {
        stage: "published",
        version: parsedVersion,
      })) as ThemeBundle;
      setDraftCssBody(sourceBundle.cssBody);
      setVariables(normalizeThemeVariables(sourceBundle.variables));
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setLoadingSourceBundle(false);
    }
  }, [notify, sourceThemeId, sourceVersion]);

  useEffect(() => {
    void loadSourceBundle();
  }, [loadSourceBundle]);

  const openCreate = () => {
    setEditingKey(null);
    setKeyInput("");
    setValueType("color");
    setValueInput("");
    setLightValue("");
    setDarkValue("");
    setDialogOpen(true);
  };

  const openEdit = (row: { key: string; value: ThemeVariableUpsertRequest }) => {
    setEditingKey(row.key);
    setKeyInput(row.key);
    setValueType(row.value.valueType);
    if (isColorThemeVariable(row.value.valueType)) {
      setValueInput("");
      setLightValue(normalizeThemeVariableText(row.value.lightValue));
      setDarkValue(normalizeThemeVariableText(row.value.darkValue));
    } else {
      setValueInput(normalizeThemeVariableText(row.value.value));
      setLightValue("");
      setDarkValue("");
    }
    setDialogOpen(true);
  };

  const saveVariableLocal = () => {
    const normalizedKey = keyInput.trim();
    if (normalizedKey.length === 0) {
      notify("Variable key is required.", { type: "warning" });
      return;
    }

    let variablePayload: ThemeVariableUpsertRequest;
    if (isColorThemeVariable(valueType)) {
      const normalizedLight = lightValue.trim();
      const normalizedDark = darkValue.trim();
      if (normalizedLight.length === 0 || normalizedDark.length === 0) {
        notify("Color variables require both light and dark values.", {
          type: "warning",
        });
        return;
      }
      variablePayload = {
        valueType,
        lightValue: normalizedLight,
        darkValue: normalizedDark,
      };
    } else {
      const normalizedValue = valueInput.trim();
      if (normalizedValue.length === 0) {
        notify("Non-color variables require a value.", { type: "warning" });
        return;
      }
      variablePayload = {
        valueType,
        value: normalizedValue,
      };
    }

    setVariables((current) => {
      const next = { ...current };
      if (editingKey && editingKey !== normalizedKey) {
        delete next[editingKey];
      }
      next[normalizedKey] = variablePayload;
      return next;
    });
    setDialogOpen(false);
  };

  const deleteVariableLocal = (variableKey: string) => {
    if (!window.confirm(`Delete variable '${variableKey}' before create?`)) {
      return;
    }
    setVariables((current) => {
      const next = { ...current };
      delete next[variableKey];
      return next;
    });
  };

  const handleCreate = async () => {
    const normalizedId = themeId.trim();
    const normalizedName = name.trim();

    if (!normalizedId) {
      notify("Theme ID is required.", { type: "warning" });
      return;
    }
    if (!normalizedName) {
      notify("Name is required.", { type: "warning" });
      return;
    }
    if (draftCssBody.trim().length === 0) {
      notify("cssBody is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      let createMode = "with custom cssBody and variables";
      const parsedVersion = Number(sourceVersion);
      if (
        sourceThemeId &&
        Number.isInteger(parsedVersion) &&
        parsedVersion >= 1
      ) {
        createMode = `using ${sourceThemeId} v${parsedVersion} as base`;
      }

      const payload: ThemeCreateRequest = {
        themeId: normalizedId,
        name: normalizedName,
        cssBody: draftCssBody,
        variables,
      };
      const created = (await scopedApiAdapter.create("themes", payload)) as ThemeRecord;
      refresh();
      notify(`Theme '${created.themeId}' created ${createMode}.`, {
        type: "success",
      });
      redirect(`/themes/${created.themeId}/edit`);
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Create Theme" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            Variables are editable first. The CSS editor is below with Monaco CSS
            autocomplete/suggestions.
          </Alert>
          <TextField
            label="Theme ID"
            value={themeId}
            onChange={(event) => setThemeId(event.target.value)}
            placeholder="e.g. app-theme"
            fullWidth
            size="small"
          />
          <TextField
            label="Name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. App Theme"
            fullWidth
            size="small"
          />
          <TextField
            select
            label="Start From"
            value={sourceThemeId}
            onChange={(event) => setSourceThemeId(event.target.value)}
            size="small"
            disabled={busy || loadingSources}
            helperText="Optional: load variables and cssBody from a published theme."
          >
            <MenuItem value="">No source (start from local defaults)</MenuItem>
            {sourceOptions.map((option) => (
              <MenuItem key={option.themeId} value={option.themeId}>
                {option.themeId} ({option.name})
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Published Version"
            value={sourceVersion}
            onChange={(event) => setSourceVersion(event.target.value)}
            size="small"
            disabled={
              busy || !sourceThemeId || loadingVersions || versionOptions.length === 0
            }
            helperText={
              sourceThemeId
                ? "Choose which published version to load."
                : "Select a source theme first."
            }
          >
            {versionOptions.map((option) => (
              <MenuItem key={option.version} value={String(option.version)}>
                v{option.version} ({option.itemCount} variables)
              </MenuItem>
            ))}
          </TextField>

          {loadingSourceBundle ? (
            <Typography variant="body2" color="text.secondary">
              Loading source bundle...
            </Typography>
          ) : null}

          <PanelError message={errorMessage} />

          <Stack spacing={1} data-testid="theme-create-variables-section">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                Variables
              </Typography>
              <Button
                variant="contained"
                onClick={openCreate}
                disabled={busy || loadingSourceBundle}
                startIcon={<AddIcon />}
              >
                Add Variable
              </Button>
            </Stack>
            {rows.length === 0 ? (
              <EmptyMessage text="No variables set yet." />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Key</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Light</TableCell>
                    <TableCell>Dark</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.key}>
                      {isColorThemeVariable(row.value.valueType) ? (
                        <>
                          <TableCell>{row.key}</TableCell>
                          <TableCell>{row.value.valueType}</TableCell>
                          <TableCell>{themeVariableEmptyDisplay}</TableCell>
                          <TableCell>
                            <ThemeVariableColorValue value={row.value.lightValue} />
                          </TableCell>
                          <TableCell>
                            <ThemeVariableColorValue value={row.value.darkValue} />
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{row.key}</TableCell>
                          <TableCell>{row.value.valueType}</TableCell>
                          <TableCell>{themeVariableDisplayValue(row.value.value)}</TableCell>
                          <TableCell>{themeVariableEmptyDisplay}</TableCell>
                          <TableCell>{themeVariableEmptyDisplay}</TableCell>
                        </>
                      )}
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteVariableLocal(row.key)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>

          <Box data-testid="theme-create-css-section">
            <CssMonacoEditor
              label="CSS Body"
              value={draftCssBody}
              onChange={setDraftCssBody}
              minHeight={960}
              testId="theme-create-css-editor"
            />
          </Box>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={busy || loadingSourceBundle}
            >
              Create Theme
            </Button>
            <Button
              variant="outlined"
              onClick={() => {
                setThemeId("");
                setName("");
                setSourceThemeId("");
                setSourceVersion("");
                setVersionOptions([]);
                setDraftCssBody(DUMMY_THEME_CSS_BODY);
                setVariables({});
                setErrorMessage(null);
              }}
              disabled={busy || loadingSourceBundle}
            >
              Clear
            </Button>
          </Stack>
        </Stack>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>{editingKey ? "Edit Variable" : "Add Variable"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Variable Key"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                fullWidth
              />
              <TextField
                select
                label="Value Type"
                value={valueType}
                onChange={(event) => {
                  const nextType = event.target.value as ThemeVariableUpsertRequest["valueType"];
                  setValueType(nextType);
                  if (isColorThemeVariable(nextType)) {
                    setValueInput("");
                  } else {
                    setLightValue("");
                    setDarkValue("");
                  }
                }}
                fullWidth
              >
                {variableTypeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              {isColorDialogType ? (
                <>
                  <ThemeVariableColorInput
                    label="Light Value"
                    value={lightValue}
                    onChange={setLightValue}
                  />
                  <ThemeVariableColorInput
                    label="Dark Value"
                    value={darkValue}
                    onChange={setDarkValue}
                  />
                </>
              ) : (
                <TextField
                  label="Value"
                  value={valueInput}
                  onChange={(event) => setValueInput(event.target.value)}
                  fullWidth
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveVariableLocal} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function ThemePublishedView() {
  const { notify, resourceId } = useOperationContext("themeId");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bundle, setBundle] = useState<ThemeBundle | null>(null);

  const variableRows = useMemo(
    () =>
      bundle
        ? Object.entries(normalizeThemeVariables(bundle.variables))
            .map(([key, value]) => ({ key, value }))
            .sort((left, right) => left.key.localeCompare(right.key))
        : [],
    [bundle],
  );

  const loadPublished = useCallback(async () => {
    if (!resourceId) {
      return;
    }
    setBusy(true);
    setErrorMessage(null);
    try {
      const payload = (await scopedApiAdapter.getBundle("themes", resourceId, {
        stage: "published",
      })) as ThemeBundle;
      setBundle(payload);
    } catch (error) {
      const message = toErrorMessage(error);
      setBundle(null);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  }, [notify, resourceId]);

  useEffect(() => {
    void loadPublished();
  }, [loadPublished]);

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Published Theme" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            This view shows only the latest published theme version.
          </Alert>
          <Button
            variant="outlined"
            onClick={loadPublished}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            Refresh Published Version
          </Button>
          <PanelError message={errorMessage} />

          {!bundle && !busy ? (
            <EmptyMessage text="No published version available yet." />
          ) : null}

          {bundle ? (
            <>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography variant="body2">
                  <strong>ID:</strong> {bundle.themeId}
                </Typography>
                <Typography variant="body2">
                  <strong>Name:</strong> {bundle.name}
                </Typography>
              </Stack>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Typography variant="body2">
                  <strong>Version:</strong> {bundle.themeVersion}
                </Typography>
                <Typography variant="body2">
                  <strong>Updated:</strong> {new Date(bundle.updatedAt).toLocaleString()}
                </Typography>
              </Stack>

              <Stack spacing={1} data-testid="theme-published-variables-section">
                <Typography variant="subtitle2">Variables</Typography>
                {variableRows.length === 0 ? (
                  <EmptyMessage text="Published version contains no variables." />
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Key</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Value</TableCell>
                        <TableCell>Light</TableCell>
                        <TableCell>Dark</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {variableRows.map((row) => (
                        <TableRow key={row.key}>
                          {isColorThemeVariable(row.value.valueType) ? (
                            <>
                              <TableCell>{row.key}</TableCell>
                              <TableCell>{row.value.valueType}</TableCell>
                              <TableCell>{themeVariableEmptyDisplay}</TableCell>
                              <TableCell>
                                <ThemeVariableColorValue value={row.value.lightValue} />
                              </TableCell>
                              <TableCell>
                                <ThemeVariableColorValue value={row.value.darkValue} />
                              </TableCell>
                            </>
                          ) : (
                            <>
                              <TableCell>{row.key}</TableCell>
                              <TableCell>{row.value.valueType}</TableCell>
                              <TableCell>{themeVariableDisplayValue(row.value.value)}</TableCell>
                              <TableCell>{themeVariableEmptyDisplay}</TableCell>
                              <TableCell>{themeVariableEmptyDisplay}</TableCell>
                            </>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Stack>

              <Box data-testid="theme-published-css-section">
                <CssMonacoEditor
                  label="CSS Body"
                  value={bundle.cssBody}
                  readOnly
                  minHeight={960}
                  testId="theme-published-css-editor"
                />
              </Box>

              <RawJsonToggle
                value={bundle}
                collapsedByDefault
                summary={`Published bundle v${bundle.themeVersion}`}
              />
            </>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function ThemeDraftEditor() {
  const record = useRecordContext<RaRecord>();
  const { notify, refresh, resourceId } = useOperationContext("themeId");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [variables, setVariables] = useState<Record<string, ThemeVariableUpsertRequest>>(
    {},
  );
  const [draftName, setDraftName] = useState("");
  const [draftCssBody, setDraftCssBody] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [valueType, setValueType] =
    useState<ThemeVariableUpsertRequest["valueType"]>("color");
  const [valueInput, setValueInput] = useState("");
  const [lightValue, setLightValue] = useState("");
  const [darkValue, setDarkValue] = useState("");
  const appliedDraftSignatureRef = useRef<string | null>(null);

  const draftSignature = `${resourceId ?? ""}:${
    typeof record?.themeVersion === "number" ? record.themeVersion : ""
  }:${typeof record?.updatedAt === "string" ? record.updatedAt : ""}`;

  const rows = useMemo(
    () =>
      Object.entries(variables)
        .map(([key, value]) => ({ key, value }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    [variables],
  );
  const isColorDialogType = isColorThemeVariable(valueType);

  useEffect(() => {
    if (appliedDraftSignatureRef.current === draftSignature) {
      return;
    }
    appliedDraftSignatureRef.current = draftSignature;
    setDraftName(typeof record?.name === "string" ? record.name : "");
    setDraftCssBody(typeof record?.cssBody === "string" ? record.cssBody : "");
    setVariables(normalizeThemeVariables(record?.variables));
    setIsDirty(false);
    setErrorMessage(null);
  }, [draftSignature, record?.cssBody, record?.name, record?.variables]);

  const openCreate = () => {
    setEditingKey(null);
    setKeyInput("");
    setValueType("color");
    setValueInput("");
    setLightValue("");
    setDarkValue("");
    setDialogOpen(true);
  };

  const openEdit = (row: { key: string; value: ThemeVariableUpsertRequest }) => {
    setEditingKey(row.key);
    setKeyInput(row.key);
    setValueType(row.value.valueType);
    if (isColorThemeVariable(row.value.valueType)) {
      setValueInput("");
      setLightValue(normalizeThemeVariableText(row.value.lightValue));
      setDarkValue(normalizeThemeVariableText(row.value.darkValue));
    } else {
      setValueInput(normalizeThemeVariableText(row.value.value));
      setLightValue("");
      setDarkValue("");
    }
    setDialogOpen(true);
  };

  const saveVariableLocal = () => {
    const normalizedKey = keyInput.trim();
    if (normalizedKey.length === 0) {
      notify("Variable key is required.", { type: "warning" });
      return;
    }

    let variablePayload: ThemeVariableUpsertRequest;
    if (isColorThemeVariable(valueType)) {
      const normalizedLight = lightValue.trim();
      const normalizedDark = darkValue.trim();
      if (normalizedLight.length === 0 || normalizedDark.length === 0) {
        notify("Color variables require both light and dark values.", {
          type: "warning",
        });
        return;
      }
      variablePayload = {
        valueType,
        lightValue: normalizedLight,
        darkValue: normalizedDark,
      };
    } else {
      const normalizedValue = valueInput.trim();
      if (normalizedValue.length === 0) {
        notify("Non-color variables require a value.", { type: "warning" });
        return;
      }
      variablePayload = {
        valueType,
        value: normalizedValue,
      };
    }

    setVariables((current) => {
      const next = { ...current };
      if (editingKey && editingKey !== normalizedKey) {
        delete next[editingKey];
      }
      next[normalizedKey] = variablePayload;
      return next;
    });
    setDialogOpen(false);
    setIsDirty(true);
  };

  const deleteVariableLocal = (variableKey: string) => {
    if (!window.confirm(`Delete variable '${variableKey}' from draft?`)) {
      return;
    }
    setVariables((current) => {
      const next = { ...current };
      delete next[variableKey];
      return next;
    });
    setIsDirty(true);
  };

  const resetDraftChanges = () => {
    setDraftName(typeof record?.name === "string" ? record.name : "");
    setDraftCssBody(typeof record?.cssBody === "string" ? record.cssBody : "");
    setVariables(normalizeThemeVariables(record?.variables));
    setIsDirty(false);
    setErrorMessage(null);
  };

  const applyDraftFromRecord = (response: unknown): number | undefined => {
    const responseRecord =
      typeof response === "object" && response !== null
        ? (response as Record<string, unknown>)
        : {};
    const draft =
      typeof responseRecord.draft === "object" && responseRecord.draft !== null
        ? (responseRecord.draft as Record<string, unknown>)
        : {};

    if (typeof draft.name === "string") {
      setDraftName(draft.name);
    }
    if (typeof draft.cssBody === "string") {
      setDraftCssBody(draft.cssBody);
    }
    setVariables(normalizeThemeVariables(draft.variables));
    setIsDirty(false);

    return typeof draft.themeVersion === "number" ? draft.themeVersion : undefined;
  };

  const saveDraft = async () => {
    if (!resourceId) {
      return;
    }
    const normalizedName = draftName.trim();
    if (normalizedName.length === 0) {
      notify("Theme name is required.", { type: "warning" });
      return;
    }
    if (draftCssBody.trim().length === 0) {
      notify("cssBody is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const payload: ThemeUpdateRequest = {
        name: normalizedName,
        cssBody: draftCssBody,
        variables,
      };
      const response = await scopedApiAdapter.update("themes", resourceId, payload);
      const savedVersion = applyDraftFromRecord(response);
      refresh();
      const version = savedVersion !== undefined ? ` (v${savedVersion})` : "";
      notify(`Draft saved${version}`, { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const publishDraft = async () => {
    if (!resourceId) {
      return;
    }
    const normalizedName = draftName.trim();
    if (normalizedName.length === 0) {
      notify("Theme name is required.", { type: "warning" });
      return;
    }
    if (draftCssBody.trim().length === 0) {
      notify("cssBody is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      if (isDirty) {
        const payload: ThemeUpdateRequest = {
          name: normalizedName,
          cssBody: draftCssBody,
          variables,
        };
        const response = await scopedApiAdapter.update("themes", resourceId, payload);
        applyDraftFromRecord(response);
      }

      const published = (await scopedApiAdapter.publish(
        "themes",
        resourceId,
      )) as ThemeBundle;
      refresh();
      notify(`Published v${published.themeVersion}`, { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Draft Theme Editor" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            Edit draft theme locally, then save or publish. Draft version is set
            automatically by the API.
          </Alert>
          <Stack spacing={1} data-testid="theme-draft-variables-section">
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                Variables
              </Typography>
              <Button
                variant="contained"
                onClick={openCreate}
                disabled={busy}
                startIcon={<AddIcon />}
              >
                Add Variable
              </Button>
            </Stack>

            {rows.length === 0 ? (
              <EmptyMessage text="No draft variables yet." />
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Key</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Light</TableCell>
                    <TableCell>Dark</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.key}>
                      {isColorThemeVariable(row.value.valueType) ? (
                        <>
                          <TableCell>{row.key}</TableCell>
                          <TableCell>{row.value.valueType}</TableCell>
                          <TableCell>{themeVariableEmptyDisplay}</TableCell>
                          <TableCell>
                            <ThemeVariableColorValue value={row.value.lightValue} />
                          </TableCell>
                          <TableCell>
                            <ThemeVariableColorValue value={row.value.darkValue} />
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell>{row.key}</TableCell>
                          <TableCell>{row.value.valueType}</TableCell>
                          <TableCell>{themeVariableDisplayValue(row.value.value)}</TableCell>
                          <TableCell>{themeVariableEmptyDisplay}</TableCell>
                          <TableCell>{themeVariableEmptyDisplay}</TableCell>
                        </>
                      )}
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => deleteVariableLocal(row.key)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Stack>

          <Box data-testid="theme-draft-css-section">
            <CssMonacoEditor
              label="CSS Body"
              value={draftCssBody}
              onChange={(nextValue) => {
                setDraftCssBody(nextValue);
                setIsDirty(true);
              }}
              minHeight={960}
              testId="theme-draft-css-editor"
            />
          </Box>

          <PanelError message={errorMessage} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="outlined"
              onClick={resetDraftChanges}
              disabled={busy || !isDirty}
            >
              Reset Changes
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={saveDraft}
              disabled={busy || !isDirty}
              startIcon={busy ? <CircularProgress size={16} /> : undefined}
            >
              Save Draft
            </Button>
            <Button
              variant="outlined"
              color="primary"
              onClick={publishDraft}
              disabled={busy}
            >
              Publish Draft
            </Button>
          </Stack>
        </Stack>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>{editingKey ? "Edit Variable" : "Add Variable"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Variable Key"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                fullWidth
              />
              <TextField
                select
                label="Value Type"
                value={valueType}
                onChange={(event) => {
                  const nextType = event.target.value as ThemeVariableUpsertRequest["valueType"];
                  setValueType(nextType);
                  if (isColorThemeVariable(nextType)) {
                    setValueInput("");
                  } else {
                    setLightValue("");
                    setDarkValue("");
                  }
                }}
                fullWidth
              >
                {variableTypeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              {isColorDialogType ? (
                <>
                  <ThemeVariableColorInput
                    label="Light Value"
                    value={lightValue}
                    onChange={setLightValue}
                  />
                  <ThemeVariableColorInput
                    label="Dark Value"
                    value={darkValue}
                    onChange={setDarkValue}
                  />
                </>
              ) : (
                <TextField
                  label="Value"
                  value={valueInput}
                  onChange={(event) => setValueInput(event.target.value)}
                  fullWidth
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveVariableLocal} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function BundleAndPublishPanel({ resource, idField }: BaseOperationProps) {
  const { notify, refresh, resourceId } = useOperationContext(idField);
  const [query, setQuery] = useState<StageVersionState>(defaultStageQuery());
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const isIconSet = resource === "icon-sets";

  const runGetBundle = async () => {
    if (!resourceId) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const queryPayload: StageVersionQuery = {
        stage: query.stage,
        version: parseVersionOrThrow(query.version),
      };
      const bundle = await scopedApiAdapter.getBundle(resource, resourceId, queryPayload);
      setResult(bundle);
      notify("Bundle loaded", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const runPublish = async () => {
    if (!resourceId) {
      return;
    }

    if (!window.confirm("Publish current draft?")) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const payload = await scopedApiAdapter.publish(resource, resourceId);
      setResult(payload);
      notify("Published successfully", { type: "success" });
      refresh();
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Bundle and Publish" />
      <CardContent>
        <Stack spacing={2}>
          {isIconSet ? (
            <Alert severity="info">
              Workflow: update the draft, then publish to create a new published version.
            </Alert>
          ) : null}
          <StageVersionControls state={query} onChange={setQuery} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button
              variant="outlined"
              onClick={runGetBundle}
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              Load Bundle
            </Button>
            <Button
              variant="contained"
              onClick={runPublish}
              disabled={busy}
              color="primary"
            >
              Publish Draft
            </Button>
          </Stack>
          <PanelError message={errorMessage} />
          <JsonPreview value={result} collapsedByDefault={isIconSet} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function IconSetEntriesPanel({ idField }: Pick<BaseOperationProps, "idField">) {
  const { notify, refresh, resourceId } = useOperationContext(idField);
  const [query, setQuery] = useState<StageVersionState>(defaultStageQuery());
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, string>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [iconInput, setIconInput] = useState("");

  const rows = useMemo(
    () =>
      Object.entries(entries)
        .map(([key, icon]) => ({ key, icon }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    [entries],
  );
  const isDraftStage = query.stage === "draft";

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  const loadEntries = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const payload = await scopedApiAdapter.getIconEntries(resourceId, {
        stage: query.stage,
        version: parseVersionOrThrow(query.version),
      });
      setEntries(payload.entries);
      notify("Entries loaded", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setEditingKey(null);
    setKeyInput("");
    setIconInput("");
    setDialogOpen(true);
  };

  const openEdit = (row: { key: string; icon: string }) => {
    setEditingKey(row.key);
    setKeyInput(row.key);
    setIconInput(row.icon);
    setDialogOpen(true);
  };

  const saveEntry = async () => {
    if (!isDraftStage) {
      notify("Switch to draft stage to edit entries.", { type: "warning" });
      return;
    }

    const normalizedKey = keyInput.trim();
    const normalizedIcon = iconInput.trim();

    if (normalizedKey.length === 0 || normalizedIcon.length === 0) {
      notify("Entry key and icon are required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      await scopedApiAdapter.upsertIconEntry(resourceId, normalizedKey, {
        icon: normalizedIcon,
      });

      if (editingKey && editingKey !== normalizedKey) {
        await scopedApiAdapter.deleteIconEntry(resourceId, editingKey);
      }

      setDialogOpen(false);
      await loadEntries();
      refresh();
      notify("Entry saved", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (entryKey: string) => {
    if (!isDraftStage) {
      notify("Switch to draft stage to edit entries.", { type: "warning" });
      return;
    }

    if (!window.confirm(`Delete entry '${entryKey}'?`)) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      await scopedApiAdapter.deleteIconEntry(resourceId, entryKey);
      await loadEntries();
      refresh();
      notify("Entry deleted", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Icon Entries" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity={isDraftStage ? "info" : "warning"}>
            {isDraftStage
              ? "Draft stage is editable. Add, edit, and delete apply to the current draft."
              : "Published stage is read-only. Switch to draft to edit entries."}
          </Alert>

          <StageVersionControls state={query} onChange={setQuery} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="outlined"
              onClick={loadEntries}
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              Refresh Entries
            </Button>
            <Button
              variant="contained"
              onClick={openCreate}
              disabled={busy || !isDraftStage}
              startIcon={<AddIcon />}
            >
              Add Entry
            </Button>
          </Stack>

          <PanelError message={errorMessage} />

          {rows.length === 0 ? (
            <EmptyMessage
              text={
                isDraftStage
                  ? "No entries loaded. Use refresh or add a new entry."
                  : "No entries found for this published selection."
              }
            />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>Icon</TableCell>
                  <TableCell>Icon Name</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell>
                      <IconifyIconCell iconName={row.icon} />
                    </TableCell>
                    <TableCell>{row.icon}</TableCell>
                    <TableCell align="right">
                      <Tooltip
                        title={isDraftStage ? "Edit" : "Switch to draft stage to edit"}
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => openEdit(row)}
                            disabled={!isDraftStage}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip
                        title={
                          isDraftStage ? "Delete" : "Switch to draft stage to delete"
                        }
                      >
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeEntry(row.key)}
                            disabled={!isDraftStage}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>{editingKey ? "Edit Icon Entry" : "Add Icon Entry"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Entry Key"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                fullWidth
              />
              <TextField
                label="Icon"
                value={iconInput}
                onChange={(event) => setIconInput(event.target.value)}
                fullWidth
              />
              <IconSelectionPreview iconName={iconInput} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEntry} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function LayoutSetEntriesPanel({ idField }: Pick<BaseOperationProps, "idField">) {
  const { notify, refresh, resourceId } = useOperationContext(idField);
  const [query, setQuery] = useState<StageVersionState>(defaultStageQuery());
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, unknown>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [valueKind, setValueKind] = useState<LayoutValueKind>("string");
  const [stringValue, setStringValue] = useState("");
  const [numberValue, setNumberValue] = useState("");
  const [booleanValue, setBooleanValue] = useState(false);
  const [objectRows, setObjectRows] = useState<KeyValueRow[]>([]);
  const [arrayRows, setArrayRows] = useState<StringItemRow[]>([]);

  const rows = useMemo(
    () =>
      Object.entries(entries)
        .map(([key, value]) => ({ key, value }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    [entries],
  );

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  const loadEntries = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const payload = await scopedApiAdapter.getLayoutEntries(resourceId, {
        stage: query.stage,
        version: parseVersionOrThrow(query.version),
      });
      setEntries(payload.entries);
      notify("Entries loaded", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const resetValueInputs = () => {
    setValueKind("string");
    setStringValue("");
    setNumberValue("");
    setBooleanValue(false);
    setObjectRows([{ id: Date.now(), key: "", value: "" }]);
    setArrayRows([{ id: Date.now(), value: "" }]);
  };

  const applyValueToInputs = (value: unknown) => {
    const detectedKind = kindFromLayoutValue(value);
    setValueKind(detectedKind);

    if (detectedKind === "string") {
      setStringValue(String(value ?? ""));
      return;
    }

    if (detectedKind === "number") {
      setNumberValue(String(value));
      return;
    }

    if (detectedKind === "boolean") {
      setBooleanValue(Boolean(value));
      return;
    }

    if (detectedKind === "object") {
      const inputRows = Object.entries(value as Record<string, unknown>).map(
        ([entryKey, entryValue], index) => ({
          id: Date.now() + index,
          key: entryKey,
          value: formatValue(entryValue),
        }),
      );
      setObjectRows(
        inputRows.length > 0 ? inputRows : [{ id: Date.now(), key: "", value: "" }],
      );
      return;
    }

    if (detectedKind === "array") {
      const inputRows = (value as unknown[]).map((entryValue, index) => ({
        id: Date.now() + index,
        value: formatValue(entryValue),
      }));
      setArrayRows(inputRows.length > 0 ? inputRows : [{ id: Date.now(), value: "" }]);
    }
  };

  const openCreate = () => {
    setEditingKey(null);
    setKeyInput("");
    resetValueInputs();
    setDialogOpen(true);
  };

  const openEdit = (row: { key: string; value: unknown }) => {
    setEditingKey(row.key);
    setKeyInput(row.key);
    resetValueInputs();
    applyValueToInputs(row.value);
    setDialogOpen(true);
  };

  const addObjectRow = () => {
    setObjectRows((current) => [...current, { id: Date.now(), key: "", value: "" }]);
  };

  const addArrayRow = () => {
    setArrayRows((current) => [...current, { id: Date.now(), value: "" }]);
  };

  const buildValue = (): unknown => {
    switch (valueKind) {
      case "string":
        return stringValue;
      case "number": {
        const parsed = Number(numberValue);
        if (!Number.isFinite(parsed)) {
          throw new Error("Number value is invalid.");
        }
        return parsed;
      }
      case "boolean":
        return booleanValue;
      case "null":
        return null;
      case "object": {
        const output: Record<string, string> = {};
        for (const row of objectRows) {
          const key = row.key.trim();
          if (key.length === 0) {
            continue;
          }
          output[key] = row.value;
        }
        return output;
      }
      case "array":
        return arrayRows
          .map((row) => row.value)
          .filter((value) => value.trim().length > 0);
    }
  };

  const saveEntry = async () => {
    const normalizedKey = keyInput.trim();
    if (normalizedKey.length === 0) {
      notify("Entry key is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const payload: LayoutSetEntryUpsertRequest = {
        value: buildValue(),
      };

      await scopedApiAdapter.upsertLayoutEntry(resourceId, normalizedKey, payload);

      if (editingKey && editingKey !== normalizedKey) {
        await scopedApiAdapter.deleteLayoutEntry(resourceId, editingKey);
      }

      setDialogOpen(false);
      await loadEntries();
      refresh();
      notify("Entry saved", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (entryKey: string) => {
    if (!window.confirm(`Delete entry '${entryKey}'?`)) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      await scopedApiAdapter.deleteLayoutEntry(resourceId, entryKey);
      await loadEntries();
      refresh();
      notify("Entry deleted", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Layout Entries" />
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Manage layout entries with form fields and row actions.
          </Typography>

          <StageVersionControls state={query} onChange={setQuery} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="outlined"
              onClick={loadEntries}
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              Refresh Entries
            </Button>
            <Button
              variant="contained"
              onClick={openCreate}
              disabled={busy}
              startIcon={<AddIcon />}
            >
              Add Entry
            </Button>
          </Stack>

          <PanelError message={errorMessage} />

          {rows.length === 0 ? (
            <EmptyMessage text="No entries loaded. Use refresh or add a new entry." />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Value Preview</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    <TableCell>{row.key}</TableCell>
                    <TableCell>{kindFromLayoutValue(row.value)}</TableCell>
                    <TableCell>{formatValue(row.value)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeEntry(row.key)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>
            {editingKey ? "Edit Layout Entry" : "Add Layout Entry"}
          </DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Entry Key"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                fullWidth
              />

              <TextField
                select
                label="Value Type"
                value={valueKind}
                onChange={(event) => setValueKind(event.target.value as LayoutValueKind)}
                fullWidth
              >
                <MenuItem value="string">String</MenuItem>
                <MenuItem value="number">Number</MenuItem>
                <MenuItem value="boolean">Boolean</MenuItem>
                <MenuItem value="null">Null</MenuItem>
                <MenuItem value="object">Object (property table)</MenuItem>
                <MenuItem value="array">Array (item table)</MenuItem>
              </TextField>

              {valueKind === "string" && (
                <TextField
                  label="String Value"
                  value={stringValue}
                  onChange={(event) => setStringValue(event.target.value)}
                  fullWidth
                />
              )}

              {valueKind === "number" && (
                <TextField
                  label="Number Value"
                  value={numberValue}
                  onChange={(event) => setNumberValue(event.target.value)}
                  fullWidth
                />
              )}

              {valueKind === "boolean" && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={booleanValue}
                      onChange={(event) => setBooleanValue(event.target.checked)}
                    />
                  }
                  label="Boolean Value"
                />
              )}

              {valueKind === "null" && (
                <Typography variant="body2" color="text.secondary">
                  This entry value will be stored as null.
                </Typography>
              )}

              {valueKind === "object" && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Object Properties</Typography>
                  {objectRows.map((row) => (
                    <Stack
                      key={row.id}
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                    >
                      <TextField
                        label="Property"
                        value={row.key}
                        onChange={(event) =>
                          setObjectRows((current) =>
                            current.map((candidate) =>
                              candidate.id === row.id
                                ? { ...candidate, key: event.target.value }
                                : candidate,
                            ),
                          )
                        }
                        fullWidth
                      />
                      <TextField
                        label="Value"
                        value={row.value}
                        onChange={(event) =>
                          setObjectRows((current) =>
                            current.map((candidate) =>
                              candidate.id === row.id
                                ? { ...candidate, value: event.target.value }
                                : candidate,
                            ),
                          )
                        }
                        fullWidth
                      />
                      <IconButton
                        color="error"
                        onClick={() =>
                          setObjectRows((current) =>
                            current.length > 1
                              ? current.filter((candidate) => candidate.id !== row.id)
                              : current,
                          )
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button
                    variant="outlined"
                    onClick={addObjectRow}
                    startIcon={<AddIcon />}
                  >
                    Add Property
                  </Button>
                </Stack>
              )}

              {valueKind === "array" && (
                <Stack spacing={1}>
                  <Typography variant="subtitle2">Array Items</Typography>
                  {arrayRows.map((row) => (
                    <Stack
                      key={row.id}
                      direction={{ xs: "column", sm: "row" }}
                      spacing={1}
                    >
                      <TextField
                        label="Item"
                        value={row.value}
                        onChange={(event) =>
                          setArrayRows((current) =>
                            current.map((candidate) =>
                              candidate.id === row.id
                                ? { ...candidate, value: event.target.value }
                                : candidate,
                            ),
                          )
                        }
                        fullWidth
                      />
                      <IconButton
                        color="error"
                        onClick={() =>
                          setArrayRows((current) =>
                            current.length > 1
                              ? current.filter((candidate) => candidate.id !== row.id)
                              : current,
                          )
                        }
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Stack>
                  ))}
                  <Button
                    variant="outlined"
                    onClick={addArrayRow}
                    startIcon={<AddIcon />}
                  >
                    Add Item
                  </Button>
                </Stack>
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEntry} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function LinkSetEntriesPanel({ idField }: Pick<BaseOperationProps, "idField">) {
  const { notify, refresh, resourceId } = useOperationContext(idField);
  const { catalog: edgeCatalog, loading: loadingEdgeCatalog } = useLinkEdgePropertyCatalog();
  const [query, setQuery] = useState<StageVersionState>(defaultStageQuery());
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [entries, setEntries] = useState<Record<string, LinkSetEntryUpsertRequest>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [labelInput, setLabelInput] = useState("");
  const [markerStartInput, setMarkerStartInput] = useState(
    defaultLinkEdgeSelection.markerStart,
  );
  const [edgeStyleInput, setEdgeStyleInput] = useState(defaultLinkEdgeSelection.edgeStyle);
  const [markerEndInput, setMarkerEndInput] = useState(defaultLinkEdgeSelection.markerEnd);
  const [thicknessInput, setThicknessInput] = useState(
    formatThicknessValue(defaultLinkEdgeSelection.thickness),
  );
  const [propertiesRows, setPropertiesRows] = useState<KeyValueRow[]>([]);

  const rows = useMemo(
    () =>
      Object.entries(entries)
        .map(([key, value]) => ({ key, value }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    [entries],
  );

  useEffect(() => {
    setMarkerStartInput((current) =>
      normalizeEdgePropertyValue(
        current,
        edgeCatalog.markerStartOptions,
        edgeCatalog.defaults.markerStart,
      ),
    );
    setEdgeStyleInput((current) =>
      normalizeEdgePropertyValue(
        current,
        edgeCatalog.edgeStyleOptions,
        edgeCatalog.defaults.edgeStyle,
      ),
    );
    setMarkerEndInput((current) =>
      normalizeEdgePropertyValue(
        current,
        edgeCatalog.markerEndOptions,
        edgeCatalog.defaults.markerEnd,
      ),
    );
    setThicknessInput((current) =>
      formatThicknessValue(
        normalizeEdgeThicknessValue(current, edgeCatalog.defaults.thickness),
      ),
    );
  }, [edgeCatalog]);

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  const loadEntries = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const payload = await scopedApiAdapter.getLinkEntries(resourceId, {
        stage: query.stage,
        version: parseVersionOrThrow(query.version),
      });
      setEntries(normalizeLinkEntries(payload.entries));
      notify("Entries loaded", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const resetForm = () => {
    setLabelInput("");
    setMarkerStartInput(edgeCatalog.defaults.markerStart);
    setEdgeStyleInput(edgeCatalog.defaults.edgeStyle);
    setMarkerEndInput(edgeCatalog.defaults.markerEnd);
    setThicknessInput(formatThicknessValue(edgeCatalog.defaults.thickness));
    setPropertiesRows([{ id: Date.now(), key: "", value: "" }]);
  };

  const openCreate = () => {
    setEditingKey(null);
    setKeyInput("");
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (row: { key: string; value: LinkSetEntryUpsertRequest }) => {
    setEditingKey(row.key);
    setKeyInput(row.key);
    setLabelInput(row.value.label);
    const edgeSelection = getLinkEntryEdgeSelection(row.value, edgeCatalog);
    setMarkerStartInput(edgeSelection.markerStart);
    setEdgeStyleInput(edgeSelection.edgeStyle);
    setMarkerEndInput(edgeSelection.markerEnd);
    setThicknessInput(formatThicknessValue(edgeSelection.thickness));

    const mappedRows = toCustomLinkPropertyRows(row.value);

    setPropertiesRows(
      mappedRows.length > 0 ? mappedRows : [{ id: Date.now(), key: "", value: "" }],
    );
    setDialogOpen(true);
  };

  const addPropertyRow = () => {
    setPropertiesRows((current) => [...current, { id: Date.now(), key: "", value: "" }]);
  };

  const saveEntry = async () => {
    const normalizedKey = keyInput.trim();
    const normalizedLabel = labelInput.trim();

    if (normalizedKey.length === 0 || normalizedLabel.length === 0) {
      notify("Entry key and label are required.", { type: "warning" });
      return;
    }

    const payload = buildLinkEntryPayload(
      normalizedLabel,
      {
        markerStart: markerStartInput,
        edgeStyle: edgeStyleInput,
        markerEnd: markerEndInput,
        thickness: normalizeEdgeThicknessValue(thicknessInput, edgeCatalog.defaults.thickness),
      },
      propertiesRows,
    );

    setBusy(true);
    setErrorMessage(null);
    try {
      await scopedApiAdapter.upsertLinkEntry(resourceId, normalizedKey, payload);

      if (editingKey && editingKey !== normalizedKey) {
        await scopedApiAdapter.deleteLinkEntry(resourceId, editingKey);
      }

      setDialogOpen(false);
      await loadEntries();
      refresh();
      notify("Entry saved", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const removeEntry = async (entryKey: string) => {
    if (!window.confirm(`Delete entry '${entryKey}'?`)) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      await scopedApiAdapter.deleteLinkEntry(resourceId, entryKey);
      await loadEntries();
      refresh();
      notify("Entry deleted", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Link Entries" />
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Manage link entries in a row-based editor.
          </Typography>

          <StageVersionControls state={query} onChange={setQuery} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="outlined"
              onClick={loadEntries}
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              Refresh Entries
            </Button>
            <Button
              variant="contained"
              onClick={openCreate}
              disabled={busy}
              startIcon={<AddIcon />}
            >
              Add Entry
            </Button>
          </Stack>

          <PanelError message={errorMessage} />

          {rows.length === 0 ? (
            <EmptyMessage text="No entries loaded. Use refresh or add a new entry." />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={linkSetKeyColumnSx}>Key</TableCell>
                  <TableCell sx={linkSetLabelColumnSx}>Label</TableCell>
                  <TableCell sx={linkSetPreviewColumnSx}>Edge Preview</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const edgeSelection = getLinkEntryEdgeSelection(row.value, edgeCatalog);
                  return (
                    <TableRow key={row.key}>
                      <TableCell sx={linkSetKeyColumnSx}>{row.key}</TableCell>
                      <TableCell sx={linkSetLabelColumnSx}>{row.value.label}</TableCell>
                      <TableCell sx={linkSetPreviewColumnSx}>
                        <EdgePreview
                          markerStart={edgeSelection.markerStart}
                          edgeStyle={edgeSelection.edgeStyle}
                          markerEnd={edgeSelection.markerEnd}
                          thickness={edgeSelection.thickness}
                          compact
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(row)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => removeEntry(row.key)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Stack>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          fullWidth
          maxWidth="md"
        >
          <DialogTitle>{editingKey ? "Edit Link Entry" : "Add Link Entry"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Entry Key"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                fullWidth
              />
              <TextField
                label="Label"
                value={labelInput}
                onChange={(event) => setLabelInput(event.target.value)}
                fullWidth
              />

              <Typography variant="subtitle2">Selected Edge</Typography>
              <EdgePreview
                markerStart={markerStartInput}
                edgeStyle={edgeStyleInput}
                markerEnd={markerEndInput}
                thickness={normalizeEdgeThicknessValue(thicknessInput, edgeCatalog.defaults.thickness)}
              />
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <TextField
                  select
                  label="Marker Start"
                  value={markerStartInput}
                  onChange={(event) => setMarkerStartInput(event.target.value)}
                  fullWidth
                  disabled={loadingEdgeCatalog}
                >
                  {edgeCatalog.markerStartOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Edge Style"
                  value={edgeStyleInput}
                  onChange={(event) => setEdgeStyleInput(event.target.value)}
                  fullWidth
                  disabled={loadingEdgeCatalog}
                >
                  {edgeCatalog.edgeStyleOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  select
                  label="Marker End"
                  value={markerEndInput}
                  onChange={(event) => setMarkerEndInput(event.target.value)}
                  fullWidth
                  disabled={loadingEdgeCatalog}
                >
                  {edgeCatalog.markerEndOptions.map((option) => (
                    <MenuItem key={option} value={option}>
                      {option}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Thickness"
                  type="number"
                  value={thicknessInput}
                  onChange={(event) => setThicknessInput(event.target.value)}
                  fullWidth
                  inputProps={{ min: 0.1, step: 0.1 }}
                />
              </Stack>

              <Typography variant="subtitle2">ELK Properties</Typography>
              {propertiesRows.map((row) => (
                <Stack key={row.id} direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <TextField
                    label="Property"
                    value={row.key}
                    onChange={(event) =>
                      setPropertiesRows((current) =>
                        current.map((candidate) =>
                          candidate.id === row.id
                            ? { ...candidate, key: event.target.value }
                            : candidate,
                        ),
                      )
                    }
                    fullWidth
                  />
                  <TextField
                    label="Value"
                    value={row.value}
                    onChange={(event) =>
                      setPropertiesRows((current) =>
                        current.map((candidate) =>
                          candidate.id === row.id
                            ? { ...candidate, value: event.target.value }
                            : candidate,
                        ),
                      )
                    }
                    fullWidth
                  />
                  <IconButton
                    color="error"
                    onClick={() =>
                      setPropertiesRows((current) =>
                        current.length > 1
                          ? current.filter((candidate) => candidate.id !== row.id)
                          : current,
                      )
                    }
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              ))}
              <Button variant="outlined" onClick={addPropertyRow} startIcon={<AddIcon />}>
                Add Property
              </Button>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveEntry} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function ThemeVariablesPanel({ idField }: Pick<BaseOperationProps, "idField">) {
  const { notify, refresh, resourceId } = useOperationContext(idField);
  const [query, setQuery] = useState<StageVersionState>(defaultStageQuery());
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [variables, setVariables] = useState<Record<string, ThemeVariableUpsertRequest>>(
    {},
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [valueType, setValueType] =
    useState<ThemeVariableUpsertRequest["valueType"]>("color");
  const [valueInput, setValueInput] = useState("");
  const [lightValue, setLightValue] = useState("");
  const [darkValue, setDarkValue] = useState("");

  const rows = useMemo(
    () =>
      Object.entries(variables)
        .map(([key, value]) => ({ key, value }))
        .sort((left, right) => left.key.localeCompare(right.key)),
    [variables],
  );
  const isColorDialogType = isColorThemeVariable(valueType);

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  const loadVariables = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const payload = await scopedApiAdapter.getThemeVariables(resourceId, {
        stage: query.stage,
        version: parseVersionOrThrow(query.version),
      });
      setVariables(normalizeThemeVariables(payload.variables));
      notify("Variables loaded", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const openCreate = () => {
    setEditingKey(null);
    setKeyInput("");
    setValueType("color");
    setValueInput("");
    setLightValue("");
    setDarkValue("");
    setDialogOpen(true);
  };

  const openEdit = (row: { key: string; value: ThemeVariableUpsertRequest }) => {
    setEditingKey(row.key);
    setKeyInput(row.key);
    setValueType(row.value.valueType);
    if (isColorThemeVariable(row.value.valueType)) {
      setValueInput("");
      setLightValue(normalizeThemeVariableText(row.value.lightValue));
      setDarkValue(normalizeThemeVariableText(row.value.darkValue));
    } else {
      setValueInput(normalizeThemeVariableText(row.value.value));
      setLightValue("");
      setDarkValue("");
    }
    setDialogOpen(true);
  };

  const saveVariable = async () => {
    const normalizedKey = keyInput.trim();
    if (normalizedKey.length === 0) {
      notify("Variable key is required.", { type: "warning" });
      return;
    }

    let variablePayload: ThemeVariableUpsertRequest;
    if (isColorThemeVariable(valueType)) {
      const normalizedLight = lightValue.trim();
      const normalizedDark = darkValue.trim();
      if (normalizedLight.length === 0 || normalizedDark.length === 0) {
        notify("Color variables require both light and dark values.", {
          type: "warning",
        });
        return;
      }
      variablePayload = {
        valueType,
        lightValue: normalizedLight,
        darkValue: normalizedDark,
      };
    } else {
      const normalizedValue = valueInput.trim();
      if (normalizedValue.length === 0) {
        notify("Non-color variables require a value.", { type: "warning" });
        return;
      }
      variablePayload = {
        valueType,
        value: normalizedValue,
      };
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      await scopedApiAdapter.upsertThemeVariable(resourceId, normalizedKey, variablePayload);

      if (editingKey && editingKey !== normalizedKey) {
        await scopedApiAdapter.deleteThemeVariable(resourceId, editingKey);
      }

      setDialogOpen(false);
      await loadVariables();
      refresh();
      notify("Variable saved", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const removeVariable = async (variableKey: string) => {
    if (!window.confirm(`Delete variable '${variableKey}'?`)) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      await scopedApiAdapter.deleteThemeVariable(resourceId, variableKey);
      await loadVariables();
      refresh();
      notify("Variable deleted", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Theme Variables" />
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            <code>color</code> variables use light/dark values. Other variable types use a
            single value.
          </Typography>

          <StageVersionControls state={query} onChange={setQuery} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              variant="outlined"
              onClick={loadVariables}
              disabled={busy}
              startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
            >
              Refresh Variables
            </Button>
            <Button
              variant="contained"
              onClick={openCreate}
              disabled={busy}
              startIcon={<AddIcon />}
            >
              Add Variable
            </Button>
          </Stack>

          <PanelError message={errorMessage} />

          {rows.length === 0 ? (
            <EmptyMessage text="No variables loaded. Use refresh or add a new variable." />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Key</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Light</TableCell>
                  <TableCell>Dark</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.key}>
                    {isColorThemeVariable(row.value.valueType) ? (
                      <>
                        <TableCell>{row.key}</TableCell>
                        <TableCell>{row.value.valueType}</TableCell>
                        <TableCell>{themeVariableEmptyDisplay}</TableCell>
                        <TableCell>
                          <ThemeVariableColorValue value={row.value.lightValue} />
                        </TableCell>
                        <TableCell>
                          <ThemeVariableColorValue value={row.value.darkValue} />
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>{row.key}</TableCell>
                        <TableCell>{row.value.valueType}</TableCell>
                        <TableCell>{themeVariableDisplayValue(row.value.value)}</TableCell>
                        <TableCell>{themeVariableEmptyDisplay}</TableCell>
                        <TableCell>{themeVariableEmptyDisplay}</TableCell>
                      </>
                    )}
                    <TableCell align="right">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => openEdit(row)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeVariable(row.key)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Stack>

        <Dialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>{editingKey ? "Edit Variable" : "Add Variable"}</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Variable Key"
                value={keyInput}
                onChange={(event) => setKeyInput(event.target.value)}
                fullWidth
              />
              <TextField
                select
                label="Value Type"
                value={valueType}
                onChange={(event) => {
                  const nextType = event.target.value as ThemeVariableUpsertRequest["valueType"];
                  setValueType(nextType);
                  if (isColorThemeVariable(nextType)) {
                    setValueInput("");
                  } else {
                    setLightValue("");
                    setDarkValue("");
                  }
                }}
                fullWidth
              >
                {variableTypeOptions.map((option) => (
                  <MenuItem key={option} value={option}>
                    {option}
                  </MenuItem>
                ))}
              </TextField>
              {isColorDialogType ? (
                <>
                  <ThemeVariableColorInput
                    label="Light Value"
                    value={lightValue}
                    onChange={setLightValue}
                  />
                  <ThemeVariableColorInput
                    label="Dark Value"
                    value={darkValue}
                    onChange={setDarkValue}
                  />
                </>
              ) : (
                <TextField
                  label="Value"
                  value={valueInput}
                  onChange={(event) => setValueInput(event.target.value)}
                  fullWidth
                />
              )}
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveVariable} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export function GraphTypeCreateEditor() {
  const notify = useNotify();
  const redirect = useRedirect();
  const refresh = useRefresh();

  const [graphTypeId, setGraphTypeId] = useState("");
  const [draftName, setDraftName] = useState("");
  const [iconConflictPolicy, setIconConflictPolicy] = useState<
    "reject" | "first-wins" | "last-wins"
  >("reject");

  const [layoutSetId, setLayoutSetId] = useState("");
  const [layoutSetVersion, setLayoutSetVersion] = useState<number | null>(null);
  const [layoutVersionOptions, setLayoutVersionOptions] = useState<number[]>([]);

  const [linkSetId, setLinkSetId] = useState("");
  const [linkSetVersion, setLinkSetVersion] = useState<number | null>(null);
  const [linkVersionOptions, setLinkVersionOptions] = useState<number[]>([]);

  const [iconRows, setIconRows] = useState<GraphIconSetRefRow[]>([
    { rowId: 0, iconSetId: "", iconSetVersion: null },
  ]);
  const [iconVersionOptionsById, setIconVersionOptionsById] = useState<
    Record<string, number[]>
  >({});

  const [layoutOptions, setLayoutOptions] = useState<LayoutSetSummary[]>([]);
  const [iconOptions, setIconOptions] = useState<IconSetSummary[]>([]);
  const [linkOptions, setLinkOptions] = useState<LinkSetSummary[]>([]);

  const [busy, setBusy] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const iconRowIdRef = useRef(1);

  const createIconRow = useCallback(
    (iconSetId = "", iconSetVersion: number | null = null): GraphIconSetRefRow => ({
      rowId: iconRowIdRef.current++,
      iconSetId,
      iconSetVersion,
    }),
    [],
  );

  const loadLayoutVersions = useCallback(
    async (targetLayoutSetId: string, preferredVersion: number | null) => {
      if (!targetLayoutSetId) {
        setLayoutVersionOptions([]);
        setLayoutSetVersion(null);
        return;
      }

      try {
        const layoutRecord = await scopedApiAdapter.get("layout-sets", targetLayoutSetId);
        const versions = extractPublishedVersionNumbers(layoutRecord, "layoutSetVersion");
        setLayoutVersionOptions(versions);
        setLayoutSetVersion((current) => {
          const candidate = preferredVersion ?? current;
          if (candidate !== null && versions.includes(candidate)) {
            return candidate;
          }
          return versions[0] ?? null;
        });
      } catch (error) {
        const message = toErrorMessage(error);
        setErrorMessage(message);
        notify(message, { type: "error" });
        setLayoutVersionOptions([]);
        setLayoutSetVersion(null);
      }
    },
    [notify],
  );

  const loadLinkVersions = useCallback(
    async (targetLinkSetId: string, preferredVersion: number | null) => {
      if (!targetLinkSetId) {
        setLinkVersionOptions([]);
        setLinkSetVersion(null);
        return;
      }

      try {
        const linkRecord = await scopedApiAdapter.get("link-sets", targetLinkSetId);
        const versions = extractPublishedVersionNumbers(linkRecord, "linkSetVersion");
        setLinkVersionOptions(versions);
        setLinkSetVersion((current) => {
          const candidate = preferredVersion ?? current;
          if (candidate !== null && versions.includes(candidate)) {
            return candidate;
          }
          return versions[0] ?? null;
        });
      } catch (error) {
        const message = toErrorMessage(error);
        setErrorMessage(message);
        notify(message, { type: "error" });
        setLinkVersionOptions([]);
        setLinkSetVersion(null);
      }
    },
    [notify],
  );

  const loadIconVersions = useCallback(
    async (targetIconSetId: string): Promise<number[]> => {
      if (!targetIconSetId) {
        return [];
      }

      const cached = iconVersionOptionsById[targetIconSetId];
      if (cached) {
        return cached;
      }

      try {
        const iconRecord = await scopedApiAdapter.get("icon-sets", targetIconSetId);
        const versions = extractPublishedVersionNumbers(iconRecord, "iconSetVersion");
        setIconVersionOptionsById((current) => ({
          ...current,
          [targetIconSetId]: versions,
        }));
        return versions;
      } catch (error) {
        const message = toErrorMessage(error);
        setErrorMessage(message);
        notify(message, { type: "error" });
        setIconVersionOptionsById((current) => ({
          ...current,
          [targetIconSetId]: [],
        }));
        return [];
      }
    },
    [iconVersionOptionsById, notify],
  );

  const loadLookupOptions = useCallback(async () => {
    setLoadingLookups(true);
    setErrorMessage(null);
    try {
      const [layoutList, iconList, linkList] = await Promise.all([
        scopedApiAdapter.list("layout-sets") as Promise<LayoutSetSummary[]>,
        scopedApiAdapter.list("icon-sets") as Promise<IconSetSummary[]>,
        scopedApiAdapter.list("link-sets") as Promise<LinkSetSummary[]>,
      ]);

      setLayoutOptions(
        layoutList
          .filter((item) => typeof item.publishedVersion === "number")
          .sort((left, right) => left.layoutSetId.localeCompare(right.layoutSetId)),
      );
      setIconOptions(
        iconList
          .filter((item) => typeof item.publishedVersion === "number")
          .sort((left, right) => left.iconSetId.localeCompare(right.iconSetId)),
      );
      setLinkOptions(
        linkList
          .filter((item) => typeof item.publishedVersion === "number")
          .sort((left, right) => left.linkSetId.localeCompare(right.linkSetId)),
      );
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setLoadingLookups(false);
    }
  }, [notify]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLookupOptions();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadLookupOptions]);

  const updateLayoutSet = (targetLayoutSetId: string) => {
    setLayoutSetId(targetLayoutSetId);
    setLayoutSetVersion(null);
    void loadLayoutVersions(targetLayoutSetId, null);
  };

  const updateLinkSet = (targetLinkSetId: string) => {
    setLinkSetId(targetLinkSetId);
    setLinkSetVersion(null);
    void loadLinkVersions(targetLinkSetId, null);
  };

  const addIconSetRow = () => {
    setIconRows((current) => [...current, createIconRow()]);
  };

  const removeIconSetRow = (rowId: number) => {
    setIconRows((current) => current.filter((row) => row.rowId !== rowId));
  };

  const updateIconSetId = (rowId: number, targetIconSetId: string) => {
    setIconRows((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              iconSetId: targetIconSetId,
              iconSetVersion: null,
            }
          : row,
      ),
    );

    if (!targetIconSetId) {
      return;
    }

    void loadIconVersions(targetIconSetId).then((versions) => {
      setIconRows((current) =>
        current.map((row) =>
          row.rowId === rowId
            ? {
                ...row,
                iconSetVersion: versions[0] ?? null,
              }
            : row,
        ),
      );
    });
  };

  const updateIconSetVersion = (rowId: number, value: string) => {
    const parsed = Number(value);
    setIconRows((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              iconSetVersion: Number.isFinite(parsed) ? parsed : null,
            }
          : row,
      ),
    );
  };

  const clearForm = () => {
    setGraphTypeId("");
    setDraftName("");
    setIconConflictPolicy("reject");
    setLayoutSetId("");
    setLayoutSetVersion(null);
    setLayoutVersionOptions([]);
    setLinkSetId("");
    setLinkSetVersion(null);
    setLinkVersionOptions([]);
    setIconRows([{ rowId: 0, iconSetId: "", iconSetVersion: null }]);
    setIconVersionOptionsById({});
    setErrorMessage(null);
    iconRowIdRef.current = 1;
  };

  const validateAndBuildPayload = (): GraphTypeCreateRequest => {
    const normalizedId = graphTypeId.trim();
    if (normalizedId.length === 0) {
      throw new Error("Graph type ID is required.");
    }

    const normalizedName = draftName.trim();
    if (normalizedName.length === 0) {
      throw new Error("Graph type name is required.");
    }

    if (!layoutSetId || layoutSetVersion === null) {
      throw new Error("Layout set and published version are required.");
    }

    if (!linkSetId || linkSetVersion === null) {
      throw new Error("Link set and published version are required.");
    }

    const normalizedIconSetRefs = iconRows
      .map((row) => ({
        iconSetId: row.iconSetId.trim(),
        iconSetVersion: row.iconSetVersion,
      }))
      .filter((row) => row.iconSetId.length > 0)
      .filter(
        (row): row is { iconSetId: string; iconSetVersion: number } =>
          row.iconSetVersion !== null,
      );

    if (normalizedIconSetRefs.length === 0) {
      throw new Error("At least one icon set reference is required.");
    }

    return {
      graphTypeId: normalizedId,
      name: normalizedName,
      layoutSetRef: {
        layoutSetId,
        layoutSetVersion,
      },
      iconSetRefs: normalizedIconSetRefs,
      linkSetRef: {
        linkSetId,
        linkSetVersion,
      },
      iconConflictPolicy,
    };
  };

  const createGraphType = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const payload = validateAndBuildPayload();
      await scopedApiAdapter.create("graph-types", payload);
      refresh();
      notify(`Graph type '${payload.graphTypeId}' created as draft.`, {
        type: "success",
      });
      redirect(`/graph-types/${payload.graphTypeId}/edit`);
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Create Graph Type" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            No JSON needed. Select published layout/icon/link sets to create a draft graph
            type.
          </Alert>
          <TextField
            label="Graph Type ID"
            value={graphTypeId}
            onChange={(event) => setGraphTypeId(event.target.value)}
            placeholder="e.g. app-graph"
            fullWidth
            size="small"
          />
          <TextField
            label="Name"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            placeholder="e.g. App Graph Type"
            fullWidth
            size="small"
          />
          <TextField
            select
            label="Icon Conflict Policy"
            value={iconConflictPolicy}
            onChange={(event) =>
              setIconConflictPolicy(
                event.target.value as "reject" | "first-wins" | "last-wins",
              )
            }
            fullWidth
            size="small"
          >
            {conflictOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <SectionHeader title="Layout Set" />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              select
              label="Layout Set"
              value={layoutSetId}
              onChange={(event) => updateLayoutSet(event.target.value)}
              fullWidth
              size="small"
              disabled={loadingLookups}
            >
              <MenuItem value="">Select layout set</MenuItem>
              {layoutOptions.map((option) => (
                <MenuItem key={option.layoutSetId} value={option.layoutSetId}>
                  {option.layoutSetId} ({option.name})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Version"
              value={layoutSetVersion ?? ""}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                setLayoutSetVersion(Number.isFinite(parsed) ? parsed : null);
              }}
              fullWidth
              size="small"
              disabled={!layoutSetId || layoutVersionOptions.length === 0}
            >
              {layoutVersionOptions.map((version) => (
                <MenuItem key={version} value={version}>
                  v{version}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <SectionHeader title="Icon Sets" />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Icon Set</TableCell>
                <TableCell>Version</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {iconRows.map((row) => {
                const iconVersionOptions = row.iconSetId
                  ? (iconVersionOptionsById[row.iconSetId] ?? [])
                  : [];

                return (
                  <TableRow key={row.rowId}>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={row.iconSetId}
                        onChange={(event) =>
                          updateIconSetId(row.rowId, event.target.value)
                        }
                        disabled={loadingLookups}
                      >
                        <MenuItem value="">Select icon set</MenuItem>
                        {iconOptions.map((option) => (
                          <MenuItem key={option.iconSetId} value={option.iconSetId}>
                            {option.iconSetId} ({option.name})
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={row.iconSetVersion ?? ""}
                        onChange={(event) =>
                          updateIconSetVersion(row.rowId, event.target.value)
                        }
                        disabled={!row.iconSetId || iconVersionOptions.length === 0}
                      >
                        {iconVersionOptions.map((version) => (
                          <MenuItem key={version} value={version}>
                            v{version}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Remove">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeIconSetRow(row.rowId)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addIconSetRow}
            disabled={loadingLookups}
          >
            Add Icon Set
          </Button>

          <SectionHeader title="Link Set" />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              select
              label="Link Set"
              value={linkSetId}
              onChange={(event) => updateLinkSet(event.target.value)}
              fullWidth
              size="small"
              disabled={loadingLookups}
            >
              <MenuItem value="">Select link set</MenuItem>
              {linkOptions.map((option) => (
                <MenuItem key={option.linkSetId} value={option.linkSetId}>
                  {option.linkSetId} ({option.name})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Version"
              value={linkSetVersion ?? ""}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                setLinkSetVersion(Number.isFinite(parsed) ? parsed : null);
              }}
              fullWidth
              size="small"
              disabled={!linkSetId || linkVersionOptions.length === 0}
            >
              {linkVersionOptions.map((version) => (
                <MenuItem key={version} value={version}>
                  v{version}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <PanelError message={errorMessage} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="contained" onClick={createGraphType} disabled={busy}>
              Create Graph Type
            </Button>
            <Button variant="outlined" onClick={clearForm} disabled={busy}>
              Clear
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}

export function GraphTypePublishedView() {
  const record = useRecordContext<RaRecord>();
  const notify = useNotify();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [layoutSetName, setLayoutSetName] = useState<string | null>(null);
  const [linkSetName, setLinkSetName] = useState<string | null>(null);
  const [iconSetNames, setIconSetNames] = useState<Record<string, string>>({});

  const graphTypeId = typeof record?.graphTypeId === "string" ? record.graphTypeId : "";
  const graphTypeName = typeof record?.name === "string" ? record.name : "";
  const graphTypeVersion =
    typeof record?.graphTypeVersion === "number" ? record.graphTypeVersion : null;
  const updatedAt = typeof record?.updatedAt === "string" ? record.updatedAt : "";
  const iconConflictPolicy =
    typeof record?.iconConflictPolicy === "string" ? record.iconConflictPolicy : "";

  const layoutSetRef = useMemo(
    () => parseGraphLayoutSetRef(record?.layoutSetRef),
    [record?.layoutSetRef],
  );
  const linkSetRef = useMemo(
    () => parseGraphLinkSetRef(record?.linkSetRef),
    [record?.linkSetRef],
  );
  const iconSetRefs = useMemo(
    () => parseGraphIconSetRefs(record?.iconSetRefs),
    [record?.iconSetRefs],
  );
  const iconSetIds = useMemo(
    () => [...new Set(iconSetRefs.map((ref) => ref.iconSetId))].sort(),
    [iconSetRefs],
  );

  const loadReferenceNames = useCallback(async () => {
    setBusy(true);
    setErrorMessage(null);

    let nextLayoutSetName: string | null = null;
    let nextLinkSetName: string | null = null;
    const nextIconSetNames: Record<string, string> = {};
    let hasLoadError = false;

    if (layoutSetRef) {
      try {
        const layoutRecord = (await scopedApiAdapter.get(
          "layout-sets",
          layoutSetRef.layoutSetId,
        )) as LayoutSetRecord;
        nextLayoutSetName = extractDraftName(layoutRecord) ?? layoutSetRef.layoutSetId;
      } catch {
        nextLayoutSetName = layoutSetRef.layoutSetId;
        hasLoadError = true;
      }
    }

    if (linkSetRef) {
      try {
        const linkRecord = (await scopedApiAdapter.get(
          "link-sets",
          linkSetRef.linkSetId,
        )) as LinkSetRecord;
        nextLinkSetName = extractDraftName(linkRecord) ?? linkSetRef.linkSetId;
      } catch {
        nextLinkSetName = linkSetRef.linkSetId;
        hasLoadError = true;
      }
    }

    await Promise.all(
      iconSetIds.map(async (iconSetId) => {
        try {
          const iconRecord = (await scopedApiAdapter.get(
            "icon-sets",
            iconSetId,
          )) as IconSetRecord;
          nextIconSetNames[iconSetId] = extractDraftName(iconRecord) ?? iconSetId;
        } catch {
          nextIconSetNames[iconSetId] = iconSetId;
          hasLoadError = true;
        }
      }),
    );

    setLayoutSetName(nextLayoutSetName);
    setLinkSetName(nextLinkSetName);
    setIconSetNames(nextIconSetNames);

    if (hasLoadError) {
      const message = "Some referenced set names could not be loaded.";
      setErrorMessage(message);
      notify(message, { type: "warning" });
    }

    setBusy(false);
  }, [iconSetIds, layoutSetRef, linkSetRef, notify]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadReferenceNames();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadReferenceNames]);

  if (!graphTypeId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Graph Type" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            JSON is hidden in this view. Linked set names and versions are shown below.
          </Alert>
          <Button
            variant="outlined"
            onClick={loadReferenceNames}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            Refresh Linked Names
          </Button>
          <PanelError message={errorMessage} />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Typography variant="body2">
              <strong>ID:</strong> {graphTypeId}
            </Typography>
            <Typography variant="body2">
              <strong>Name:</strong> {graphTypeName}
            </Typography>
            <Typography variant="body2">
              <strong>Version:</strong> {graphTypeVersion ?? "-"}
            </Typography>
          </Stack>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Typography variant="body2">
              <strong>Updated:</strong>{" "}
              {updatedAt ? new Date(updatedAt).toLocaleString() : "-"}
            </Typography>
            <Typography variant="body2">
              <strong>Icon Conflict:</strong> {iconConflictPolicy || "-"}
            </Typography>
          </Stack>

          <SectionHeader title="Layout Set" />
          {layoutSetRef ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Version</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{layoutSetName ?? layoutSetRef.layoutSetId}</TableCell>
                  <TableCell>{layoutSetRef.layoutSetId}</TableCell>
                  <TableCell>{layoutSetRef.layoutSetVersion}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <EmptyMessage text="No layout-set reference configured." />
          )}

          <SectionHeader title="Icon Sets" />
          {iconSetRefs.length === 0 ? (
            <EmptyMessage text="No icon-set references configured." />
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Version</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {iconSetRefs.map((iconSetRef, index) => (
                  <TableRow
                    key={`${iconSetRef.iconSetId}:${iconSetRef.iconSetVersion}:${index}`}
                  >
                    <TableCell>
                      {iconSetNames[iconSetRef.iconSetId] ?? iconSetRef.iconSetId}
                    </TableCell>
                    <TableCell>{iconSetRef.iconSetId}</TableCell>
                    <TableCell>{iconSetRef.iconSetVersion}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <SectionHeader title="Link Set" />
          {linkSetRef ? (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>ID</TableCell>
                  <TableCell>Version</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{linkSetName ?? linkSetRef.linkSetId}</TableCell>
                  <TableCell>{linkSetRef.linkSetId}</TableCell>
                  <TableCell>{linkSetRef.linkSetVersion}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          ) : (
            <EmptyMessage text="No link-set reference configured." />
          )}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function GraphTypeDraftEditor() {
  const record = useRecordContext<RaRecord>();
  const { notify, refresh, resourceId } = useOperationContext("graphTypeId");
  const [busy, setBusy] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const [draftName, setDraftName] = useState("");
  const [iconConflictPolicy, setIconConflictPolicy] = useState<
    "reject" | "first-wins" | "last-wins"
  >("reject");

  const [layoutSetId, setLayoutSetId] = useState("");
  const [layoutSetVersion, setLayoutSetVersion] = useState<number | null>(null);
  const [layoutVersionOptions, setLayoutVersionOptions] = useState<number[]>([]);

  const [linkSetId, setLinkSetId] = useState("");
  const [linkSetVersion, setLinkSetVersion] = useState<number | null>(null);
  const [linkVersionOptions, setLinkVersionOptions] = useState<number[]>([]);

  const [iconRows, setIconRows] = useState<GraphIconSetRefRow[]>([]);
  const [iconVersionOptionsById, setIconVersionOptionsById] = useState<
    Record<string, number[]>
  >({});

  const [layoutOptions, setLayoutOptions] = useState<LayoutSetSummary[]>([]);
  const [iconOptions, setIconOptions] = useState<IconSetSummary[]>([]);
  const [linkOptions, setLinkOptions] = useState<LinkSetSummary[]>([]);

  const iconRowIdRef = useRef(1);
  const appliedDraftSignatureRef = useRef<string | null>(null);

  const draftSource = useMemo(() => {
    if (!isObjectRecord(record)) {
      return null;
    }

    if (isObjectRecord(record.draft)) {
      return record.draft;
    }

    return record;
  }, [record]);

  const hasDraftData = useMemo(() => {
    if (!draftSource) {
      return false;
    }

    return (
      typeof draftSource.name === "string" ||
      isObjectRecord(draftSource.layoutSetRef) ||
      isObjectRecord(draftSource.linkSetRef) ||
      Array.isArray(draftSource.iconSetRefs)
    );
  }, [draftSource]);

  const draftSignature = useMemo(() => {
    if (!draftSource) {
      return `${resourceId ?? ""}:empty`;
    }

    const layoutRef = parseGraphLayoutSetRef(draftSource.layoutSetRef);
    const linkRef = parseGraphLinkSetRef(draftSource.linkSetRef);
    const iconRefSignature = parseGraphIconSetRefs(draftSource.iconSetRefs)
      .map((ref) => `${ref.iconSetId}:${ref.iconSetVersion}`)
      .sort((left, right) => left.localeCompare(right))
      .join("|");

    const version =
      typeof draftSource.graphTypeVersion === "number"
        ? String(draftSource.graphTypeVersion)
        : typeof record?.draftVersion === "number"
          ? String(record.draftVersion)
          : "";
    const updatedAt =
      typeof draftSource.updatedAt === "string"
        ? draftSource.updatedAt
        : typeof record?.updatedAt === "string"
          ? record.updatedAt
          : "";
    const name = typeof draftSource.name === "string" ? draftSource.name : "";
    const iconPolicy =
      typeof draftSource.iconConflictPolicy === "string"
        ? draftSource.iconConflictPolicy
        : "";

    return [
      resourceId ?? "",
      version,
      updatedAt,
      name,
      iconPolicy,
      layoutRef ? `${layoutRef.layoutSetId}:${layoutRef.layoutSetVersion}` : "",
      linkRef ? `${linkRef.linkSetId}:${linkRef.linkSetVersion}` : "",
      iconRefSignature,
    ].join("::");
  }, [draftSource, record?.draftVersion, record?.updatedAt, resourceId]);

  const createIconRow = useCallback(
    (iconSetId = "", iconSetVersion: number | null = null): GraphIconSetRefRow => ({
      rowId: iconRowIdRef.current++,
      iconSetId,
      iconSetVersion,
    }),
    [],
  );

  const loadLayoutVersions = useCallback(
    async (targetLayoutSetId: string, preferredVersion: number | null) => {
      if (!targetLayoutSetId) {
        setLayoutVersionOptions([]);
        setLayoutSetVersion(null);
        return;
      }

      try {
        const layoutRecord = await scopedApiAdapter.get("layout-sets", targetLayoutSetId);
        const versions = extractPublishedVersionNumbers(layoutRecord, "layoutSetVersion");
        setLayoutVersionOptions(versions);
        setLayoutSetVersion((current) => {
          const candidate = preferredVersion ?? current;
          if (candidate !== null && versions.includes(candidate)) {
            return candidate;
          }
          return versions[0] ?? null;
        });
      } catch (error) {
        const message = toErrorMessage(error);
        setErrorMessage(message);
        notify(message, { type: "error" });
        setLayoutVersionOptions([]);
        setLayoutSetVersion(null);
      }
    },
    [notify],
  );

  const loadLinkVersions = useCallback(
    async (targetLinkSetId: string, preferredVersion: number | null) => {
      if (!targetLinkSetId) {
        setLinkVersionOptions([]);
        setLinkSetVersion(null);
        return;
      }

      try {
        const linkRecord = await scopedApiAdapter.get("link-sets", targetLinkSetId);
        const versions = extractPublishedVersionNumbers(linkRecord, "linkSetVersion");
        setLinkVersionOptions(versions);
        setLinkSetVersion((current) => {
          const candidate = preferredVersion ?? current;
          if (candidate !== null && versions.includes(candidate)) {
            return candidate;
          }
          return versions[0] ?? null;
        });
      } catch (error) {
        const message = toErrorMessage(error);
        setErrorMessage(message);
        notify(message, { type: "error" });
        setLinkVersionOptions([]);
        setLinkSetVersion(null);
      }
    },
    [notify],
  );

  const loadIconVersions = useCallback(
    async (targetIconSetId: string): Promise<number[]> => {
      if (!targetIconSetId) {
        return [];
      }

      const cached = iconVersionOptionsById[targetIconSetId];
      if (cached) {
        return cached;
      }

      try {
        const iconRecord = await scopedApiAdapter.get("icon-sets", targetIconSetId);
        const versions = extractPublishedVersionNumbers(iconRecord, "iconSetVersion");
        setIconVersionOptionsById((current) => ({
          ...current,
          [targetIconSetId]: versions,
        }));
        return versions;
      } catch (error) {
        const message = toErrorMessage(error);
        setErrorMessage(message);
        notify(message, { type: "error" });
        setIconVersionOptionsById((current) => ({
          ...current,
          [targetIconSetId]: [],
        }));
        return [];
      }
    },
    [iconVersionOptionsById, notify],
  );

  const applyDraftSnapshot = useCallback(
    (source: unknown, loadVersions: boolean) => {
      const sourceRecord = isObjectRecord(source) ? source : {};
      const draft = isObjectRecord(sourceRecord.draft)
        ? sourceRecord.draft
        : sourceRecord;

      setDraftName(typeof draft.name === "string" ? draft.name : "");

      const nextConflictPolicy = draft.iconConflictPolicy;
      setIconConflictPolicy(
        nextConflictPolicy === "reject" ||
          nextConflictPolicy === "first-wins" ||
          nextConflictPolicy === "last-wins"
          ? nextConflictPolicy
          : "reject",
      );

      const parsedLayoutSetRef = parseGraphLayoutSetRef(draft.layoutSetRef);
      const parsedLinkSetRef = parseGraphLinkSetRef(draft.linkSetRef);
      const parsedIconSetRefs = parseGraphIconSetRefs(draft.iconSetRefs);

      setLayoutSetId(parsedLayoutSetRef?.layoutSetId ?? "");
      setLayoutSetVersion(parsedLayoutSetRef?.layoutSetVersion ?? null);

      setLinkSetId(parsedLinkSetRef?.linkSetId ?? "");
      setLinkSetVersion(parsedLinkSetRef?.linkSetVersion ?? null);

      const nextIconRows =
        parsedIconSetRefs.length > 0
          ? parsedIconSetRefs.map((iconSetRef) =>
              createIconRow(iconSetRef.iconSetId, iconSetRef.iconSetVersion),
            )
          : [createIconRow()];
      setIconRows(nextIconRows);

      if (!loadVersions) {
        return;
      }

      window.setTimeout(() => {
        void loadLayoutVersions(
          parsedLayoutSetRef?.layoutSetId ?? "",
          parsedLayoutSetRef?.layoutSetVersion ?? null,
        );
        void loadLinkVersions(
          parsedLinkSetRef?.linkSetId ?? "",
          parsedLinkSetRef?.linkSetVersion ?? null,
        );
        nextIconRows.forEach((iconRow) => {
          if (!iconRow.iconSetId) {
            return;
          }
          void loadIconVersions(iconRow.iconSetId).then((versions) => {
            setIconRows((current) =>
              current.map((candidate) =>
                candidate.rowId === iconRow.rowId
                  ? {
                      ...candidate,
                      iconSetVersion:
                        candidate.iconSetVersion !== null &&
                        versions.includes(candidate.iconSetVersion)
                          ? candidate.iconSetVersion
                          : (versions[0] ?? null),
                    }
                  : candidate,
              ),
            );
          });
        });
      }, 0);
    },
    [createIconRow, loadIconVersions, loadLayoutVersions, loadLinkVersions],
  );

  const loadLookupOptions = useCallback(async () => {
    setLoadingLookups(true);
    setErrorMessage(null);
    try {
      const [layoutList, iconList, linkList] = await Promise.all([
        scopedApiAdapter.list("layout-sets") as Promise<LayoutSetSummary[]>,
        scopedApiAdapter.list("icon-sets") as Promise<IconSetSummary[]>,
        scopedApiAdapter.list("link-sets") as Promise<LinkSetSummary[]>,
      ]);

      setLayoutOptions(
        layoutList
          .filter((item) => typeof item.publishedVersion === "number")
          .sort((left, right) => left.layoutSetId.localeCompare(right.layoutSetId)),
      );
      setIconOptions(
        iconList
          .filter((item) => typeof item.publishedVersion === "number")
          .sort((left, right) => left.iconSetId.localeCompare(right.iconSetId)),
      );
      setLinkOptions(
        linkList
          .filter((item) => typeof item.publishedVersion === "number")
          .sort((left, right) => left.linkSetId.localeCompare(right.linkSetId)),
      );
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setLoadingLookups(false);
    }
  }, [notify]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLookupOptions();
    }, 0);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [loadLookupOptions]);

  useEffect(() => {
    if (!hasDraftData) {
      return;
    }

    if (appliedDraftSignatureRef.current === draftSignature) {
      return;
    }
    applyDraftSnapshot(record, true);
    appliedDraftSignatureRef.current = draftSignature;
    setIsDirty(false);
    setErrorMessage(null);
  }, [applyDraftSnapshot, draftSignature, hasDraftData, record]);

  const updateLayoutSet = (targetLayoutSetId: string) => {
    setLayoutSetId(targetLayoutSetId);
    setLayoutSetVersion(null);
    setIsDirty(true);
    void loadLayoutVersions(targetLayoutSetId, null);
  };

  const updateLinkSet = (targetLinkSetId: string) => {
    setLinkSetId(targetLinkSetId);
    setLinkSetVersion(null);
    setIsDirty(true);
    void loadLinkVersions(targetLinkSetId, null);
  };

  const addIconSetRow = () => {
    setIconRows((current) => [...current, createIconRow()]);
    setIsDirty(true);
  };

  const removeIconSetRow = (rowId: number) => {
    setIconRows((current) => current.filter((row) => row.rowId !== rowId));
    setIsDirty(true);
  };

  const updateIconSetId = (rowId: number, targetIconSetId: string) => {
    setIconRows((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              iconSetId: targetIconSetId,
              iconSetVersion: null,
            }
          : row,
      ),
    );
    setIsDirty(true);

    if (!targetIconSetId) {
      return;
    }

    void loadIconVersions(targetIconSetId).then((versions) => {
      setIconRows((current) =>
        current.map((row) =>
          row.rowId === rowId
            ? {
                ...row,
                iconSetVersion: versions[0] ?? null,
              }
            : row,
        ),
      );
    });
  };

  const updateIconSetVersion = (rowId: number, value: string) => {
    const parsed = Number(value);
    setIconRows((current) =>
      current.map((row) =>
        row.rowId === rowId
          ? {
              ...row,
              iconSetVersion: Number.isFinite(parsed) ? parsed : null,
            }
          : row,
      ),
    );
    setIsDirty(true);
  };

  const validateAndBuildPayload = (): GraphTypeUpdateRequest => {
    const normalizedName = draftName.trim();
    if (normalizedName.length === 0) {
      throw new Error("Graph type name is required.");
    }

    if (!layoutSetId || layoutSetVersion === null) {
      throw new Error("Layout set and published version are required.");
    }

    if (!linkSetId || linkSetVersion === null) {
      throw new Error("Link set and published version are required.");
    }

    const normalizedIconSetRefs = iconRows
      .filter((row) => row.iconSetId.length > 0)
      .map((row) => ({
        iconSetId: row.iconSetId,
        iconSetVersion: row.iconSetVersion,
      }))
      .filter(
        (row): row is { iconSetId: string; iconSetVersion: number } =>
          row.iconSetVersion !== null,
      );

    if (normalizedIconSetRefs.length === 0) {
      throw new Error("At least one icon set reference is required.");
    }

    return {
      name: normalizedName,
      layoutSetRef: {
        layoutSetId,
        layoutSetVersion,
      },
      iconSetRefs: normalizedIconSetRefs,
      linkSetRef: {
        linkSetId,
        linkSetVersion,
      },
      iconConflictPolicy,
    };
  };

  const saveDraft = async () => {
    if (!resourceId) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      const payload = validateAndBuildPayload();
      const response = await scopedApiAdapter.update("graph-types", resourceId, payload);
      applyDraftSnapshot(response, true);
      setIsDirty(false);
      refresh();

      const responseRecord: Record<string, unknown> = isObjectRecord(response)
        ? response
        : {};
      const responseDraft = isObjectRecord(responseRecord.draft)
        ? responseRecord.draft
        : responseRecord;
      const nextVersion =
        typeof responseDraft.graphTypeVersion === "number"
          ? responseDraft.graphTypeVersion
          : undefined;
      const versionLabel = nextVersion !== undefined ? ` (v${nextVersion})` : "";
      notify(`Draft saved${versionLabel}`, { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const publishDraft = async () => {
    if (!resourceId) {
      return;
    }

    setBusy(true);
    setErrorMessage(null);
    try {
      if (isDirty) {
        const payload = validateAndBuildPayload();
        const response = await scopedApiAdapter.update(
          "graph-types",
          resourceId,
          payload,
        );
        applyDraftSnapshot(response, true);
      }

      const published = (await scopedApiAdapter.publish(
        "graph-types",
        resourceId,
      )) as GraphTypeBundle;
      refresh();
      setIsDirty(false);
      notify(`Published v${published.graphTypeVersion}`, { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const resetDraft = () => {
    applyDraftSnapshot(record, true);
    setIsDirty(false);
    setErrorMessage(null);
  };

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  return (
    <Card variant="outlined">
      <CardHeader title="Draft Graph Type Editor" />
      <CardContent>
        <Stack spacing={2}>
          <Alert severity="info">
            Edit draft references with dropdowns, then save or publish.
          </Alert>
          <TextField
            label="Name"
            value={draftName}
            onChange={(event) => {
              setDraftName(event.target.value);
              setIsDirty(true);
            }}
            fullWidth
          />
          <TextField
            select
            label="Icon Conflict Policy"
            value={iconConflictPolicy}
            onChange={(event) => {
              setIconConflictPolicy(
                event.target.value as "reject" | "first-wins" | "last-wins",
              );
              setIsDirty(true);
            }}
            fullWidth
          >
            {conflictOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>

          <SectionHeader title="Layout Set" />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              select
              label="Layout Set"
              value={layoutSetId}
              onChange={(event) => updateLayoutSet(event.target.value)}
              fullWidth
              disabled={loadingLookups}
            >
              <MenuItem value="">Select layout set</MenuItem>
              {layoutOptions.map((option) => (
                <MenuItem key={option.layoutSetId} value={option.layoutSetId}>
                  {option.layoutSetId} ({option.name})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Version"
              value={layoutSetVersion ?? ""}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                setLayoutSetVersion(Number.isFinite(parsed) ? parsed : null);
                setIsDirty(true);
              }}
              fullWidth
              disabled={!layoutSetId || layoutVersionOptions.length === 0}
            >
              {layoutVersionOptions.map((version) => (
                <MenuItem key={version} value={version}>
                  v{version}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <SectionHeader title="Icon Sets" />
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Icon Set</TableCell>
                <TableCell>Version</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {iconRows.map((row) => {
                const iconVersionOptions = row.iconSetId
                  ? (iconVersionOptionsById[row.iconSetId] ?? [])
                  : [];

                return (
                  <TableRow key={row.rowId}>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={row.iconSetId}
                        onChange={(event) =>
                          updateIconSetId(row.rowId, event.target.value)
                        }
                        disabled={loadingLookups}
                      >
                        <MenuItem value="">Select icon set</MenuItem>
                        {iconOptions.map((option) => (
                          <MenuItem key={option.iconSetId} value={option.iconSetId}>
                            {option.iconSetId} ({option.name})
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={row.iconSetVersion ?? ""}
                        onChange={(event) =>
                          updateIconSetVersion(row.rowId, event.target.value)
                        }
                        disabled={!row.iconSetId || iconVersionOptions.length === 0}
                      >
                        {iconVersionOptions.map((version) => (
                          <MenuItem key={version} value={version}>
                            v{version}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell align="right">
                      <Tooltip title="Remove">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeIconSetRow(row.rowId)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addIconSetRow}
            disabled={loadingLookups}
          >
            Add Icon Set
          </Button>

          <SectionHeader title="Link Set" />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField
              select
              label="Link Set"
              value={linkSetId}
              onChange={(event) => updateLinkSet(event.target.value)}
              fullWidth
              disabled={loadingLookups}
            >
              <MenuItem value="">Select link set</MenuItem>
              {linkOptions.map((option) => (
                <MenuItem key={option.linkSetId} value={option.linkSetId}>
                  {option.linkSetId} ({option.name})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Version"
              value={linkSetVersion ?? ""}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                setLinkSetVersion(Number.isFinite(parsed) ? parsed : null);
                setIsDirty(true);
              }}
              fullWidth
              disabled={!linkSetId || linkVersionOptions.length === 0}
            >
              {linkVersionOptions.map((version) => (
                <MenuItem key={version} value={version}>
                  v{version}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button variant="outlined" onClick={resetDraft} disabled={busy || !isDirty}>
              Reset Changes
            </Button>
            <Button
              variant="contained"
              onClick={saveDraft}
              disabled={busy || !isDirty}
              startIcon={busy ? <CircularProgress size={16} /> : undefined}
            >
              Save Draft
            </Button>
            <Button variant="outlined" onClick={publishDraft} disabled={busy}>
              Publish Draft
            </Button>
          </Stack>

          <PanelError message={errorMessage} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function GraphRuntimePanel({ idField }: Pick<BaseOperationProps, "idField">) {
  const { notify, resourceId } = useOperationContext(idField);
  const [query, setQuery] = useState<StageVersionState>(defaultStageQuery());
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  const loadRuntime = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const payload = await scopedApiAdapter.getGraphRuntime(resourceId, {
        stage: query.stage,
        version: parseVersionOrThrow(query.version),
      });
      setResult(payload);
      notify("Runtime loaded", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Runtime" />
      <CardContent>
        <Stack spacing={2}>
          <StageVersionControls state={query} onChange={setQuery} />
          <Button
            variant="outlined"
            onClick={loadRuntime}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            Load Runtime
          </Button>
          <PanelError message={errorMessage} />
          <JsonPreview value={result} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function IconResolvePanel() {
  const notify = useNotify();
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [conflictPolicy, setConflictPolicy] = useState<
    "reject" | "first-wins" | "last-wins"
  >("reject");
  const [refsJson, setRefsJson] = useState(
    '[\n  {\n    "iconSetId": "",\n    "stage": "draft"\n  }\n]',
  );

  const runResolve = async () => {
    setBusy(true);
    setErrorMessage(null);
    try {
      const refs = parseJsonOrThrow(refsJson, "Icon set refs");
      if (!Array.isArray(refs) || refs.length === 0) {
        throw new Error("Icon set refs must be a non-empty JSON array.");
      }

      const payload: IconSetResolveRequest = {
        iconSetRefs: refs as IconSetResolveRequest["iconSetRefs"],
        conflictPolicy,
      };

      const response = await scopedApiAdapter.resolveIconSets(payload);
      setResult(response);
      notify("Resolve completed", { type: "success" });
    } catch (error) {
      const message = toErrorMessage(error);
      setErrorMessage(message);
      notify(message, { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Resolve Icon Sets" />
      <CardContent>
        <Stack spacing={2}>
          <TextField
            select
            label="Conflict Policy"
            value={conflictPolicy}
            onChange={(event) =>
              setConflictPolicy(
                event.target.value as "reject" | "first-wins" | "last-wins",
              )
            }
            size="small"
          >
            {conflictOptions.map((option) => (
              <MenuItem key={option} value={option}>
                {option}
              </MenuItem>
            ))}
          </TextField>
          <JsonMonacoEditor
            label="Icon Set Refs JSON"
            value={refsJson}
            onChange={setRefsJson}
            minHeight={960}
            testId="icon-set-refs-json-editor"
          />
          <Button
            variant="outlined"
            onClick={runResolve}
            disabled={busy}
            startIcon={busy ? <CircularProgress size={16} /> : <RefreshIcon />}
          >
            Resolve
          </Button>
          <PanelError message={errorMessage} />
          <JsonPreview value={result} collapsedByDefault />
        </Stack>
      </CardContent>
    </Card>
  );
}

export function IconSetOperations() {
  return (
    <Stack spacing={2}>
      <Divider />
      <BundleAndPublishPanel resource="icon-sets" idField="iconSetId" />
      <IconSetEntriesPanel idField="iconSetId" />
      <IconResolvePanel />
    </Stack>
  );
}

export function LayoutSetOperations() {
  return (
    <Stack spacing={2}>
      <Divider />
      <BundleAndPublishPanel resource="layout-sets" idField="layoutSetId" />
      <LayoutSetEntriesPanel idField="layoutSetId" />
    </Stack>
  );
}

export function LinkSetOperations() {
  return (
    <Stack spacing={2}>
      <Divider />
      <BundleAndPublishPanel resource="link-sets" idField="linkSetId" />
      <LinkSetEntriesPanel idField="linkSetId" />
    </Stack>
  );
}

export function GraphTypeOperations() {
  return (
    <Stack spacing={2}>
      <Divider />
      <BundleAndPublishPanel resource="graph-types" idField="graphTypeId" />
      <GraphRuntimePanel idField="graphTypeId" />
    </Stack>
  );
}

export function ThemeOperations() {
  return (
    <Stack spacing={2}>
      <Divider />
      <BundleAndPublishPanel resource="themes" idField="themeId" />
      <ThemeVariablesPanel idField="themeId" />
    </Stack>
  );
}
