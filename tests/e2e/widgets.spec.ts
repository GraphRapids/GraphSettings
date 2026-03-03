import { expect, test } from "@playwright/test";

import { mockGraphApi } from "./mockGraphApi";

test.describe("GraphSettings widgets", () => {
  test("full app widget can navigate all scoped resources", async ({ page }) => {
    await mockGraphApi(page);
    await page.goto("/?widget=all");

    await expect(page.locator("#react-admin-title").getByText("Icon Sets")).toBeVisible();
    await expect(page.getByRole("cell", { name: "icons-default" })).toBeVisible();

    await page.getByRole("menuitem", { name: "Layout Sets" }).click();
    await expect(page).toHaveURL(/\/layout-sets/);
    await expect(page.getByRole("cell", { name: "layout-default" })).toBeVisible();

    await page.getByRole("menuitem", { name: "Link Sets" }).click();
    await expect(page).toHaveURL(/\/link-sets/);
    await expect(page.getByRole("cell", { name: "links-default" })).toBeVisible();

    await page.getByRole("menuitem", { name: "Graph Types" }).click();
    await expect(page).toHaveURL(/\/graph-types/);
    await expect(page.getByRole("cell", { name: "graph-default" })).toBeVisible();

    await page.getByRole("menuitem", { name: "Themes" }).click();
    await expect(page).toHaveURL(/\/themes/);
    await expect(page.getByRole("cell", { name: "theme-default" })).toBeVisible();
  });

  const singleWidgetCases = [
    {
      widget: "icon-sets",
      title: "Icon Sets",
      sampleValue: "icons-default",
    },
    {
      widget: "layout-sets",
      title: "Layout Sets",
      sampleValue: "layout-default",
    },
    {
      widget: "link-sets",
      title: "Link Sets",
      sampleValue: "links-default",
    },
    {
      widget: "graph-types",
      title: "Graph Types",
      sampleValue: "graph-default",
    },
    {
      widget: "themes",
      title: "Themes",
      sampleValue: "theme-default",
    },
  ] as const;

  for (const testCase of singleWidgetCases) {
    test(`single widget mode renders ${testCase.widget}`, async ({ page }) => {
      await mockGraphApi(page);
      await page.goto(`/?widget=${testCase.widget}`);

      await expect(page.locator("#react-admin-title").getByText(testCase.title)).toBeVisible();
      await expect(page.getByRole("cell", { name: testCase.sampleValue })).toBeVisible();
    });
  }
});
