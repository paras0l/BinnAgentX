import type { ThemeAssetSlot, ThemeDensity, ThemeMotion } from "./contracts";
import { getThemeDefinition, normalizeThemeId, THEME_TIERS, type ThemeId } from "./registry";

export const THEME_STORAGE_KEY = "binnagent:theme:v1";

export interface ThemeRuntimePreferences {
  theme: ThemeId;
  density: ThemeDensity;
  motion: ThemeMotion;
}

const ASSET_VARIABLES: Record<ThemeAssetSlot, string> = {
  ambient: "--theme-asset-ambient",
  hero: "--theme-asset-hero",
  "sidebar-ornament": "--theme-asset-sidebar-ornament",
  "hero-accent": "--theme-asset-hero-accent",
  "history-easter-egg": "--theme-asset-history-easter-egg",
  "companion-atlas": "--theme-asset-companion-atlas",
  "ui-library": "--theme-asset-ui-library",
  "concept-sheet": "--theme-asset-concept-sheet",
  "usage-guide": "--theme-asset-usage-guide",
  "empty-state-illustration": "--theme-asset-empty-state-illustration",
  "profile-companion": "--theme-asset-profile-companion",
  "preferences-companion": "--theme-asset-preferences-companion",
  "workspace-companion": "--theme-asset-workspace-companion",
  "milestone-companion": "--theme-asset-milestone-companion",
  "card-corner-decor": "--theme-asset-card-corner-decor",
};

function assetMetadataVariable(slot: ThemeAssetSlot, property: "fit" | "position"): string {
  return `--theme-asset-${slot}-${property}`;
}

function cssAssetUrl(src: string): string {
  return `url(${JSON.stringify(src)})`;
}

export function preloadThemeAssets(theme: ThemeId): void {
  if (typeof document === "undefined") return;
  const definition = getThemeDefinition(theme);
  Object.entries(definition.assets ?? {}).forEach(([slot, asset]) => {
    if (!asset?.preload) return;
    const key = `${definition.id}:${slot}`;
    if (document.head.querySelector(`link[data-theme-asset=${JSON.stringify(key)}]`)) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = asset.src;
    if (asset.mimeType) link.type = asset.mimeType;
    link.dataset.themeAsset = key;
    document.head.appendChild(link);
  });
}

function updateThemeRoot({ theme, density, motion }: ThemeRuntimePreferences): void {
  const root = document.documentElement;
  const normalizedTheme = normalizeThemeId(theme);
  const definition = getThemeDefinition(normalizedTheme);
  root.dataset.theme = normalizedTheme;
  root.dataset.themeTier = definition.tier;
  root.dataset.themeFeatures = definition.capabilities.join(" ");
  root.dataset.density = density;
  root.dataset.motion = motion;
  root.style.colorScheme = definition.colorScheme;

  Object.entries(ASSET_VARIABLES).forEach(([slot, variable]) => {
    const assetSlot = slot as ThemeAssetSlot;
    const asset = definition.assets?.[assetSlot];
    root.style.setProperty(variable, asset ? cssAssetUrl(asset.src) : "none");
    root.style.setProperty(assetMetadataVariable(assetSlot, "fit"), asset?.fit ?? "contain");
    root.style.setProperty(
      assetMetadataVariable(assetSlot, "position"),
      asset?.position ?? "center",
    );
  });
  root.style.setProperty("--theme-tier-rank", String(THEME_TIERS[definition.tier].rank));
  preloadThemeAssets(normalizedTheme);
}

export function previewThemePreferences(preferences: ThemeRuntimePreferences): void {
  updateThemeRoot(preferences);
}

export function applyThemePreferences(preferences: ThemeRuntimePreferences): void {
  updateThemeRoot(preferences);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // A blocked storage API must not prevent the visual preference from applying.
  }
}
