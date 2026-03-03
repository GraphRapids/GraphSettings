import type { Page, Route } from "@playwright/test";

function fulfillJson(route: Route, payload: unknown) {
  return route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(payload),
  });
}

export async function mockGraphApi(page: Page) {
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

  await page.route("**/v1/icon-sets*", (route) =>
    fulfillJson(route, {
      iconSets: [
        {
          iconSetId: "icons-default",
          name: "Default Icons",
          draftVersion: 3,
          publishedVersion: 2,
          updatedAt: "2026-03-03T10:00:00Z",
        },
      ],
    }),
  );

  await page.route("**/v1/layout-sets*", (route) =>
    fulfillJson(route, {
      layoutSets: [
        {
          layoutSetId: "layout-default",
          name: "Default Layout",
          draftVersion: 4,
          publishedVersion: 3,
          updatedAt: "2026-03-03T10:00:00Z",
        },
      ],
    }),
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

  await page.route("**/v1/themes*", (route) =>
    fulfillJson(route, {
      themes: [
        {
          themeId: "theme-default",
          name: "Default Theme",
          draftVersion: 7,
          publishedVersion: 6,
          updatedAt: "2026-03-03T10:00:00Z",
        },
      ],
    }),
  );
}
