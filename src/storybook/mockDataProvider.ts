import { type DataProvider, type Identifier, type RaRecord } from "react-admin";

import {
  isScopedResourceName,
  scopedResourceMeta,
  type ScopedResourceName,
} from "../resources/scopedResources";

type MockStore = Record<ScopedResourceName, Array<RaRecord<Identifier>>>;

function cloneRecord<TRecord extends RaRecord<Identifier>>(record: TRecord): TRecord {
  return JSON.parse(JSON.stringify(record)) as TRecord;
}

function createSeedData(): MockStore {
  return {
    "icon-sets": [
      {
        id: "icons-default",
        iconSetId: "icons-default",
        name: "Default Icons",
        draftVersion: 3,
        publishedVersion: 2,
        updatedAt: "2026-03-03T10:00:00Z",
        iconSetVersion: 3,
        entries: {
          person: "mdi:account",
        },
      },
    ],
    "layout-sets": [
      {
        id: "layout-default",
        layoutSetId: "layout-default",
        name: "Default Layout",
        draftVersion: 4,
        publishedVersion: 3,
        updatedAt: "2026-03-03T10:00:00Z",
        layoutSetVersion: 4,
        entries: {
          ranksep: 60,
        },
      },
    ],
    "link-sets": [
      {
        id: "links-default",
        linkSetId: "links-default",
        name: "Default Links",
        draftVersion: 2,
        publishedVersion: 2,
        updatedAt: "2026-03-03T10:00:00Z",
        linkSetVersion: 2,
        entries: {
          depends_on: {
            label: "Depends On",
          },
        },
      },
    ],
    "graph-types": [
      {
        id: "graph-default",
        graphTypeId: "graph-default",
        name: "Default Graph",
        draftVersion: 5,
        publishedVersion: 4,
        updatedAt: "2026-03-03T10:00:00Z",
        graphTypeVersion: 5,
        iconConflictPolicy: "reject",
        layoutSetRef: {
          layoutSetId: "layout-default",
          layoutSetVersion: 3,
        },
        linkSetRef: {
          linkSetId: "links-default",
          linkSetVersion: 2,
        },
        iconSetRefs: [
          {
            iconSetId: "icons-default",
            iconSetVersion: 2,
          },
        ],
      },
    ],
    themes: [
      {
        id: "theme-default",
        themeId: "theme-default",
        name: "Default Theme",
        draftVersion: 7,
        publishedVersion: 6,
        updatedAt: "2026-03-03T10:00:00Z",
        themeVersion: 7,
        cssBody: ".node { color: #222; }",
        variables: {
          "color.primary": {
            valueType: "color",
            lightValue: "#0057D9",
            darkValue: "#76A9FF",
          },
          "font.size.body": {
            valueType: "length",
            value: "14px",
          },
        },
      },
    ],
  };
}

function findResourceStore(
  store: MockStore,
  resource: string,
): Array<RaRecord<Identifier>> | null {
  if (!isScopedResourceName(resource)) {
    return null;
  }

  return store[resource];
}

function toIdentifier(value: unknown): Identifier {
  if (typeof value === "string" || typeof value === "number") {
    return value;
  }

  return String(value ?? "");
}

function applyPagination(records: Array<RaRecord<Identifier>>, page: number, perPage: number) {
  const startIndex = Math.max(page - 1, 0) * perPage;
  return records.slice(startIndex, startIndex + perPage);
}

export function createMockGraphSettingsDataProvider(): DataProvider {
  const store = createSeedData();

  const provider = {
    async getList(resource: string, params: { pagination?: { page: number; perPage: number } }) {
      const records = findResourceStore(store, resource) ?? [];
      const page = params.pagination?.page ?? 1;
      const perPage = params.pagination?.perPage ?? (records.length || 1);
      const paged = applyPagination(records, page, perPage);

      return {
        data: paged.map((record) => cloneRecord(record)),
        total: records.length,
      };
    },

    async getOne(resource: string, params: { id: Identifier }) {
      const records = findResourceStore(store, resource) ?? [];
      const targetId = toIdentifier(params.id);
      const match = records.find((record) => record.id === targetId);

      if (!match) {
        throw new Error(`Mock record not found for '${resource}' with id '${targetId}'`);
      }

      return { data: cloneRecord(match) };
    },

    async getMany(resource: string, params: { ids: Identifier[] }) {
      const records = findResourceStore(store, resource) ?? [];
      const idSet = new Set(params.ids.map((id) => toIdentifier(id)));

      return {
        data: records
          .filter((record) => idSet.has(record.id))
          .map((record) => cloneRecord(record)),
      };
    },

    async getManyReference(
      resource: string,
      params: {
        id: Identifier;
        target: string;
        pagination?: { page: number; perPage: number };
      },
    ) {
      const records = findResourceStore(store, resource) ?? [];
      const page = params.pagination?.page ?? 1;
      const perPage = params.pagination?.perPage ?? (records.length || 1);
      const filtered = records.filter((record) => record[params.target] === params.id);
      const paged = applyPagination(filtered, page, perPage);

      return {
        data: paged.map((record) => cloneRecord(record)),
        total: filtered.length,
      };
    },

    async create(resource: string, params: { data: Record<string, unknown> }) {
      const records = findResourceStore(store, resource);
      if (!records || !isScopedResourceName(resource)) {
        throw new Error(`Mock resource '${resource}' is not supported`);
      }

      const idField = scopedResourceMeta[resource].idField;
      const idValue = toIdentifier(params.data[idField]);
      const record = {
        id: idValue,
        ...params.data,
      } as RaRecord<Identifier>;

      records.push(cloneRecord(record));

      return { data: cloneRecord(record) };
    },

    async update(resource: string, params: { id: Identifier; data: Record<string, unknown> }) {
      const records = findResourceStore(store, resource) ?? [];
      const targetId = toIdentifier(params.id);
      const index = records.findIndex((record) => record.id === targetId);

      if (index < 0) {
        throw new Error(`Mock record not found for '${resource}' with id '${targetId}'`);
      }

      const nextRecord = {
        ...records[index],
        ...params.data,
        id: targetId,
      } as RaRecord<Identifier>;
      records[index] = cloneRecord(nextRecord);

      return { data: cloneRecord(nextRecord) };
    },

    async updateMany(
      resource: string,
      params: { ids: Identifier[]; data: Record<string, unknown> },
    ) {
      const records = findResourceStore(store, resource) ?? [];
      const ids = params.ids.map((id) => toIdentifier(id));

      for (const id of ids) {
        const index = records.findIndex((record) => record.id === id);
        if (index >= 0) {
          records[index] = {
            ...records[index],
            ...params.data,
            id,
          };
        }
      }

      return { data: ids };
    },

    async delete(resource: string, params: { id: Identifier }) {
      const records = findResourceStore(store, resource) ?? [];
      const targetId = toIdentifier(params.id);
      const index = records.findIndex((record) => record.id === targetId);

      if (index < 0) {
        throw new Error(`Mock record not found for '${resource}' with id '${targetId}'`);
      }

      const [deleted] = records.splice(index, 1);
      const output = deleted ?? { id: targetId };

      return { data: cloneRecord(output) };
    },

    async deleteMany(resource: string, params: { ids: Identifier[] }) {
      const records = findResourceStore(store, resource) ?? [];
      const ids = params.ids.map((id) => toIdentifier(id));
      const idSet = new Set(ids);

      for (let index = records.length - 1; index >= 0; index -= 1) {
        const candidate = records[index];
        if (candidate && idSet.has(candidate.id)) {
          records.splice(index, 1);
        }
      }

      return { data: ids };
    },
  } as DataProvider;

  return provider;
}
