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
} {
  const createMock = vi.fn(async () => iconRecord);

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
  };

  return {
    adapter: adapterObject as unknown as ScopedApiAdapter,
    createMock,
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
});
