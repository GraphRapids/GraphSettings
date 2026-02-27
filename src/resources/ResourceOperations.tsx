import { useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useNotify, useRecordContext, useRefresh, type RaRecord } from "react-admin";

import {
  scopedApiAdapter,
  type ResourceStage,
  type StageVersionQuery,
} from "../api/scopedApiAdapter";
import type {
  IconSetResolveRequest,
  LayoutSetEntryUpsertRequest,
  LinkSetEntryUpsertRequest,
  ThemeVariableUpsertRequest,
} from "../api/scopedTypes";
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

const stageOptions: ResourceStage[] = ["published", "draft"];
const conflictOptions: Array<"reject" | "first-wins" | "last-wins"> = [
  "reject",
  "first-wins",
  "last-wins",
];

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

function parseObjectJsonOrThrow(value: string, label: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value) as unknown;

    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new Error();
    }

    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`${label} must be a valid JSON object.`);
  }
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

function JsonPreview({ value }: { readonly value: unknown }): ReactNode {
  if (value === null) {
    return null;
  }

  return (
    <Box
      component="pre"
      sx={{
        mt: 2,
        mb: 0,
        p: 2,
        borderRadius: 1,
        overflowX: "auto",
        backgroundColor: "grey.100",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {JSON.stringify(value, null, 2)}
    </Box>
  );
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

function BundleAndPublishPanel({ resource, idField }: BaseOperationProps) {
  const { notify, refresh, resourceId } = useOperationContext(idField);
  const [query, setQuery] = useState<StageVersionState>({
    stage: "published",
    version: "",
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  const runGetBundle = async () => {
    if (!resourceId) {
      return;
    }

    setBusy(true);
    try {
      const queryPayload: StageVersionQuery = {
        stage: query.stage,
        version: parseVersionOrThrow(query.version),
      };
      const bundle = await scopedApiAdapter.getBundle(resource, resourceId, queryPayload);
      setResult(bundle);
      notify("Bundle loaded", { type: "success" });
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const runPublish = async () => {
    if (!resourceId) {
      return;
    }

    setBusy(true);
    try {
      const payload = await scopedApiAdapter.publish(resource, resourceId);
      setResult(payload);
      notify("Published successfully", { type: "success" });
      refresh();
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
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
          <StageVersionControls state={query} onChange={setQuery} />
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button variant="outlined" onClick={runGetBundle} disabled={busy}>
              Load Bundle
            </Button>
            <Button variant="contained" onClick={runPublish} disabled={busy}>
              Publish Draft
            </Button>
          </Stack>
          <JsonPreview value={result} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function IconSetEntriesPanel({ idField }: Pick<BaseOperationProps, "idField">) {
  const { notify, refresh, resourceId } = useOperationContext(idField);
  const [query, setQuery] = useState<StageVersionState>({
    stage: "published",
    version: "",
  });
  const [entryKey, setEntryKey] = useState("");
  const [entryIcon, setEntryIcon] = useState("");
  const [deleteKey, setDeleteKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  const loadEntries = async () => {
    setBusy(true);
    try {
      const payload = await scopedApiAdapter.getIconEntries(resourceId, {
        stage: query.stage,
        version: parseVersionOrThrow(query.version),
      });
      setResult(payload);
      notify("Entries loaded", { type: "success" });
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const upsertEntry = async () => {
    if (entryKey.trim().length === 0 || entryIcon.trim().length === 0) {
      notify("Entry key and icon are required.", { type: "warning" });
      return;
    }

    setBusy(true);
    try {
      const payload = await scopedApiAdapter.upsertIconEntry(
        resourceId,
        entryKey.trim(),
        {
          icon: entryIcon.trim(),
        },
      );
      setResult(payload);
      notify("Entry upserted", { type: "success" });
      refresh();
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const deleteEntry = async () => {
    if (deleteKey.trim().length === 0) {
      notify("Entry key is required.", { type: "warning" });
      return;
    }

    if (!window.confirm(`Delete icon entry '${deleteKey.trim()}'?`)) {
      return;
    }

    setBusy(true);
    try {
      const payload = await scopedApiAdapter.deleteIconEntry(
        resourceId,
        deleteKey.trim(),
      );
      setResult(payload);
      notify("Entry deleted", { type: "success" });
      refresh();
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Entries CRUD" />
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle2">Read entries</Typography>
          <StageVersionControls state={query} onChange={setQuery} />
          <Button variant="outlined" onClick={loadEntries} disabled={busy}>
            Load Entries
          </Button>

          <Divider />

          <Typography variant="subtitle2">Upsert entry</Typography>
          <TextField
            label="Entry Key"
            value={entryKey}
            onChange={(event) => setEntryKey(event.target.value)}
            size="small"
          />
          <TextField
            label="Icon"
            value={entryIcon}
            onChange={(event) => setEntryIcon(event.target.value)}
            size="small"
          />
          <Button variant="contained" onClick={upsertEntry} disabled={busy}>
            Upsert Entry
          </Button>

          <Divider />

          <Typography variant="subtitle2">Delete entry</Typography>
          <TextField
            label="Entry Key"
            value={deleteKey}
            onChange={(event) => setDeleteKey(event.target.value)}
            size="small"
          />
          <Button color="error" variant="outlined" onClick={deleteEntry} disabled={busy}>
            Delete Entry
          </Button>

          <JsonPreview value={result} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function LayoutSetEntriesPanel({ idField }: Pick<BaseOperationProps, "idField">) {
  const { notify, refresh, resourceId } = useOperationContext(idField);
  const [query, setQuery] = useState<StageVersionState>({
    stage: "published",
    version: "",
  });
  const [entryKey, setEntryKey] = useState("");
  const [entryValueJson, setEntryValueJson] = useState("{}");
  const [deleteKey, setDeleteKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  const loadEntries = async () => {
    setBusy(true);
    try {
      const payload = await scopedApiAdapter.getLayoutEntries(resourceId, {
        stage: query.stage,
        version: parseVersionOrThrow(query.version),
      });
      setResult(payload);
      notify("Entries loaded", { type: "success" });
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const upsertEntry = async () => {
    if (entryKey.trim().length === 0) {
      notify("Entry key is required.", { type: "warning" });
      return;
    }

    setBusy(true);
    try {
      const payload: LayoutSetEntryUpsertRequest = {
        value: parseJsonOrThrow(entryValueJson, "Entry value"),
      };

      const response = await scopedApiAdapter.upsertLayoutEntry(
        resourceId,
        entryKey.trim(),
        payload,
      );
      setResult(response);
      notify("Entry upserted", { type: "success" });
      refresh();
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const deleteEntry = async () => {
    if (deleteKey.trim().length === 0) {
      notify("Entry key is required.", { type: "warning" });
      return;
    }

    if (!window.confirm(`Delete layout entry '${deleteKey.trim()}'?`)) {
      return;
    }

    setBusy(true);
    try {
      const payload = await scopedApiAdapter.deleteLayoutEntry(
        resourceId,
        deleteKey.trim(),
      );
      setResult(payload);
      notify("Entry deleted", { type: "success" });
      refresh();
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Entries CRUD" />
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle2">Read entries</Typography>
          <StageVersionControls state={query} onChange={setQuery} />
          <Button variant="outlined" onClick={loadEntries} disabled={busy}>
            Load Entries
          </Button>

          <Divider />

          <Typography variant="subtitle2">Upsert entry</Typography>
          <TextField
            label="Entry Key"
            value={entryKey}
            onChange={(event) => setEntryKey(event.target.value)}
            size="small"
          />
          <TextField
            label="Value JSON"
            value={entryValueJson}
            onChange={(event) => setEntryValueJson(event.target.value)}
            multiline
            minRows={4}
            size="small"
          />
          <Button variant="contained" onClick={upsertEntry} disabled={busy}>
            Upsert Entry
          </Button>

          <Divider />

          <Typography variant="subtitle2">Delete entry</Typography>
          <TextField
            label="Entry Key"
            value={deleteKey}
            onChange={(event) => setDeleteKey(event.target.value)}
            size="small"
          />
          <Button color="error" variant="outlined" onClick={deleteEntry} disabled={busy}>
            Delete Entry
          </Button>

          <JsonPreview value={result} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function LinkSetEntriesPanel({ idField }: Pick<BaseOperationProps, "idField">) {
  const { notify, refresh, resourceId } = useOperationContext(idField);
  const [query, setQuery] = useState<StageVersionState>({
    stage: "published",
    version: "",
  });
  const [entryKey, setEntryKey] = useState("");
  const [label, setLabel] = useState("");
  const [elkEdgeType, setElkEdgeType] = useState("");
  const [elkPropertiesJson, setElkPropertiesJson] = useState("{}");
  const [deleteKey, setDeleteKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  const loadEntries = async () => {
    setBusy(true);
    try {
      const payload = await scopedApiAdapter.getLinkEntries(resourceId, {
        stage: query.stage,
        version: parseVersionOrThrow(query.version),
      });
      setResult(payload);
      notify("Entries loaded", { type: "success" });
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const upsertEntry = async () => {
    if (entryKey.trim().length === 0 || label.trim().length === 0) {
      notify("Entry key and label are required.", { type: "warning" });
      return;
    }

    setBusy(true);
    try {
      const payload: LinkSetEntryUpsertRequest = {
        label: label.trim(),
      };

      const normalizedEdgeType = elkEdgeType.trim();
      if (normalizedEdgeType.length > 0) {
        payload.elkEdgeType = normalizedEdgeType;
      }

      const properties = parseObjectJsonOrThrow(elkPropertiesJson, "ELK properties");
      if (Object.keys(properties).length > 0) {
        payload.elkProperties = properties;
      }

      const response = await scopedApiAdapter.upsertLinkEntry(
        resourceId,
        entryKey.trim(),
        payload,
      );
      setResult(response);
      notify("Entry upserted", { type: "success" });
      refresh();
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const deleteEntry = async () => {
    if (deleteKey.trim().length === 0) {
      notify("Entry key is required.", { type: "warning" });
      return;
    }

    if (!window.confirm(`Delete link entry '${deleteKey.trim()}'?`)) {
      return;
    }

    setBusy(true);
    try {
      const payload = await scopedApiAdapter.deleteLinkEntry(
        resourceId,
        deleteKey.trim(),
      );
      setResult(payload);
      notify("Entry deleted", { type: "success" });
      refresh();
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Entries CRUD" />
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle2">Read entries</Typography>
          <StageVersionControls state={query} onChange={setQuery} />
          <Button variant="outlined" onClick={loadEntries} disabled={busy}>
            Load Entries
          </Button>

          <Divider />

          <Typography variant="subtitle2">Upsert entry</Typography>
          <TextField
            label="Entry Key"
            value={entryKey}
            onChange={(event) => setEntryKey(event.target.value)}
            size="small"
          />
          <TextField
            label="Label"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            size="small"
          />
          <TextField
            label="ELK Edge Type (optional)"
            value={elkEdgeType}
            onChange={(event) => setElkEdgeType(event.target.value)}
            size="small"
          />
          <TextField
            label="ELK Properties JSON"
            value={elkPropertiesJson}
            onChange={(event) => setElkPropertiesJson(event.target.value)}
            multiline
            minRows={4}
            size="small"
          />
          <Button variant="contained" onClick={upsertEntry} disabled={busy}>
            Upsert Entry
          </Button>

          <Divider />

          <Typography variant="subtitle2">Delete entry</Typography>
          <TextField
            label="Entry Key"
            value={deleteKey}
            onChange={(event) => setDeleteKey(event.target.value)}
            size="small"
          />
          <Button color="error" variant="outlined" onClick={deleteEntry} disabled={busy}>
            Delete Entry
          </Button>

          <JsonPreview value={result} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function ThemeVariablesPanel({ idField }: Pick<BaseOperationProps, "idField">) {
  const { notify, refresh, resourceId } = useOperationContext(idField);
  const [query, setQuery] = useState<StageVersionState>({
    stage: "published",
    version: "",
  });
  const [variableKey, setVariableKey] = useState("");
  const [valueType, setValueType] =
    useState<ThemeVariableUpsertRequest["valueType"]>("color");
  const [lightValue, setLightValue] = useState("");
  const [darkValue, setDarkValue] = useState("");
  const [deleteKey, setDeleteKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  const loadVariables = async () => {
    setBusy(true);
    try {
      const payload = await scopedApiAdapter.getThemeVariables(resourceId, {
        stage: query.stage,
        version: parseVersionOrThrow(query.version),
      });
      setResult(payload);
      notify("Variables loaded", { type: "success" });
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const upsertVariable = async () => {
    if (
      variableKey.trim().length === 0 ||
      lightValue.trim().length === 0 ||
      darkValue.trim().length === 0
    ) {
      notify("Variable key, light value, and dark value are required.", {
        type: "warning",
      });
      return;
    }

    setBusy(true);
    try {
      const payload: ThemeVariableUpsertRequest = {
        valueType,
        lightValue: lightValue.trim(),
        darkValue: darkValue.trim(),
      };

      const response = await scopedApiAdapter.upsertThemeVariable(
        resourceId,
        variableKey.trim(),
        payload,
      );
      setResult(response);
      notify("Variable upserted", { type: "success" });
      refresh();
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  const deleteVariable = async () => {
    if (deleteKey.trim().length === 0) {
      notify("Variable key is required.", { type: "warning" });
      return;
    }

    if (!window.confirm(`Delete theme variable '${deleteKey.trim()}'?`)) {
      return;
    }

    setBusy(true);
    try {
      const payload = await scopedApiAdapter.deleteThemeVariable(
        resourceId,
        deleteKey.trim(),
      );
      setResult(payload);
      notify("Variable deleted", { type: "success" });
      refresh();
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card variant="outlined">
      <CardHeader title="Variables CRUD" />
      <CardContent>
        <Stack spacing={2}>
          <Typography variant="subtitle2">Read variables</Typography>
          <StageVersionControls state={query} onChange={setQuery} />
          <Button variant="outlined" onClick={loadVariables} disabled={busy}>
            Load Variables
          </Button>

          <Divider />

          <Typography variant="subtitle2">Upsert variable</Typography>
          <TextField
            label="Variable Key"
            value={variableKey}
            onChange={(event) => setVariableKey(event.target.value)}
            size="small"
          />
          <TextField
            select
            label="Value Type"
            value={valueType}
            onChange={(event) =>
              setValueType(event.target.value as ThemeVariableUpsertRequest["valueType"])
            }
            size="small"
          >
            {["color", "float", "length", "percent", "string", "custom"].map((choice) => (
              <MenuItem key={choice} value={choice}>
                {choice}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Light Value"
            value={lightValue}
            onChange={(event) => setLightValue(event.target.value)}
            size="small"
          />
          <TextField
            label="Dark Value"
            value={darkValue}
            onChange={(event) => setDarkValue(event.target.value)}
            size="small"
          />
          <Button variant="contained" onClick={upsertVariable} disabled={busy}>
            Upsert Variable
          </Button>

          <Divider />

          <Typography variant="subtitle2">Delete variable</Typography>
          <TextField
            label="Variable Key"
            value={deleteKey}
            onChange={(event) => setDeleteKey(event.target.value)}
            size="small"
          />
          <Button
            color="error"
            variant="outlined"
            onClick={deleteVariable}
            disabled={busy}
          >
            Delete Variable
          </Button>

          <JsonPreview value={result} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function GraphRuntimePanel({ idField }: Pick<BaseOperationProps, "idField">) {
  const { notify, resourceId } = useOperationContext(idField);
  const [query, setQuery] = useState<StageVersionState>({
    stage: "published",
    version: "",
  });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  if (!resourceId) {
    return <Alert severity="info">Record ID is not available.</Alert>;
  }

  const loadRuntime = async () => {
    setBusy(true);
    try {
      const payload = await scopedApiAdapter.getGraphRuntime(resourceId, {
        stage: query.stage,
        version: parseVersionOrThrow(query.version),
      });
      setResult(payload);
      notify("Runtime loaded", { type: "success" });
    } catch (error) {
      notify(toErrorMessage(error), { type: "error" });
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
          <Button variant="outlined" onClick={loadRuntime} disabled={busy}>
            Load Runtime
          </Button>
          <JsonPreview value={result} />
        </Stack>
      </CardContent>
    </Card>
  );
}

function IconResolvePanel() {
  const notify = useNotify();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [conflictPolicy, setConflictPolicy] = useState<
    "reject" | "first-wins" | "last-wins"
  >("reject");
  const [refsJson, setRefsJson] = useState('[\n  {\n    "iconSetId": ""\n  }\n]');

  const runResolve = async () => {
    setBusy(true);
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
      notify(toErrorMessage(error), { type: "error" });
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
          <TextField
            label="Icon Set Refs JSON"
            value={refsJson}
            onChange={(event) => setRefsJson(event.target.value)}
            multiline
            minRows={6}
            size="small"
          />
          <Button variant="outlined" onClick={runResolve} disabled={busy}>
            Resolve
          </Button>
          <JsonPreview value={result} />
        </Stack>
      </CardContent>
    </Card>
  );
}

export function IconSetOperations() {
  return (
    <Stack spacing={2}>
      <BundleAndPublishPanel resource="icon-sets" idField="iconSetId" />
      <IconSetEntriesPanel idField="iconSetId" />
      <IconResolvePanel />
    </Stack>
  );
}

export function LayoutSetOperations() {
  return (
    <Stack spacing={2}>
      <BundleAndPublishPanel resource="layout-sets" idField="layoutSetId" />
      <LayoutSetEntriesPanel idField="layoutSetId" />
    </Stack>
  );
}

export function LinkSetOperations() {
  return (
    <Stack spacing={2}>
      <BundleAndPublishPanel resource="link-sets" idField="linkSetId" />
      <LinkSetEntriesPanel idField="linkSetId" />
    </Stack>
  );
}

export function GraphTypeOperations() {
  return (
    <Stack spacing={2}>
      <BundleAndPublishPanel resource="graph-types" idField="graphTypeId" />
      <GraphRuntimePanel idField="graphTypeId" />
    </Stack>
  );
}

export function ThemeOperations() {
  return (
    <Stack spacing={2}>
      <BundleAndPublishPanel resource="themes" idField="themeId" />
      <ThemeVariablesPanel idField="themeId" />
    </Stack>
  );
}
