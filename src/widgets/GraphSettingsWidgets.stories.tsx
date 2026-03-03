import type { Meta, StoryObj } from "@storybook/react-vite";
import { memoryStore } from "react-admin";

import { createMockGraphSettingsDataProvider } from "../storybook/mockDataProvider";
import {
  GraphSettingsAppWidget,
  GraphTypeWidget,
  IconSetWidget,
  LayoutSetWidget,
  LinkSetWidget,
  ThemeWidget,
} from "./index";

const meta: Meta<typeof GraphSettingsAppWidget> = {
  title: "Widgets/GraphSettings",
  component: GraphSettingsAppWidget,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

function makeDataProvider() {
  return createMockGraphSettingsDataProvider();
}

function makeStore() {
  return memoryStore();
}

export const FullApp: Story = {
  render: () => (
    <GraphSettingsAppWidget
      title="GraphSettings Suite"
      dataProvider={makeDataProvider()}
      store={makeStore()}
    />
  ),
};

export const IconSets: Story = {
  render: () => (
    <IconSetWidget
      title="Icon Sets Widget"
      dataProvider={makeDataProvider()}
      store={makeStore()}
    />
  ),
};

export const LayoutSets: Story = {
  render: () => (
    <LayoutSetWidget
      title="Layout Sets Widget"
      dataProvider={makeDataProvider()}
      store={makeStore()}
    />
  ),
};

export const LinkSets: Story = {
  render: () => (
    <LinkSetWidget
      title="Link Sets Widget"
      dataProvider={makeDataProvider()}
      store={makeStore()}
    />
  ),
};

export const GraphTypes: Story = {
  render: () => (
    <GraphTypeWidget
      title="Graph Types Widget"
      dataProvider={makeDataProvider()}
      store={makeStore()}
    />
  ),
};

export const Themes: Story = {
  render: () => (
    <ThemeWidget title="Themes Widget" dataProvider={makeDataProvider()} store={makeStore()} />
  ),
};
