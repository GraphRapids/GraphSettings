import { localStorageStore } from "react-admin";

import { GraphSettingsAdminShell } from "../core/GraphSettingsAdminShell";

import { widgetResourceViews, type GraphSettingsWidgetKey } from "./widgetCatalog";
import type { GraphSettingsWidgetProps } from "./widgetTypes";

const widgetStores: Record<
  GraphSettingsWidgetKey,
  ReturnType<typeof localStorageStore>
> = {
  all: localStorageStore(undefined, "graphsettings-widget-all"),
  "icon-sets": localStorageStore(undefined, "graphsettings-widget-icon-sets"),
  "layout-sets": localStorageStore(undefined, "graphsettings-widget-layout-sets"),
  "link-sets": localStorageStore(undefined, "graphsettings-widget-link-sets"),
  "graph-types": localStorageStore(undefined, "graphsettings-widget-graph-types"),
  themes: localStorageStore(undefined, "graphsettings-widget-themes"),
};

export function GraphSettingsWidget({
  widget,
  ...shellProps
}: GraphSettingsWidgetProps & { readonly widget: GraphSettingsWidgetKey }) {
  return (
    <GraphSettingsAdminShell
      resources={widgetResourceViews[widget]}
      store={widgetStores[widget]}
      {...shellProps}
    />
  );
}

export function GraphSettingsAppWidget(props: GraphSettingsWidgetProps) {
  return <GraphSettingsWidget widget="all" {...props} />;
}

export function IconSetWidget(props: GraphSettingsWidgetProps) {
  return <GraphSettingsWidget widget="icon-sets" {...props} />;
}

export function LayoutSetWidget(props: GraphSettingsWidgetProps) {
  return <GraphSettingsWidget widget="layout-sets" {...props} />;
}

export function LinkSetWidget(props: GraphSettingsWidgetProps) {
  return <GraphSettingsWidget widget="link-sets" {...props} />;
}

export function GraphTypeWidget(props: GraphSettingsWidgetProps) {
  return <GraphSettingsWidget widget="graph-types" {...props} />;
}

export function ThemeWidget(props: GraphSettingsWidgetProps) {
  return <GraphSettingsWidget widget="themes" {...props} />;
}
