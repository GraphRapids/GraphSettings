import type { Page, Route } from "@playwright/test";

function fulfillJson(route: Route, payload: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

export async function mockGraphApi(page: Page) {
  const iconSetDraftBundle = {
    schemaVersion: "v1",
    iconSetId: "icons-default",
    iconSetVersion: 3,
    name: "Default Icons",
    entries: {
      person: "mdi:account",
      team: "mdi:account-group",
    },
    updatedAt: "2026-03-03T10:00:00Z",
    checksum: "iconset-draft-checksum",
  } as const;
  const iconSetPublishedBundle = {
    ...iconSetDraftBundle,
    iconSetVersion: 2,
    updatedAt: "2026-03-02T09:00:00Z",
    checksum: "iconset-published-checksum",
  } as const;
  const themeDraftBundle = {
    schemaVersion: "v1",
    themeId: "theme-default",
    themeVersion: 7,
    name: "Default Theme",
    cssBody: ".node { color: #222; }\n.edge { stroke: #999; }",
    renderCss: ".node{color:#222}.edge{stroke:#999}",
    updatedAt: "2026-03-03T10:00:00Z",
    checksum: "theme-draft-checksum",
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
  } as const;
  const themePublishedBundle = {
    ...themeDraftBundle,
    themeVersion: 6,
    checksum: "theme-published-checksum",
    updatedAt: "2026-03-02T09:00:00Z",
  } as const;
  const layoutDraftBundle = {
    schemaVersion: "v1",
    layoutSetId: "layout-default",
    layoutSetVersion: 4,
    name: "Default Layout",
    elkSettings: {
      sectionA: {
        values: [],
      },
    },
    updatedAt: "2026-03-03T10:00:00Z",
    checksum: "layout-draft-checksum",
  } as const;
  const layoutPublishedBundle = {
    ...layoutDraftBundle,
    layoutSetVersion: 3,
    updatedAt: "2026-03-02T09:00:00Z",
    checksum: "layout-published-checksum",
  } as const;

  await page.route("**/v1/**", (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      return route.fulfill({ status: 204 });
    }

    return route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({
        code: "not_mocked",
        message: `No mock registered for ${request.method()} ${request.url()}`,
      }),
    });
  });

  await page.route("**/v1/icon-sets**", (route) =>
    (() => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.replace(/\/+$/, "") || "/";

      if (request.method() === "GET" && path === "/v1/icon-sets") {
        return fulfillJson(route, {
          iconSets: [
            {
              schemaVersion: "v1",
              iconSetId: "icons-default",
              name: "Default Icons",
              draftVersion: 3,
              publishedVersion: 2,
              updatedAt: "2026-03-03T10:00:00Z",
              checksum: "iconset-summary-checksum",
            },
          ],
        });
      }

      if (request.method() === "GET" && /^\/v1\/icon-sets\/[^/]+$/.test(path)) {
        return fulfillJson(route, {
          schemaVersion: "v1",
          iconSetId: "icons-default",
          draft: iconSetDraftBundle,
          publishedVersions: [iconSetPublishedBundle],
        });
      }

      if (request.method() === "GET" && /^\/v1\/icon-sets\/[^/]+\/bundle$/.test(path)) {
        const stage = url.searchParams.get("stage");
        return fulfillJson(
          route,
          stage === "published" ? iconSetPublishedBundle : iconSetDraftBundle,
        );
      }

      if (request.method() === "PUT" && /^\/v1\/icon-sets\/[^/]+$/.test(path)) {
        return fulfillJson(route, {
          schemaVersion: "v1",
          iconSetId: "icons-default",
          draft: {
            ...iconSetDraftBundle,
            ...JSON.parse(request.postData() ?? "{}"),
          },
          publishedVersions: [iconSetPublishedBundle],
        });
      }

      if (request.method() === "POST" && /^\/v1\/icon-sets\/[^/]+\/publish$/.test(path)) {
        return fulfillJson(route, {
          ...iconSetDraftBundle,
          iconSetVersion: 4,
          checksum: "iconset-published-checksum-v4",
        });
      }

      return route.fallback();
    })(),
  );

  await page.route("**/v1/layout-sets**", (route) =>
    (() => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.replace(/\/+$/, "") || "/";

      if (request.method() === "GET" && path === "/v1/layout-sets") {
        return fulfillJson(route, {
          layoutSets: [
            {
              layoutSetId: "layout-default",
              name: "Default Layout",
              draftVersion: 4,
              publishedVersion: 3,
              updatedAt: "2026-03-03T10:00:00Z",
            },
          ],
        });
      }

      if (request.method() === "GET" && /^\/v1\/layout-sets\/[^/]+$/.test(path)) {
        return fulfillJson(route, {
          schemaVersion: "v1",
          layoutSetId: "layout-default",
          draft: layoutDraftBundle,
          publishedVersions: [layoutPublishedBundle],
        });
      }

      if (request.method() === "GET" && /^\/v1\/layout-sets\/[^/]+\/bundle$/.test(path)) {
        const stage = url.searchParams.get("stage");
        return fulfillJson(
          route,
          stage === "published" ? layoutPublishedBundle : layoutDraftBundle,
        );
      }

      if (request.method() === "PUT" && /^\/v1\/layout-sets\/[^/]+$/.test(path)) {
        return fulfillJson(route, {
          schemaVersion: "v1",
          layoutSetId: "layout-default",
          draft: {
            ...layoutDraftBundle,
            ...JSON.parse(request.postData() ?? "{}"),
          },
          publishedVersions: [layoutPublishedBundle],
        });
      }

      if (request.method() === "POST" && /^\/v1\/layout-sets\/[^/]+\/publish$/.test(path)) {
        return fulfillJson(route, {
          ...layoutDraftBundle,
          layoutSetVersion: 5,
          checksum: "layout-published-checksum-v5",
        });
      }

      return route.fallback();
    })(),
  );

  await page.route("**/v1/link-sets*", (route) =>
    fulfillJson(route, {
      linkSets: [
        {
          linkSetId: "links-default",
          name: "Default Links",
          draftVersion: 2,
          publishedVersion: 2,
          updatedAt: "2026-03-03T10:00:00Z",
        },
      ],
    }),
  );

  await page.route("**/v1/graph-types*", (route) =>
    fulfillJson(route, {
      graphTypes: [
        {
          graphTypeId: "graph-default",
          name: "Default Graph",
          draftVersion: 5,
          publishedVersion: 4,
          updatedAt: "2026-03-03T10:00:00Z",
        },
      ],
    }),
  );

  await page.route("**/v1/themes**", (route) =>
    (() => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname.replace(/\/+$/, "") || "/";

      if (request.method() === "GET" && path === "/v1/themes") {
        return fulfillJson(route, {
          themes: [
            {
              schemaVersion: "v1",
              themeId: "theme-default",
              name: "Default Theme",
              draftVersion: 7,
              publishedVersion: 6,
              updatedAt: "2026-03-03T10:00:00Z",
              checksum: "theme-summary-checksum",
            },
          ],
        });
      }

      if (request.method() === "GET" && /^\/v1\/themes\/[^/]+$/.test(path)) {
        return fulfillJson(route, {
          schemaVersion: "v1",
          themeId: "theme-default",
          draft: themeDraftBundle,
          publishedVersions: [themePublishedBundle],
        });
      }

      if (request.method() === "GET" && /^\/v1\/themes\/[^/]+\/bundle$/.test(path)) {
        const stage = url.searchParams.get("stage");
        return fulfillJson(route, stage === "published" ? themePublishedBundle : themeDraftBundle);
      }

      if (request.method() === "PUT" && /^\/v1\/themes\/[^/]+$/.test(path)) {
        return fulfillJson(route, {
          schemaVersion: "v1",
          themeId: "theme-default",
          draft: {
            ...themeDraftBundle,
            ...JSON.parse(request.postData() ?? "{}"),
          },
          publishedVersions: [themePublishedBundle],
        });
      }

      if (request.method() === "POST" && /^\/v1\/themes\/[^/]+\/publish$/.test(path)) {
        return fulfillJson(route, {
          ...themeDraftBundle,
          themeVersion: 8,
          checksum: "theme-published-checksum-v8",
        });
      }

      return route.fallback();
    })(),
  );
}
