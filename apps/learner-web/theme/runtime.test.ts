import { beforeEach, describe, expect, it } from "vitest";

import { normalizeThemeId, THEME_REGISTRY, THEME_TIERS } from "./registry";
import { applyThemePreferences, previewThemePreferences, THEME_STORAGE_KEY } from "./runtime";

describe("theme runtime", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
    document.documentElement.removeAttribute("data-theme-tier");
    document.documentElement.removeAttribute("data-theme-features");
    document.documentElement.removeAttribute("data-density");
    document.documentElement.removeAttribute("data-motion");
    document.documentElement.removeAttribute("style");
    document.head.querySelectorAll("link[data-theme-asset]").forEach((link) => link.remove());
  });

  it("keeps every registered theme compatible with the stable contract", () => {
    expect(Object.keys(THEME_REGISTRY)).toEqual(["paper", "ragdoll", "ocean", "seal-summer"]);
    expect(normalizeThemeId("sakura")).toBe("ragdoll");
    expect(normalizeThemeId("unknown")).toBe("paper");
  });

  it("orders presentation coverage without changing the theme fallback contract", () => {
    expect(THEME_TIERS[THEME_REGISTRY.paper.tier].rank).toBeLessThan(
      THEME_TIERS[THEME_REGISTRY.ocean.tier].rank,
    );
    expect(THEME_TIERS[THEME_REGISTRY.ocean.tier].rank).toBeLessThan(
      THEME_TIERS[THEME_REGISTRY.ragdoll.tier].rank,
    );
    expect(THEME_REGISTRY.ragdoll.capabilities).toEqual(
      expect.arrayContaining([...THEME_REGISTRY.ocean.capabilities]),
    );
    expect(THEME_TIERS[THEME_REGISTRY.ragdoll.tier].rank).toBeLessThan(
      THEME_TIERS[THEME_REGISTRY["seal-summer"].tier].rank,
    );
    expect(THEME_REGISTRY["seal-summer"].capabilities).toEqual(
      expect.arrayContaining([...THEME_REGISTRY.ragdoll.capabilities]),
    );
    expect(THEME_REGISTRY.ocean.capabilities).toEqual(
      expect.arrayContaining([...THEME_REGISTRY.paper.capabilities]),
    );
  });

  it("applies the collector protocol and its complete asset catalog", () => {
    applyThemePreferences({ theme: "seal-summer", density: "comfortable", motion: "full" });

    expect(document.documentElement.dataset).toMatchObject({
      theme: "seal-summer",
      themeTier: "collector",
    });
    expect(document.documentElement.dataset.themeFeatures).toContain("component-skins");
    expect(document.documentElement.dataset.themeFeatures).toContain("companion-scenes");
    expect(document.documentElement.dataset.themeFeatures).toContain("artbook");
    expect(document.documentElement.dataset.themeFeatures).toContain("particle-headings");
    expect(document.documentElement.dataset.themeFeatures).toContain("pointer-trail");
    expect(document.documentElement.style.getPropertyValue("--theme-asset-hero")).toContain(
      "/themes/seal-summer/hero.jpg",
    );
    expect(document.documentElement.style.getPropertyValue("--theme-asset-usage-guide")).toContain(
      "/themes/seal-summer/usage-guide.jpg",
    );
    expect(
      document.documentElement.style.getPropertyValue("--theme-asset-workspace-companion"),
    ).toContain("/themes/seal-summer/workspace-companion.png");
    expect(
      document.documentElement.style.getPropertyValue("--theme-asset-empty-state-illustration"),
    ).toContain("/themes/seal-summer/assets-empty-companion.png");
    expect(document.head.querySelector('link[data-theme-asset="seal-summer:hero"]')).not.toBeNull();
  });

  it("applies and persists the root theme protocol", () => {
    applyThemePreferences({ theme: "ragdoll", density: "spacious", motion: "reduced" });

    expect(document.documentElement.dataset).toMatchObject({
      theme: "ragdoll",
      themeTier: "legendary",
      density: "spacious",
      motion: "reduced",
    });
    expect(document.documentElement.dataset.themeFeatures).toContain("hero-art");
    expect(document.documentElement.style.getPropertyValue("--theme-asset-hero")).toContain(
      "/themes/ragdoll/hero.webp",
    );
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.documentElement.style.getPropertyValue("--theme-asset-hero-position")).toBe(
      "right -28px center",
    );
    expect(document.head.querySelector('link[data-theme-asset="ragdoll:hero"]')).not.toBeNull();
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "{}")).toMatchObject({
      theme: "ragdoll",
      density: "spacious",
      motion: "reduced",
    });
  });

  it("previews a theme without overwriting the saved root protocol", () => {
    applyThemePreferences({ theme: "paper", density: "comfortable", motion: "full" });
    previewThemePreferences({ theme: "ragdoll", density: "spacious", motion: "reduced" });

    expect(document.documentElement.dataset).toMatchObject({
      theme: "ragdoll",
      themeTier: "legendary",
      density: "spacious",
      motion: "reduced",
    });
    expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? "{}")).toMatchObject({
      theme: "paper",
      density: "comfortable",
      motion: "full",
    });
  });
});
