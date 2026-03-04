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

  test("graph-type edit pre-populates draft references", async ({ page }) => {
    await mockGraphApi(page);

    await page.goto("/?widget=graph-types#/graph-types");
    await page.getByRole("link", { name: "Edit" }).click();

    await expect(page.getByText("Draft Graph Type Editor", { exact: true }).first()).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveValue("Default Graph");
    await expect(page.getByText("layout-default (Default Layout)")).toBeVisible();
    await expect(page.getByText("links-default (Default Links)")).toBeVisible();
    await expect(page.getByText("icons-default (Default Icons)")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Version v3" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Version v2" })).toBeVisible();
  });

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
    await expect(page.getByTestId("theme-color-swatch").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "See Raw" })).toBeVisible();
    await page.getByRole("button", { name: "See Raw" }).first().click();
    await expect(
      page.getByTestId("raw-json-monaco-editor").locator(".monaco-editor").first(),
    ).toBeVisible();

    await page.goto("/?widget=themes#/themes");
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByText("Draft Theme Editor", { exact: true }).first()).toBeVisible();
    await expect(
      page.getByTestId("theme-draft-css-editor").locator(".monaco-editor"),
    ).toBeVisible();
    await assertSectionOrder(page, "theme-draft-variables-section", "theme-draft-css-section");
    await expect(page.getByTestId("theme-color-swatch").first()).toBeVisible();
    await page.getByRole("button", { name: "Add Variable" }).click();
    await expect(page.getByLabel("Light Value Color Picker")).toBeVisible();
    await expect(page.getByLabel("Dark Value Color Picker")).toBeVisible();
    await expect(page.getByLabel("Light Value Hex")).toBeVisible();
    await expect(page.getByLabel("Dark Value Hex")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();

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
    await page.getByRole("button", { name: "Add Variable" }).click();
    await expect(page.getByLabel("Light Value Color Picker")).toBeVisible();
    await expect(page.getByLabel("Dark Value Color Picker")).toBeVisible();
    await expect(page.getByLabel("Light Value Hex")).toBeVisible();
    await expect(page.getByLabel("Dark Value Hex")).toBeVisible();
  });

  test("raw JSON view and edit use Monaco editors", async ({ page }) => {
    await mockGraphApi(page);

    await page.goto("/?widget=icon-sets#/icon-sets");
    await page.getByRole("link", { name: "Show" }).click();
    await page.getByRole("button", { name: "See Raw" }).first().click();
    await expect(
      page.getByTestId("raw-json-monaco-editor").locator(".monaco-editor").first(),
    ).toBeVisible();

    await page.goto("/?widget=layout-sets#/layout-sets");
    await page.getByRole("link", { name: "Edit" }).click();
    await page.getByRole("button", { name: "Edit property value" }).first().click();
    await expect(page.getByRole("dialog", { name: "Edit Property Value" })).toBeVisible();
    await expect(
      page.getByTestId("layout-property-json-editor").locator(".monaco-editor"),
    ).toBeVisible();
  });

  test("icon-set edit dialog shows selected icon preview", async ({ page }) => {
    await mockGraphApi(page);

    await page.goto("/?widget=icon-sets#/icon-sets");
    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByText("Draft Entries Editor", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: "Add Entry" }).click();
    const dialog = page.getByRole("dialog", { name: "Add Icon Entry" });
    await expect(dialog.getByTestId("icon-selection-preview")).toBeVisible();
    await expect(dialog.getByTestId("icon-selection-preview-value")).toHaveText("n/a");

    await dialog.getByLabel("Icon").fill("mdi:account");
    await expect(dialog.getByTestId("icon-selection-preview-value")).toHaveText(
      "mdi:account",
    );
  });
});
