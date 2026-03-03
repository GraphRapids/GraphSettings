import { isGraphSettingsWidgetKey, type GraphSettingsWidgetKey } from "./widgetCatalog";

export function widgetFromLocationSearch(search: string): GraphSettingsWidgetKey | undefined {
  const query = new URLSearchParams(search);
  const widget = query.get("widget");
  if (!widget || !isGraphSettingsWidgetKey(widget)) {
    return undefined;
  }

  return widget;
}
