import MonacoEditor, { type EditorProps } from "@monaco-editor/react";
import { Box, Typography, useMediaQuery, useTheme } from "@mui/material";

interface JsonMonacoEditorProps {
  readonly value: string;
  readonly onChange?: (value: string) => void;
  readonly readOnly?: boolean;
  readonly label?: string;
  readonly helperText?: string;
  readonly minHeight?: number;
  readonly testId?: string;
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

export function JsonMonacoEditor({
  value,
  onChange,
  readOnly = false,
  label,
  helperText,
  minHeight = 960,
  testId,
}: JsonMonacoEditorProps) {
  const theme = useTheme();
  const prefersDarkScheme = useMediaQuery("(prefers-color-scheme: dark)");
  const monacoTheme =
    theme.palette.mode === "dark" || (theme.palette.mode !== "light" && prefersDarkScheme)
      ? "vs-dark"
      : "vs";

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
          language="json"
          theme={monacoTheme}
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
      {helperText ? (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          {helperText}
        </Typography>
      ) : null}
    </Box>
  );
}
