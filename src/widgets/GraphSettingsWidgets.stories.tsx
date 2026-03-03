import type { Meta, StoryObj } from "@storybook/react-vite";
import { memoryStore } from "react-admin";
import { useLayoutEffect, type ReactNode } from "react";

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

function StoryRouteReset({
  hash,
  children,
}: {
  readonly hash: string;
  readonly children: ReactNode;
}) {
  useLayoutEffect(() => {
    window.location.hash = hash;
  }, [hash]);

  return <>{children}</>;
}

export const FullApp: Story = {
  render: () => (
    <StoryRouteReset hash="#/icon-sets">
      <GraphSettingsAppWidget
        title="GraphSettings Suite"
        dataProvider={makeDataProvider()}
        store={makeStore()}
      />
    </StoryRouteReset>
  ),
};

export const IconSets: Story = {
  render: () => (
    <StoryRouteReset hash="#/icon-sets">
      <IconSetWidget
        title="Icon Sets Widget"
        dataProvider={makeDataProvider()}
        store={makeStore()}
      />
    </StoryRouteReset>
  ),
};

export const LayoutSets: Story = {
  render: () => (
    <StoryRouteReset hash="#/layout-sets">
      <LayoutSetWidget
        title="Layout Sets Widget"
        dataProvider={makeDataProvider()}
        store={makeStore()}
      />
    </StoryRouteReset>
  ),
};

export const LinkSets: Story = {
  render: () => (
    <StoryRouteReset hash="#/link-sets">
      <LinkSetWidget
        title="Link Sets Widget"
        dataProvider={makeDataProvider()}
        store={makeStore()}
      />
    </StoryRouteReset>
  ),
};

export const GraphTypes: Story = {
  render: () => (
    <StoryRouteReset hash="#/graph-types">
      <GraphTypeWidget
        title="Graph Types Widget"
        dataProvider={makeDataProvider()}
        store={makeStore()}
      />
    </StoryRouteReset>
  ),
};

export const Themes: Story = {
  render: () => (
    <StoryRouteReset hash="#/themes">
      <ThemeWidget title="Themes Widget" dataProvider={makeDataProvider()} store={makeStore()} />
    </StoryRouteReset>
  ),
};
