import { expect, test } from "@playwright/test";

import { mockGraphApi } from "./mockGraphApi";

test.describe("GraphSettings widgets", () => {
  test("all widget mode is chrome-free and supports route-based navigation", async ({
    page,
  }) => {
    await mockGraphApi(page);
    await page.goto("/?widget=all");

    await expect(page.locator(".RaAppBar-root")).toHaveCount(0);
    await expect(page.locator(".RaSidebar-root")).toHaveCount(0);
    await expect(
      page.getByText("Either you typed a wrong URL, or you followed a bad link.."),
    ).toHaveCount(0);
    await expect(page.getByRole("cell", { name: "icons-default" })).toBeVisible();

    await page.goto("/?widget=all#/layout-sets");
    await expect(page.getByRole("cell", { name: "layout-default" })).toBeVisible();

    await page.goto("/?widget=all#/link-sets");
    await expect(page.getByRole("cell", { name: "links-default" })).toBeVisible();

    await page.goto("/?widget=all#/graph-types");
    await expect(page.getByRole("cell", { name: "graph-default" })).toBeVisible();

    await page.goto("/?widget=all#/themes");
    await expect(page.getByRole("cell", { name: "theme-default" })).toBeVisible();
  });

  const singleWidgetCases = [
    {
      widget: "icon-sets",
      sampleValue: "icons-default",
    },
    {
      widget: "layout-sets",
      sampleValue: "layout-default",
    },
    {
      widget: "link-sets",
      sampleValue: "links-default",
    },
    {
      widget: "graph-types",
      sampleValue: "graph-default",
    },
    {
      widget: "themes",
      sampleValue: "theme-default",
    },
  ] as const;

  for (const testCase of singleWidgetCases) {
    test(`single widget mode renders ${testCase.widget}`, async ({ page }) => {
      await mockGraphApi(page);
      await page.goto(`/?widget=${testCase.widget}`);

      await expect(page.locator(".RaAppBar-root")).toHaveCount(0);
      await expect(page.locator(".RaSidebar-root")).toHaveCount(0);
      await expect(
        page.getByText("Either you typed a wrong URL, or you followed a bad link.."),
      ).toHaveCount(0);
      await expect(page.getByRole("cell", { name: testCase.sampleValue })).toBeVisible();
    });
  }
});
