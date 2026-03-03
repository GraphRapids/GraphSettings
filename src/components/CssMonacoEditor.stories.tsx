import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { CssMonacoEditor } from "./CssMonacoEditor";

const sampleCss = `:root {
  --color-primary: #0057d9;
  --font-size-body: 14px;
}

.node {
  color: var(--color-primary);
  font-size: var(--font-size-body);
}

svg text {
  dominant-baseline: middle;
}

svg rect {
  rx: 8px;
  ry: 8px;
}
`;

const meta: Meta<typeof CssMonacoEditor> = {
  title: "Components/CssMonacoEditor",
  component: CssMonacoEditor,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

function EditableStory() {
  const [value, setValue] = useState(sampleCss);

  return (
    <CssMonacoEditor
      label="Theme CSS"
      value={value}
      onChange={setValue}
      minHeight={360}
    />
  );
}

export const Editable: Story = {
  render: () => <EditableStory />,
};

export const ReadOnly: Story = {
  args: {
    label: "Published CSS",
    value: sampleCss,
    readOnly: true,
    minHeight: 280,
  },
};
