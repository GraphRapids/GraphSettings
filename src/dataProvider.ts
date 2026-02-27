import {
  type CreateParams,
  HttpError,
  type DataProvider,
  type GetListParams,
  type GetManyParams,
  type GetManyReferenceParams,
  type GetOneParams,
  type Identifier,
  type RaRecord,
  type UpdateManyParams,
  type UpdateParams,
} from "react-admin";

import {
  scopedApiAdapter,
  type ResourceCreateMap,
  type ResourceRecordMap,
  type ResourceSummaryMap,
  type ResourceUpdateMap,
  type ScopedApiAdapter,
} from "./api/scopedApiAdapter";
import type {
  GraphTypeCreateRequest,
  GraphTypeUpdateRequest,
  IconSetCreateRequest,
  IconSetUpdateRequest,
  LayoutSetCreateRequest,
  LayoutSetUpdateRequest,
  LinkSetCreateRequest,
  LinkSetUpdateRequest,
  ThemeCreateRequest,
  ThemeUpdateRequest,
} from "./api/scopedTypes";
import {
  isScopedResourceName,
  scopedResourceMeta,
  type ScopedResourceName,
} from "./resources/scopedResources";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function ensureObject(value: unknown, field: string): Record<string, unknown> {
  if (!isObject(value) || Array.isArray(value)) {
    throw new HttpError(`Field '${field}' must be an object`, 400, {
      errors: { [field]: "Must be an object" },
    });
  }

  return value;
}

function ensureString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpError(`Field '${field}' must be a non-empty string`, 400, {
      errors: { [field]: "Must be a non-empty string" },
    });
  }

  return value;
}

function optionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function ensurePositiveInteger(value: unknown, field: string): number {
  const numericValue =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(numericValue) || numericValue < 1) {
    throw new HttpError(`Field '${field}' must be an integer >= 1`, 400, {
      errors: { [field]: "Must be an integer greater than or equal to 1" },
    });
  }

  return numericValue;
}

function ensureArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new HttpError(`Field '${field}' must be an array`, 400, {
      errors: { [field]: "Must be an array" },
    });
  }

  return value;
}

function ensureScopedResource(resource: string): ScopedResourceName {
  if (!isScopedResourceName(resource)) {
    throw new HttpError(`Resource '${resource}' is out of scope`, 400);
  }

  return resource;
}

function extractRecordId(
  resource: ScopedResourceName,
  record: Record<string, unknown>,
): Identifier {
  const idField = scopedResourceMeta[resource].idField;
  const idValue = record[idField];

  if (typeof idValue !== "string" && typeof idValue !== "number") {
    throw new HttpError(`Record is missing '${idField}'`, 500);
  }

  return idValue;
}

function mapSummaryToRaRecord(
  resource: ScopedResourceName,
  summary: ResourceSummaryMap[ScopedResourceName],
): RaRecord<Identifier> {
  const rawSummary = ensureObject(summary, `${resource} summary`);
  const id = extractRecordId(resource, rawSummary);

  return {
    id,
    ...rawSummary,
  };
}

function mapRecordToRaRecord(
  resource: ScopedResourceName,
  record: ResourceRecordMap[ScopedResourceName],
): RaRecord<Identifier> {
  const rawRecord = ensureObject(record, `${resource} record`);
  const id = extractRecordId(resource, rawRecord);
  const draft =
    rawRecord.draft !== undefined ? ensureObject(rawRecord.draft, "draft") : {};

  return {
    id,
    ...rawRecord,
    ...draft,
  };
}

function compareValues(left: unknown, right: unknown): number {
  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  const normalizedLeft = String(left ?? "").toLowerCase();
  const normalizedRight = String(right ?? "").toLowerCase();

  return normalizedLeft.localeCompare(normalizedRight);
}

function matchesFilter(
  record: RaRecord,
  filter: Record<string, unknown> | undefined,
): boolean {
  if (!filter) {
    return true;
  }

  const entries = Object.entries(filter).filter(([, value]) => {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    return true;
  });

  if (entries.length === 0) {
    return true;
  }

  for (const [key, value] of entries) {
    if (key === "q" && typeof value === "string") {
      const query = value.toLowerCase();
      const foundMatch = Object.values(record).some((candidate) =>
        String(candidate ?? "")
          .toLowerCase()
          .includes(query),
      );

      if (!foundMatch) {
        return false;
      }

      continue;
    }

    if (record[key] !== value) {
      return false;
    }
  }

  return true;
}

function paginateAndSort(
  records: RaRecord[],
  params: {
    pagination?: {
      page: number;
      perPage: number;
    };
    sort?: {
      field: string;
      order: "ASC" | "DESC";
    };
    filter?: Record<string, unknown>;
  },
): { data: RaRecord[]; total: number } {
  const filtered = records.filter((record) => matchesFilter(record, params.filter));
  const sorted = [...filtered];

  if (params.sort) {
    const sortOrderMultiplier = params.sort.order === "ASC" ? 1 : -1;
    sorted.sort(
      (left, right) =>
        compareValues(left[params.sort!.field], right[params.sort!.field]) *
        sortOrderMultiplier,
    );
  }

  const total = sorted.length;
  const page = params.pagination?.page ?? 1;
  const perPage = params.pagination?.perPage ?? 25;
  const startIndex = Math.max(page - 1, 0) * perPage;

  return {
    data: sorted.slice(startIndex, startIndex + perPage),
    total,
  };
}

function buildIconSetCreatePayload(data: Record<string, unknown>): IconSetCreateRequest {
  return {
    iconSetId: ensureString(data.iconSetId, "iconSetId"),
    name: ensureString(data.name, "name"),
    entries: ensureObject(data.entries, "entries") as IconSetCreateRequest["entries"],
  };
}

function buildIconSetUpdatePayload(data: Record<string, unknown>): IconSetUpdateRequest {
  return {
    name: ensureString(data.name, "name"),
    entries: ensureObject(data.entries, "entries") as IconSetUpdateRequest["entries"],
  };
}

function buildLayoutSetCreatePayload(
  data: Record<string, unknown>,
): LayoutSetCreateRequest {
  return {
    layoutSetId: ensureString(data.layoutSetId, "layoutSetId"),
    name: ensureString(data.name, "name"),
    elkSettings: ensureObject(
      data.elkSettings,
      "elkSettings",
    ) as LayoutSetCreateRequest["elkSettings"],
  };
}

function buildLayoutSetUpdatePayload(
  data: Record<string, unknown>,
): LayoutSetUpdateRequest {
  return {
    name: ensureString(data.name, "name"),
    elkSettings: ensureObject(
      data.elkSettings,
      "elkSettings",
    ) as LayoutSetUpdateRequest["elkSettings"],
  };
}

function buildLinkSetCreatePayload(data: Record<string, unknown>): LinkSetCreateRequest {
  return {
    linkSetId: ensureString(data.linkSetId, "linkSetId"),
    name: ensureString(data.name, "name"),
    entries: ensureObject(data.entries, "entries") as LinkSetCreateRequest["entries"],
  };
}

function buildLinkSetUpdatePayload(data: Record<string, unknown>): LinkSetUpdateRequest {
  return {
    name: ensureString(data.name, "name"),
    entries: ensureObject(data.entries, "entries") as LinkSetUpdateRequest["entries"],
  };
}

function buildLayoutSetRef(
  data: unknown,
  fieldName: string,
): GraphTypeCreateRequest["layoutSetRef"] {
  const value = ensureObject(data, fieldName);

  return {
    layoutSetId: ensureString(value.layoutSetId, `${fieldName}.layoutSetId`),
    layoutSetVersion: ensurePositiveInteger(
      value.layoutSetVersion,
      `${fieldName}.layoutSetVersion`,
    ),
    checksum: optionalString(value.checksum) ?? null,
  };
}

function buildLinkSetRef(
  data: unknown,
  fieldName: string,
): GraphTypeCreateRequest["linkSetRef"] {
  const value = ensureObject(data, fieldName);

  return {
    linkSetId: ensureString(value.linkSetId, `${fieldName}.linkSetId`),
    linkSetVersion: ensurePositiveInteger(
      value.linkSetVersion,
      `${fieldName}.linkSetVersion`,
    ),
    checksum: optionalString(value.checksum) ?? null,
  };
}

function buildIconSetRefs(
  data: unknown,
  fieldName: string,
): GraphTypeCreateRequest["iconSetRefs"] {
  const refs = ensureArray(data, fieldName).map((entry, index) => {
    const refObject = ensureObject(entry, `${fieldName}[${index}]`);

    return {
      iconSetId: ensureString(refObject.iconSetId, `${fieldName}[${index}].iconSetId`),
      iconSetVersion: ensurePositiveInteger(
        refObject.iconSetVersion,
        `${fieldName}[${index}].iconSetVersion`,
      ),
      checksum: optionalString(refObject.checksum) ?? null,
    };
  });

  if (refs.length === 0) {
    throw new HttpError("iconSetRefs must include at least one item", 400, {
      errors: {
        iconSetRefs: "At least one icon set reference is required",
      },
    });
  }

  return refs;
}

function buildGraphTypeCreatePayload(
  data: Record<string, unknown>,
): GraphTypeCreateRequest {
  const conflictPolicy = optionalString(data.iconConflictPolicy) ?? "reject";

  return {
    graphTypeId: ensureString(data.graphTypeId, "graphTypeId"),
    name: ensureString(data.name, "name"),
    layoutSetRef: buildLayoutSetRef(data.layoutSetRef, "layoutSetRef"),
    iconSetRefs: buildIconSetRefs(data.iconSetRefs, "iconSetRefs"),
    linkSetRef: buildLinkSetRef(data.linkSetRef, "linkSetRef"),
    iconConflictPolicy:
      conflictPolicy === "reject" ||
      conflictPolicy === "first-wins" ||
      conflictPolicy === "last-wins"
        ? conflictPolicy
        : "reject",
  };
}

function buildGraphTypeUpdatePayload(
  data: Record<string, unknown>,
): GraphTypeUpdateRequest {
  const conflictPolicy = optionalString(data.iconConflictPolicy) ?? "reject";

  return {
    name: ensureString(data.name, "name"),
    layoutSetRef: buildLayoutSetRef(data.layoutSetRef, "layoutSetRef"),
    iconSetRefs: buildIconSetRefs(data.iconSetRefs, "iconSetRefs"),
    linkSetRef: buildLinkSetRef(data.linkSetRef, "linkSetRef"),
    iconConflictPolicy:
      conflictPolicy === "reject" ||
      conflictPolicy === "first-wins" ||
      conflictPolicy === "last-wins"
        ? conflictPolicy
        : "reject",
  };
}

function buildThemeCreatePayload(data: Record<string, unknown>): ThemeCreateRequest {
  return {
    themeId: ensureString(data.themeId, "themeId"),
    name: ensureString(data.name, "name"),
    cssBody: ensureString(data.cssBody, "cssBody"),
    variables:
      data.variables === undefined
        ? undefined
        : (ensureObject(data.variables, "variables") as ThemeCreateRequest["variables"]),
  };
}

function buildThemeUpdatePayload(data: Record<string, unknown>): ThemeUpdateRequest {
  return {
    name: ensureString(data.name, "name"),
    cssBody: ensureString(data.cssBody, "cssBody"),
    variables:
      data.variables === undefined
        ? undefined
        : (ensureObject(data.variables, "variables") as ThemeUpdateRequest["variables"]),
  };
}

function buildCreatePayload(
  resource: ScopedResourceName,
  data: Record<string, unknown>,
): ResourceCreateMap[ScopedResourceName] {
  switch (resource) {
    case "icon-sets":
      return buildIconSetCreatePayload(data);
    case "layout-sets":
      return buildLayoutSetCreatePayload(data);
    case "link-sets":
      return buildLinkSetCreatePayload(data);
    case "graph-types":
      return buildGraphTypeCreatePayload(data);
    case "themes":
      return buildThemeCreatePayload(data);
  }
}

function buildUpdatePayload(
  resource: ScopedResourceName,
  data: Record<string, unknown>,
): ResourceUpdateMap[ScopedResourceName] {
  switch (resource) {
    case "icon-sets":
      return buildIconSetUpdatePayload(data);
    case "layout-sets":
      return buildLayoutSetUpdatePayload(data);
    case "link-sets":
      return buildLinkSetUpdatePayload(data);
    case "graph-types":
      return buildGraphTypeUpdatePayload(data);
    case "themes":
      return buildThemeUpdatePayload(data);
  }
}

async function getRecord(
  adapter: ScopedApiAdapter,
  resource: ScopedResourceName,
  id: Identifier,
): Promise<RaRecord<Identifier>> {
  const record = await adapter.get(resource, String(id));
  return mapRecordToRaRecord(resource, record);
}

export function createGraphSettingsDataProvider(adapter: ScopedApiAdapter): DataProvider {
  const provider = {
    async getList(resource: string, params: GetListParams) {
      const scopedResource = ensureScopedResource(resource);
      const list = await adapter.list(scopedResource);
      const mapped = list.map((item) => mapSummaryToRaRecord(scopedResource, item));

      return paginateAndSort(mapped, {
        pagination: params.pagination,
        sort: params.sort,
        filter: params.filter,
      });
    },

    async getOne(resource: string, params: GetOneParams) {
      const scopedResource = ensureScopedResource(resource);
      const record = await getRecord(adapter, scopedResource, params.id);
      return { data: record };
    },

    async getMany(resource: string, params: GetManyParams) {
      const scopedResource = ensureScopedResource(resource);
      const records = await Promise.all(
        params.ids.map((id: Identifier) => getRecord(adapter, scopedResource, id)),
      );
      return { data: records };
    },

    async getManyReference(resource: string, params: GetManyReferenceParams) {
      const scopedResource = ensureScopedResource(resource);
      const list = await adapter.list(scopedResource);
      const mapped = list.map((item) => mapSummaryToRaRecord(scopedResource, item));
      const mergedFilter: Record<string, unknown> = {
        ...(params.filter ?? {}),
        [params.target]: params.id,
      };

      return paginateAndSort(mapped, {
        pagination: params.pagination,
        sort: params.sort,
        filter: mergedFilter,
      });
    },

    async create(resource: string, params: CreateParams) {
      const scopedResource = ensureScopedResource(resource);
      const data = ensureObject(params.data, "data");
      const payload = buildCreatePayload(scopedResource, data);
      const created = await adapter.create(scopedResource, payload);

      return {
        data: mapRecordToRaRecord(scopedResource, created),
      };
    },

    async update(resource: string, params: UpdateParams) {
      const scopedResource = ensureScopedResource(resource);
      const data = ensureObject(params.data, "data");
      const payload = buildUpdatePayload(scopedResource, data);
      const updated = await adapter.update(scopedResource, String(params.id), payload);

      return {
        data: mapRecordToRaRecord(scopedResource, updated),
      };
    },

    async updateMany(resource: string, params: UpdateManyParams) {
      const scopedResource = ensureScopedResource(resource);
      const data = ensureObject(params.data, "data");
      const payload = buildUpdatePayload(scopedResource, data);

      const updates = await Promise.all(
        params.ids.map((id: Identifier) =>
          adapter.update(scopedResource, String(id), payload),
        ),
      );

      return {
        data: updates.map((record) =>
          extractRecordId(scopedResource, ensureObject(record, "record")),
        ),
      };
    },

    async delete() {
      throw new HttpError(
        "Delete is not supported for these resources by the current API.",
        405,
        {
          errors: {
            "root.serverError":
              "Delete is not supported for these resources by the current API.",
          },
        },
      );
    },

    async deleteMany() {
      throw new HttpError(
        "Delete is not supported for these resources by the current API.",
        405,
        {
          errors: {
            "root.serverError":
              "Delete is not supported for these resources by the current API.",
          },
        },
      );
    },
  };

  return provider as DataProvider;
}

export const dataProvider = createGraphSettingsDataProvider(scopedApiAdapter);
