import { expect, test, type Page } from "@playwright/test";

import { mockGraphApi } from "./mockGraphApi";

async function assertSectionOrder(page: Page, firstTestId: string, secondTestId: string) {
  const firstTop = await page
    .getByTestId(firstTestId)
    .evaluate((node) => (node as HTMLElement).getBoundingClientRect().top);
  const secondTop = await page
    .getByTestId(secondTestId)
    .evaluate((node) => (node as HTMLElement).getBoundingClientRect().top);

  expect(firstTop).toBeLessThan(secondTop);
}

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

  test("theme pages show variables first and Monaco CSS editors", async ({ page }) => {
    await mockGraphApi(page);

    await page.goto("/?widget=themes#/themes");
    await page.getByRole("link", { name: "Show" }).click();
    await expect(page.getByText("Published Theme", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByTestId("theme-published-css-editor").locator(".monaco-editor"),
    ).toBeVisible();
    await assertSectionOrder(
      page,
      "theme-published-variables-section",
      "theme-published-css-section",
    );
    await expect(page.getByRole("button", { name: "See Raw" })).toBeVisible();

    await page.goto("/?widget=themes#/themes");
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByText("Draft Theme Editor", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByTestId("theme-draft-css-editor").locator(".monaco-editor"),
    ).toBeVisible();
    await assertSectionOrder(page, "theme-draft-variables-section", "theme-draft-css-section");

    await page.goto("/?widget=themes#/themes");
    await page.getByRole("link", { name: "Create" }).click();
    await expect(page.getByText("Create Theme", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByTestId("theme-create-css-editor").locator(".monaco-editor"),
    ).toBeVisible();
    await assertSectionOrder(
      page,
      "theme-create-variables-section",
      "theme-create-css-section",
    );
  });
});
