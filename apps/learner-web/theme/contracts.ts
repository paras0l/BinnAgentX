export type ThemeDensity = "compact" | "comfortable" | "spacious";
export type ThemeMotion = "full" | "reduced";
export type ThemeCollectorMode = "day" | "night";
export type ThemeColorScheme = "light" | "dark";
export type ThemeTier = "standard" | "epic" | "legendary" | "collector";
export type ThemeCapability =
  | "palette"
  | "surfaces"
  | "typography"
  | "icon-frames"
  | "ambient"
  | "decorations"
  | "hero-art"
  | "layout-variant"
  | "component-skins"
  | "companion-scenes"
  | "artbook"
  | "day-night-modes"
  | "particle-headings"
  | "pointer-trail"
  | "enhanced-motion";

export type ThemeAssetSlot =
  | "ambient"
  | "hero"
  | "hero-night"
  | "sidebar-ornament"
  | "hero-accent"
  | "emblem"
  | "section-divider"
  | "heading-crest"
  | "history-easter-egg"
  | "companion-atlas"
  | "ui-library"
  | "concept-sheet"
  | "usage-guide"
  | "empty-state-illustration"
  | "profile-companion"
  | "preferences-companion"
  | "workspace-companion"
  | "milestone-companion"
  | "card-corner-decor";

export interface ThemeAsset {
  src: string;
  width: number;
  height: number;
  preload?: boolean;
  mimeType?: string;
  fit?: "cover" | "contain";
  position?: string;
}

export interface ThemeDefinition<TId extends string = string> {
  id: TId;
  label: string;
  description: string;
  colorScheme: ThemeColorScheme;
  tier: ThemeTier;
  capabilities: readonly ThemeCapability[];
  preview: {
    canvas: string;
    rail: string;
    accent: string;
    surface: string;
  };
  assets?: Partial<Record<ThemeAssetSlot, ThemeAsset>>;
}
