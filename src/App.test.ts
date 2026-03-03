import { describe, expect, it } from "vitest";

import { widgetFromLocationSearch } from "./widgets";

describe("widgetFromLocationSearch", () => {
  it("returns undefined when widget query is absent", () => {
    expect(widgetFromLocationSearch("")).toBeUndefined();
  });

  it("returns undefined for unsupported widget values", () => {
    expect(widgetFromLocationSearch("?widget=unknown")).toBeUndefined();
  });

  it("returns the parsed widget key when supported", () => {
    expect(widgetFromLocationSearch("?widget=themes")).toBe("themes");
  });
});
