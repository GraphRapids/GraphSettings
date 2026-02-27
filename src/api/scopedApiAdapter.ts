import { HttpError } from "react-admin";

import { apiClient } from "./client";
import { normalizeApiError } from "./error";
import type {
  GraphTypeCreateRequest,
  GraphTypeRecord,
  GraphTypeSummary,
  GraphTypeUpdateRequest,
  IconSetCreateRequest,
  IconSetRecord,
  IconSetSummary,
  IconSetUpdateRequest,
  LayoutSetCreateRequest,
  LayoutSetRecord,
  LayoutSetSummary,
  LayoutSetUpdateRequest,
  LinkSetCreateRequest,
  LinkSetRecord,
  LinkSetSummary,
  LinkSetUpdateRequest,
  ThemeCreateRequest,
  ThemeRecord,
  ThemeSummary,
  ThemeUpdateRequest,
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

export type ResourceSummary = ResourceSummaryMap[ScopedResourceName];
export type ResourceRecord = ResourceRecordMap[ScopedResourceName];
export type ResourceCreate = ResourceCreateMap[ScopedResourceName];
export type ResourceUpdate = ResourceUpdateMap[ScopedResourceName];

interface ApiResult<TData> {
  readonly data?: TData;
  readonly error?: unknown;
  readonly response: Response;
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
    throw normalizeApiError(error, 500);
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
      case "icon-sets": {
        return unwrapResponse(
          apiClient.GET("/v1/icon-sets/{id}", {
            params: { path: { id } },
          }),
        );
      }
      case "layout-sets": {
        return unwrapResponse(
          apiClient.GET("/v1/layout-sets/{id}", {
            params: { path: { id } },
          }),
        );
      }
      case "link-sets": {
        return unwrapResponse(
          apiClient.GET("/v1/link-sets/{id}", {
            params: { path: { id } },
          }),
        );
      }
      case "graph-types": {
        return unwrapResponse(
          apiClient.GET("/v1/graph-types/{id}", {
            params: { path: { id } },
          }),
        );
      }
      case "themes": {
        return unwrapResponse(
          apiClient.GET("/v1/themes/{id}", {
            params: { path: { id } },
          }),
        );
      }
    }
  },

  async create(resource, payload) {
    switch (resource) {
      case "icon-sets": {
        return unwrapResponse(
          apiClient.POST("/v1/icon-sets", {
            body: payload as ResourceCreateMap["icon-sets"],
          }),
        );
      }
      case "layout-sets": {
        return unwrapResponse(
          apiClient.POST("/v1/layout-sets", {
            body: payload as ResourceCreateMap["layout-sets"],
          }),
        );
      }
      case "link-sets": {
        return unwrapResponse(
          apiClient.POST("/v1/link-sets", {
            body: payload as ResourceCreateMap["link-sets"],
          }),
        );
      }
      case "graph-types": {
        return unwrapResponse(
          apiClient.POST("/v1/graph-types", {
            body: payload as ResourceCreateMap["graph-types"],
          }),
        );
      }
      case "themes": {
        return unwrapResponse(
          apiClient.POST("/v1/themes", {
            body: payload as ResourceCreateMap["themes"],
          }),
        );
      }
    }
  },

  async update(resource, id, payload) {
    switch (resource) {
      case "icon-sets": {
        return unwrapResponse(
          apiClient.PUT("/v1/icon-sets/{id}", {
            params: { path: { id } },
            body: payload as ResourceUpdateMap["icon-sets"],
          }),
        );
      }
      case "layout-sets": {
        return unwrapResponse(
          apiClient.PUT("/v1/layout-sets/{id}", {
            params: { path: { id } },
            body: payload as ResourceUpdateMap["layout-sets"],
          }),
        );
      }
      case "link-sets": {
        return unwrapResponse(
          apiClient.PUT("/v1/link-sets/{id}", {
            params: { path: { id } },
            body: payload as ResourceUpdateMap["link-sets"],
          }),
        );
      }
      case "graph-types": {
        return unwrapResponse(
          apiClient.PUT("/v1/graph-types/{id}", {
            params: { path: { id } },
            body: payload as ResourceUpdateMap["graph-types"],
          }),
        );
      }
      case "themes": {
        return unwrapResponse(
          apiClient.PUT("/v1/themes/{id}", {
            params: { path: { id } },
            body: payload as ResourceUpdateMap["themes"],
          }),
        );
      }
    }
  },
};
