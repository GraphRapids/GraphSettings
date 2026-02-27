import { describe, expect, it, vi } from "vitest";

import { createGraphSettingsDataProvider } from "./dataProvider";
import type { ScopedApiAdapter } from "./api/scopedApiAdapter";
import type { IconSetRecord, IconSetSummary } from "./api/scopedTypes";
import type { ScopedResourceName } from "./resources/scopedResources";

const iconSummaries: IconSetSummary[] = [
  {
    schemaVersion: "v1",
    iconSetId: "icons-beta",
    name: "Beta",
    draftVersion: 1,
    publishedVersion: null,
    updatedAt: "2026-02-27T10:00:00Z",
    checksum: "b".repeat(64),
  },
  {
    schemaVersion: "v1",
    iconSetId: "icons-alpha",
    name: "Alpha",
    draftVersion: 2,
    publishedVersion: 1,
    updatedAt: "2026-02-27T11:00:00Z",
    checksum: "a".repeat(64),
  },
  {
    schemaVersion: "v1",
    iconSetId: "icons-gamma",
    name: "Gamma",
    draftVersion: 3,
    publishedVersion: null,
    updatedAt: "2026-02-27T12:00:00Z",
    checksum: "c".repeat(64),
  },
];

const iconRecord: IconSetRecord = {
  schemaVersion: "v1",
  iconSetId: "icons-alpha",
  draft: {
    schemaVersion: "v1",
    iconSetId: "icons-alpha",
    iconSetVersion: 2,
    name: "Alpha",
    entries: {
      user: "person",
    },
    updatedAt: "2026-02-27T11:00:00Z",
    checksum: "a".repeat(64),
  },
  publishedVersions: [],
};

function buildMockAdapter(): {
  adapter: ScopedApiAdapter;
  createMock: ReturnType<typeof vi.fn>;
  deleteMock: ReturnType<typeof vi.fn>;
} {
  const createMock = vi.fn(async () => iconRecord);
  const deleteMock = vi.fn(async () => undefined);

  const adapterObject = {
    list: vi.fn(async (resource: ScopedResourceName) => {
      if (resource === "icon-sets") {
        return iconSummaries;
      }

      return [];
    }),
    get: vi.fn(async () => iconRecord),
    create: createMock,
    update: vi.fn(async () => iconRecord),
    delete: deleteMock,
    getBundle: vi.fn(async () => iconRecord.draft),
    publish: vi.fn(async () => iconRecord.draft),
    getIconEntries: vi.fn(async () => ({
      iconSetId: "icons-alpha",
      iconSetVersion: 2,
      stage: "draft",
      checksum: "a".repeat(64),
      entries: {},
      schemaVersion: "v1",
    })),
    upsertIconEntry: vi.fn(async () => iconRecord),
    deleteIconEntry: vi.fn(async () => iconRecord),
    getLayoutEntries: vi.fn(async () => ({
      layoutSetId: "layout-1",
      layoutSetVersion: 1,
      stage: "draft",
      checksum: "b".repeat(64),
      entries: {},
      schemaVersion: "v1",
    })),
    upsertLayoutEntry: vi.fn(async () => iconRecord as unknown),
    deleteLayoutEntry: vi.fn(async () => iconRecord as unknown),
    getLinkEntries: vi.fn(async () => ({
      linkSetId: "link-1",
      linkSetVersion: 1,
      stage: "draft",
      checksum: "c".repeat(64),
      entries: {},
      schemaVersion: "v1",
    })),
    upsertLinkEntry: vi.fn(async () => iconRecord as unknown),
    deleteLinkEntry: vi.fn(async () => iconRecord as unknown),
    getThemeVariables: vi.fn(async () => ({
      themeId: "theme-1",
      themeVersion: 1,
      stage: "draft",
      checksum: "d".repeat(64),
      variables: {},
      schemaVersion: "v1",
    })),
    upsertThemeVariable: vi.fn(async () => iconRecord as unknown),
    deleteThemeVariable: vi.fn(async () => iconRecord as unknown),
    getGraphRuntime: vi.fn(async () => ({
      graphTypeId: "graph-1",
      graphTypeVersion: 1,
      graphTypeChecksum: "e".repeat(64),
      runtimeChecksum: "f".repeat(64),
      conflictPolicy: "reject",
      resolvedEntries: {},
      sources: [],
      keySources: {},
      linkTypes: [],
      edgeTypeOverrides: {},
      checksum: "g".repeat(64),
      schemaVersion: "v1",
    })),
    resolveIconSets: vi.fn(async () => ({
      conflictPolicy: "reject",
      resolvedEntries: {},
      sources: [],
      keySources: {},
      checksum: "h".repeat(64),
      schemaVersion: "v1",
    })),
  };

  return {
    adapter: adapterObject as unknown as ScopedApiAdapter,
    createMock,
    deleteMock,
  };
}

describe("dataProvider", () => {
  it("maps list items to react-admin records with id + applies sort/pagination", async () => {
    const { adapter } = buildMockAdapter();
    const provider = createGraphSettingsDataProvider(adapter);

    const result = await provider.getList("icon-sets", {
      pagination: { page: 1, perPage: 2 },
      sort: { field: "name", order: "ASC" },
      filter: { q: "a" },
    });

    expect(result.total).toBe(3);
    expect(result.data).toHaveLength(2);
    expect(result.data[0].id).toBe("icons-alpha");
    expect(result.data[1].id).toBe("icons-beta");
  });

  it("maps create payload and flattens draft fields in response", async () => {
    const { adapter, createMock } = buildMockAdapter();
    const provider = createGraphSettingsDataProvider(adapter);

    const result = await provider.create("icon-sets", {
      data: {
        iconSetId: "icons-alpha",
        name: "Alpha",
        entries: {
          user: "person",
        },
      },
    });

    expect(createMock).toHaveBeenCalledWith("icon-sets", {
      iconSetId: "icons-alpha",
      name: "Alpha",
      entries: {
        user: "person",
      },
    });

    expect(result.data.id).toBe("icons-alpha");
    expect(result.data.name).toBe("Alpha");
    expect(result.data.entries).toEqual({ user: "person" });
  });

  it("maps delete to API delete endpoint", async () => {
    const { adapter, deleteMock } = buildMockAdapter();
    const provider = createGraphSettingsDataProvider(adapter);

    const result = await provider.delete("icon-sets", {
      id: "icons-alpha",
      previousData: {
        id: "icons-alpha",
      },
    });

    expect(deleteMock).toHaveBeenCalledWith("icon-sets", "icons-alpha");
    expect(result.data.id).toBe("icons-alpha");
  });
});
