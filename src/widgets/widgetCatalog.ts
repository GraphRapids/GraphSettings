import type { GraphSettingsResourceView } from "../core/GraphSettingsAdminShell";
import {
  graphTypeViews,
  iconSetViews,
  layoutSetViews,
  linkSetViews,
  scopedResourceViews,
  themeViews,
} from "../resources/resourceViews";

export const widgetKeys = [
  "all",
  "icon-sets",
  "layout-sets",
  "link-sets",
  "graph-types",
  "themes",
] as const;

export type GraphSettingsWidgetKey = (typeof widgetKeys)[number];

export const widgetResourceViews: Record<
  GraphSettingsWidgetKey,
  readonly GraphSettingsResourceView[]
> = {
  all: scopedResourceViews,
  "icon-sets": [iconSetViews],
  "layout-sets": [layoutSetViews],
  "link-sets": [linkSetViews],
  "graph-types": [graphTypeViews],
  themes: [themeViews],
};

export function isGraphSettingsWidgetKey(value: string): value is GraphSettingsWidgetKey {
  return (widgetKeys as readonly string[]).includes(value);
}
