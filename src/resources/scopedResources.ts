export const scopedResourceNames = [
  "icon-sets",
  "layout-sets",
  "link-sets",
  "graph-types",
  "themes",
] as const;

export type ScopedResourceName = (typeof scopedResourceNames)[number];

export interface ScopedResourceMeta {
  readonly name: ScopedResourceName;
  readonly label: string;
  readonly idField: "iconSetId" | "layoutSetId" | "linkSetId" | "graphTypeId" | "themeId";
}

export const scopedResourceMeta: Record<ScopedResourceName, ScopedResourceMeta> = {
  "icon-sets": {
    name: "icon-sets",
    label: "Icon Sets",
    idField: "iconSetId",
  },
  "layout-sets": {
    name: "layout-sets",
    label: "Layout Sets",
    idField: "layoutSetId",
  },
  "link-sets": {
    name: "link-sets",
    label: "Link Sets",
    idField: "linkSetId",
  },
  "graph-types": {
    name: "graph-types",
    label: "Graph Types",
    idField: "graphTypeId",
  },
  themes: {
    name: "themes",
    label: "Themes",
    idField: "themeId",
  },
};

export function isScopedResourceName(value: string): value is ScopedResourceName {
  return scopedResourceNames.includes(value as ScopedResourceName);
}
