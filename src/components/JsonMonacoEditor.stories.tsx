import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { JsonMonacoEditor } from "./JsonMonacoEditor";

const sampleJson = `{
  "id": "theme-default",
  "name": "Default Theme",
  "variables": {
    "--color-primary": {
      "valueType": "color",
      "lightValue": "#ffffff",
      "darkValue": "#101010"
    }
  }
}`;

const meta: Meta<typeof JsonMonacoEditor> = {
  title: "Components/JsonMonacoEditor",
  component: JsonMonacoEditor,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

function EditableStory() {
  const [value, setValue] = useState(sampleJson);

  return (
    <JsonMonacoEditor
      label="Raw JSON"
      value={value}
      onChange={setValue}
      minHeight={960}
    />
  );
}

export const Editable: Story = {
  render: () => <EditableStory />,
};

export const ReadOnly: Story = {
  args: {
    label: "Preview JSON",
    value: sampleJson,
    readOnly: true,
    minHeight: 960,
  },
};
