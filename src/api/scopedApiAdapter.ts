import { HttpError } from "react-admin";

import { apiClient } from "./client";
import { normalizeApiError } from "./error";
import type {
  GraphTypeBundle,
  GraphTypeCreateRequest,
  GraphTypeRecord,
  GraphTypeRuntimeResponse,
  GraphTypeSummary,
  GraphTypeUpdateRequest,
  IconSetBundle,
  IconSetCreateRequest,
  IconSetEntriesResponse,
  IconSetEntryUpsertRequest,
  IconSetRecord,
  IconSetResolutionResult,
  IconSetResolveRequest,
  IconSetSummary,
  IconSetUpdateRequest,
  LayoutSetBundle,
  LayoutSetCreateRequest,
  LayoutSetEntriesResponse,
  LayoutSetEntryUpsertRequest,
  LayoutSetRecord,
  LayoutSetSummary,
  LayoutSetUpdateRequest,
  LinkSetBundle,
  LinkSetCreateRequest,
  LinkSetEntriesResponse,
  LinkSetEntryUpsertRequest,
  LinkSetRecord,
  LinkSetSummary,
  LinkSetUpdateRequest,
  ThemeBundle,
  ThemeCreateRequest,
  ThemeRecord,
  ThemeSummary,
  ThemeUpdateRequest,
  ThemeVariableUpsertRequest,
  ThemeVariablesResponse,
} from "./scopedTypes";
import type { ScopedResourceName } from "../resources/scopedResources";

export interface ResourceSummaryMap {
  "icon-sets": IconSetSummary;
  "layout-sets": LayoutSetSummary;
  "link-sets": LinkSetSummary;
  "graph-types": GraphTypeSummary;
  themes: ThemeSummary;
}

export interface ResourceRecordMap {
  "icon-sets": IconSetRecord;
  "layout-sets": LayoutSetRecord;
  "link-sets": LinkSetRecord;
  "graph-types": GraphTypeRecord;
  themes: ThemeRecord;
}

export interface ResourceCreateMap {
  "icon-sets": IconSetCreateRequest;
  "layout-sets": LayoutSetCreateRequest;
  "link-sets": LinkSetCreateRequest;
  "graph-types": GraphTypeCreateRequest;
  themes: ThemeCreateRequest;
}

export interface ResourceUpdateMap {
  "icon-sets": IconSetUpdateRequest;
  "layout-sets": LayoutSetUpdateRequest;
  "link-sets": LinkSetUpdateRequest;
  "graph-types": GraphTypeUpdateRequest;
  themes: ThemeUpdateRequest;
}

export interface ResourceBundleMap {
  "icon-sets": IconSetBundle;
  "layout-sets": LayoutSetBundle;
  "link-sets": LinkSetBundle;
  "graph-types": GraphTypeBundle;
  themes: ThemeBundle;
}

export type ResourceSummary = ResourceSummaryMap[ScopedResourceName];
export type ResourceRecord = ResourceRecordMap[ScopedResourceName];
export type ResourceCreate = ResourceCreateMap[ScopedResourceName];
export type ResourceUpdate = ResourceUpdateMap[ScopedResourceName];
export type ResourceBundle = ResourceBundleMap[ScopedResourceName];

export type ResourceStage = "draft" | "published";

export interface StageVersionQuery {
  readonly stage?: ResourceStage;
  readonly version?: number;
}

interface ApiResult<TData> {
  readonly data?: TData;
  readonly error?: unknown;
  readonly response: Response;
}

function normalizeUnhandledError(error: unknown): HttpError {
  if (error instanceof HttpError) {
    return error;
  }

  return normalizeApiError(error, 500);
}

async function unwrapResponse<TData>(request: Promise<ApiResult<TData>>): Promise<TData> {
  try {
    const result = await request;

    if (result.error) {
      throw normalizeApiError(result.error, result.response.status);
    }

    if (result.data === undefined) {
      throw new HttpError("Response payload is empty", result.response.status);
    }

    return result.data;
  } catch (error) {
    throw normalizeUnhandledError(error);
  }
}

async function unwrapNoContent(request: Promise<ApiResult<unknown>>): Promise<void> {
  try {
    const result = await request;

    if (result.error) {
      throw normalizeApiError(result.error, result.response.status);
    }
  } catch (error) {
    throw normalizeUnhandledError(error);
  }
}

function positiveIntegerOrUndefined(value: number | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Number.isInteger(value) || value < 1) {
    throw new HttpError("Version must be an integer greater than or equal to 1", 400, {
      errors: {
        version: "Must be an integer greater than or equal to 1",
      },
    });
  }

  return value;
}

function bundleQueryFor(
  resource: ScopedResourceName,
  query: StageVersionQuery,
):
  | { stage?: ResourceStage; icon_set_version?: number }
  | { stage?: ResourceStage; layout_set_version?: number }
  | { stage?: ResourceStage; link_set_version?: number }
  | { stage?: ResourceStage; graph_type_version?: number }
  | { stage?: ResourceStage; theme_version?: number } {
  const stage = query.stage;
  const version = positiveIntegerOrUndefined(query.version);

  switch (resource) {
    case "icon-sets":
      return { stage, icon_set_version: version };
    case "layout-sets":
      return { stage, layout_set_version: version };
    case "link-sets":
      return { stage, link_set_version: version };
    case "graph-types":
      return { stage, graph_type_version: version };
    case "themes":
      return { stage, theme_version: version };
  }
}

export interface ScopedApiAdapter {
  list(resource: ScopedResourceName): Promise<ResourceSummary[]>;
  get(resource: ScopedResourceName, id: string): Promise<ResourceRecord>;
  create(resource: ScopedResourceName, payload: ResourceCreate): Promise<ResourceRecord>;
  update(
    resource: ScopedResourceName,
    id: string,
    payload: ResourceUpdate,
  ): Promise<ResourceRecord>;
  delete(resource: ScopedResourceName, id: string): Promise<void>;

  getBundle(
    resource: ScopedResourceName,
    id: string,
    query?: StageVersionQuery,
  ): Promise<ResourceBundle>;
  publish(resource: ScopedResourceName, id: string): Promise<ResourceBundle>;

  getIconEntries(id: string, query?: StageVersionQuery): Promise<IconSetEntriesResponse>;
  upsertIconEntry(
    id: string,
    key: string,
    payload: IconSetEntryUpsertRequest,
  ): Promise<IconSetRecord>;
  deleteIconEntry(id: string, key: string): Promise<IconSetRecord>;

  getLayoutEntries(
    id: string,
    query?: StageVersionQuery,
  ): Promise<LayoutSetEntriesResponse>;
  upsertLayoutEntry(
    id: string,
    key: string,
    payload: LayoutSetEntryUpsertRequest,
  ): Promise<LayoutSetRecord>;
  deleteLayoutEntry(id: string, key: string): Promise<LayoutSetRecord>;

  getLinkEntries(id: string, query?: StageVersionQuery): Promise<LinkSetEntriesResponse>;
  upsertLinkEntry(
    id: string,
    key: string,
    payload: LinkSetEntryUpsertRequest,
  ): Promise<LinkSetRecord>;
  deleteLinkEntry(id: string, key: string): Promise<LinkSetRecord>;

  getThemeVariables(
    id: string,
    query?: StageVersionQuery,
  ): Promise<ThemeVariablesResponse>;
  upsertThemeVariable(
    id: string,
    key: string,
    payload: ThemeVariableUpsertRequest,
  ): Promise<ThemeRecord>;
  deleteThemeVariable(id: string, key: string): Promise<ThemeRecord>;

  getGraphRuntime(
    id: string,
    query?: StageVersionQuery,
  ): Promise<GraphTypeRuntimeResponse>;

  resolveIconSets(payload: IconSetResolveRequest): Promise<IconSetResolutionResult>;
}

export const scopedApiAdapter: ScopedApiAdapter = {
  async list(resource) {
    switch (resource) {
      case "icon-sets": {
        const payload = await unwrapResponse(apiClient.GET("/v1/icon-sets"));
        return payload.iconSets;
      }
      case "layout-sets": {
        const payload = await unwrapResponse(apiClient.GET("/v1/layout-sets"));
        return payload.layoutSets;
      }
      case "link-sets": {
        const payload = await unwrapResponse(apiClient.GET("/v1/link-sets"));
        return payload.linkSets;
      }
      case "graph-types": {
        const payload = await unwrapResponse(apiClient.GET("/v1/graph-types"));
        return payload.graphTypes;
      }
      case "themes": {
        const payload = await unwrapResponse(apiClient.GET("/v1/themes"));
        return payload.themes;
      }
    }
  },

  async get(resource, id) {
    switch (resource) {
      case "icon-sets":
        return unwrapResponse(
          apiClient.GET("/v1/icon-sets/{id}", { params: { path: { id } } }),
        );
      case "layout-sets":
        return unwrapResponse(
          apiClient.GET("/v1/layout-sets/{id}", { params: { path: { id } } }),
        );
      case "link-sets":
        return unwrapResponse(
          apiClient.GET("/v1/link-sets/{id}", { params: { path: { id } } }),
        );
      case "graph-types":
        return unwrapResponse(
          apiClient.GET("/v1/graph-types/{id}", { params: { path: { id } } }),
        );
      case "themes":
        return unwrapResponse(
          apiClient.GET("/v1/themes/{id}", { params: { path: { id } } }),
        );
    }
  },

  async create(resource, payload) {
    switch (resource) {
      case "icon-sets":
        return unwrapResponse(
          apiClient.POST("/v1/icon-sets", {
            body: payload as ResourceCreateMap["icon-sets"],
          }),
        );
      case "layout-sets":
        return unwrapResponse(
          apiClient.POST("/v1/layout-sets", {
            body: payload as ResourceCreateMap["layout-sets"],
          }),
        );
      case "link-sets":
        return unwrapResponse(
          apiClient.POST("/v1/link-sets", {
            body: payload as ResourceCreateMap["link-sets"],
          }),
        );
      case "graph-types":
        return unwrapResponse(
          apiClient.POST("/v1/graph-types", {
            body: payload as ResourceCreateMap["graph-types"],
          }),
        );
      case "themes":
        return unwrapResponse(
          apiClient.POST("/v1/themes", {
            body: payload as ResourceCreateMap["themes"],
          }),
        );
    }
  },

  async update(resource, id, payload) {
    switch (resource) {
      case "icon-sets":
        return unwrapResponse(
          apiClient.PUT("/v1/icon-sets/{id}", {
            params: { path: { id } },
            body: payload as ResourceUpdateMap["icon-sets"],
          }),
        );
      case "layout-sets":
        return unwrapResponse(
          apiClient.PUT("/v1/layout-sets/{id}", {
            params: { path: { id } },
            body: payload as ResourceUpdateMap["layout-sets"],
          }),
        );
      case "link-sets":
        return unwrapResponse(
          apiClient.PUT("/v1/link-sets/{id}", {
            params: { path: { id } },
            body: payload as ResourceUpdateMap["link-sets"],
          }),
        );
      case "graph-types":
        return unwrapResponse(
          apiClient.PUT("/v1/graph-types/{id}", {
            params: { path: { id } },
            body: payload as ResourceUpdateMap["graph-types"],
          }),
        );
      case "themes":
        return unwrapResponse(
          apiClient.PUT("/v1/themes/{id}", {
            params: { path: { id } },
            body: payload as ResourceUpdateMap["themes"],
          }),
        );
    }
  },

  async delete(resource, id) {
    switch (resource) {
      case "icon-sets":
        return unwrapNoContent(
          apiClient.DELETE("/v1/icon-sets/{id}", { params: { path: { id } } }),
        );
      case "layout-sets":
        return unwrapNoContent(
          apiClient.DELETE("/v1/layout-sets/{id}", { params: { path: { id } } }),
        );
      case "link-sets":
        return unwrapNoContent(
          apiClient.DELETE("/v1/link-sets/{id}", { params: { path: { id } } }),
        );
      case "graph-types":
        return unwrapNoContent(
          apiClient.DELETE("/v1/graph-types/{id}", { params: { path: { id } } }),
        );
      case "themes":
        return unwrapNoContent(
          apiClient.DELETE("/v1/themes/{id}", { params: { path: { id } } }),
        );
    }
  },

  async getBundle(resource, id, query = {}) {
    const queryParams = bundleQueryFor(resource, query);

    switch (resource) {
      case "icon-sets":
        return unwrapResponse(
          apiClient.GET("/v1/icon-sets/{id}/bundle", {
            params: {
              path: { id },
              query: queryParams as { stage?: ResourceStage; icon_set_version?: number },
            },
          }),
        );
      case "layout-sets":
        return unwrapResponse(
          apiClient.GET("/v1/layout-sets/{id}/bundle", {
            params: {
              path: { id },
              query: queryParams as {
                stage?: ResourceStage;
                layout_set_version?: number;
              },
            },
          }),
        );
      case "link-sets":
        return unwrapResponse(
          apiClient.GET("/v1/link-sets/{id}/bundle", {
            params: {
              path: { id },
              query: queryParams as { stage?: ResourceStage; link_set_version?: number },
            },
          }),
        );
      case "graph-types":
        return unwrapResponse(
          apiClient.GET("/v1/graph-types/{id}/bundle", {
            params: {
              path: { id },
              query: queryParams as {
                stage?: ResourceStage;
                graph_type_version?: number;
              },
            },
          }),
        );
      case "themes":
        return unwrapResponse(
          apiClient.GET("/v1/themes/{id}/bundle", {
            params: {
              path: { id },
              query: queryParams as { stage?: ResourceStage; theme_version?: number },
            },
          }),
        );
    }
  },

  async publish(resource, id) {
    switch (resource) {
      case "icon-sets":
        return unwrapResponse(
          apiClient.POST("/v1/icon-sets/{id}/publish", { params: { path: { id } } }),
        );
      case "layout-sets":
        return unwrapResponse(
          apiClient.POST("/v1/layout-sets/{id}/publish", { params: { path: { id } } }),
        );
      case "link-sets":
        return unwrapResponse(
          apiClient.POST("/v1/link-sets/{id}/publish", { params: { path: { id } } }),
        );
      case "graph-types":
        return unwrapResponse(
          apiClient.POST("/v1/graph-types/{id}/publish", { params: { path: { id } } }),
        );
      case "themes":
        return unwrapResponse(
          apiClient.POST("/v1/themes/{id}/publish", { params: { path: { id } } }),
        );
    }
  },

  async getIconEntries(id, query = {}) {
    return unwrapResponse(
      apiClient.GET("/v1/icon-sets/{id}/entries", {
        params: {
          path: { id },
          query: {
            stage: query.stage,
            icon_set_version: positiveIntegerOrUndefined(query.version),
          },
        },
      }),
    );
  },

  async upsertIconEntry(id, key, payload) {
    return unwrapResponse(
      apiClient.PUT("/v1/icon-sets/{id}/entries/{key}", {
        params: { path: { id, key } },
        body: payload,
      }),
    );
  },

  async deleteIconEntry(id, key) {
    return unwrapResponse(
      apiClient.DELETE("/v1/icon-sets/{id}/entries/{key}", {
        params: { path: { id, key } },
      }),
    );
  },

  async getLayoutEntries(id, query = {}) {
    return unwrapResponse(
      apiClient.GET("/v1/layout-sets/{id}/entries", {
        params: {
          path: { id },
          query: {
            stage: query.stage,
            layout_set_version: positiveIntegerOrUndefined(query.version),
          },
        },
      }),
    );
  },

  async upsertLayoutEntry(id, key, payload) {
    return unwrapResponse(
      apiClient.PUT("/v1/layout-sets/{id}/entries/{key}", {
        params: { path: { id, key } },
        body: payload,
      }),
    );
  },

  async deleteLayoutEntry(id, key) {
    return unwrapResponse(
      apiClient.DELETE("/v1/layout-sets/{id}/entries/{key}", {
        params: { path: { id, key } },
      }),
    );
  },

  async getLinkEntries(id, query = {}) {
    return unwrapResponse(
      apiClient.GET("/v1/link-sets/{id}/entries", {
        params: {
          path: { id },
          query: {
            stage: query.stage,
            link_set_version: positiveIntegerOrUndefined(query.version),
          },
        },
      }),
    );
  },

  async upsertLinkEntry(id, key, payload) {
    return unwrapResponse(
      apiClient.PUT("/v1/link-sets/{id}/entries/{key}", {
        params: { path: { id, key } },
        body: payload,
      }),
    );
  },

  async deleteLinkEntry(id, key) {
    return unwrapResponse(
      apiClient.DELETE("/v1/link-sets/{id}/entries/{key}", {
        params: { path: { id, key } },
      }),
    );
  },

  async getThemeVariables(id, query = {}) {
    return unwrapResponse(
      apiClient.GET("/v1/themes/{id}/variables", {
        params: {
          path: { id },
          query: {
            stage: query.stage,
            theme_version: positiveIntegerOrUndefined(query.version),
          },
        },
      }),
    );
  },

  async upsertThemeVariable(id, key, payload) {
    return unwrapResponse(
      apiClient.PUT("/v1/themes/{id}/variables/{key}", {
        params: { path: { id, key } },
        body: payload,
      }),
    );
  },

  async deleteThemeVariable(id, key) {
    return unwrapResponse(
      apiClient.DELETE("/v1/themes/{id}/variables/{key}", {
        params: { path: { id, key } },
      }),
    );
  },

  async getGraphRuntime(id, query = {}) {
    return unwrapResponse(
      apiClient.GET("/v1/graph-types/{id}/runtime", {
        params: {
          path: { id },
          query: {
            stage: query.stage,
            graph_type_version: positiveIntegerOrUndefined(query.version),
          },
        },
      }),
    );
  },

  async resolveIconSets(payload) {
    return unwrapResponse(
      apiClient.POST("/v1/icon-sets/resolve", {
        body: payload,
      }),
    );
  },
};
