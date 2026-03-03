import MonacoEditor, { type EditorProps, type Monaco } from "@monaco-editor/react";
import { Box, Typography } from "@mui/material";

interface CssMonacoEditorProps {
  readonly value: string;
  readonly onChange?: (value: string) => void;
  readonly readOnly?: boolean;
  readonly label?: string;
  readonly minHeight?: number;
  readonly testId?: string;
}

const svgCssProviderId = "graphsettings-svg-css";

const svgCssData: Monaco["languages"]["css"]["CSSDataV1"] = {
  version: 1.1,
  properties: [
    {
      name: "dominant-baseline",
      description: "Defines how text is aligned relative to the dominant baseline in SVG.",
      syntax:
        "auto | text-bottom | alphabetic | ideographic | middle | central | mathematical | hanging | text-top",
      values: [
        { name: "auto" },
        { name: "middle" },
        { name: "central" },
        { name: "alphabetic" },
      ],
    },
    {
      name: "alignment-baseline",
      description: "Specifies baseline alignment for inline-level SVG text content.",
      syntax:
        "auto | baseline | before-edge | text-before-edge | middle | central | after-edge | text-after-edge | ideographic | alphabetic | hanging | mathematical",
    },
    {
      name: "baseline-shift",
      description: "Shifts the baseline of SVG text.",
      syntax: "baseline | sub | super | <length-percentage>",
    },
    {
      name: "vector-effect",
      description: "Controls how vector effects are applied to stroked SVG elements.",
      syntax:
        "none | non-scaling-stroke | non-scaling-size | non-rotation | fixed-position",
    },
    {
      name: "paint-order",
      description:
        "Controls painting order of fill, stroke and markers for SVG graphics elements.",
      syntax: "normal | [ fill || stroke || markers ]",
    },
    {
      name: "shape-rendering",
      description: "Hints how shapes should be rendered in SVG.",
      syntax: "auto | optimizeSpeed | crispEdges | geometricPrecision",
    },
    {
      name: "text-rendering",
      description: "Hints how text should be rendered in SVG.",
      syntax: "auto | optimizeSpeed | optimizeLegibility | geometricPrecision",
    },
    {
      name: "rx",
      description:
        "Defines the x-axis corner radius for SVG rectangles (and related rounded geometry).",
      syntax: "auto | <length-percentage>",
    },
    {
      name: "ry",
      description:
        "Defines the y-axis corner radius for SVG rectangles (and related rounded geometry).",
      syntax: "auto | <length-percentage>",
    },
    {
      name: "cx",
      description: "Defines the x-axis center coordinate for SVG circles and ellipses.",
      syntax: "<length-percentage>",
    },
    {
      name: "cy",
      description: "Defines the y-axis center coordinate for SVG circles and ellipses.",
      syntax: "<length-percentage>",
    },
    {
      name: "r",
      description: "Defines the radius for SVG circles.",
      syntax: "<length-percentage>",
    },
    {
      name: "x",
      description: "Defines the horizontal position for applicable SVG elements.",
      syntax: "<length-percentage>",
    },
    {
      name: "y",
      description: "Defines the vertical position for applicable SVG elements.",
      syntax: "<length-percentage>",
    },
  ],
};

function applySvgCssData(
  defaults: Monaco["languages"]["css"]["LanguageServiceDefaults"],
) {
  const current = defaults.options;
  const data = current.data;
  const dataProviders = data?.dataProviders ?? {};
  if (dataProviders[svgCssProviderId]) {
    return;
  }

  defaults.setOptions({
    ...current,
    data: {
      useDefaultDataProvider: data?.useDefaultDataProvider ?? true,
      dataProviders: {
        ...dataProviders,
        [svgCssProviderId]: svgCssData,
      },
    },
  });
}

function registerSvgCssData(monaco: Monaco) {
  applySvgCssData(monaco.languages.css.cssDefaults);
  applySvgCssData(monaco.languages.css.scssDefaults);
  applySvgCssData(monaco.languages.css.lessDefaults);
}

const defaultEditorOptions: NonNullable<EditorProps["options"]> = {
  automaticLayout: true,
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  wordWrap: "on",
  tabSize: 2,
  insertSpaces: true,
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  formatOnType: true,
  formatOnPaste: true,
  lineNumbers: "on",
  folding: true,
  glyphMargin: false,
  renderLineHighlight: "line",
  padding: {
    top: 12,
    bottom: 12,
  },
};

export function CssMonacoEditor({
  value,
  onChange,
  readOnly = false,
  label,
  minHeight = 960,
  testId,
}: CssMonacoEditorProps) {
  const beforeMount: NonNullable<EditorProps["beforeMount"]> = (monaco) => {
    registerSvgCssData(monaco);
  };

  return (
    <Box sx={{ width: "100%" }} data-testid={testId}>
      {label ? <Typography variant="subtitle2">{label}</Typography> : null}
      <Box
        sx={{
          mt: label ? 1 : 0,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <MonacoEditor
          language="css"
          theme="vs"
          beforeMount={beforeMount}
          value={value}
          onChange={(nextValue) => onChange?.(nextValue ?? "")}
          options={{
            ...defaultEditorOptions,
            readOnly,
            domReadOnly: readOnly,
          }}
          height={`${minHeight}px`}
        />
      </Box>
    </Box>
  );
}
