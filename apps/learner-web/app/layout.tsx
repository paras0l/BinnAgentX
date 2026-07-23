import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@binnagent/ui-foundation/tokens.css";
import "./styles.css";
import "./motion.css";
import "../theme/index.css";

import { THEME_REGISTRY, THEME_TIERS } from "../theme/registry";
import { ThemeEffects } from "../theme/theme-effects";

export const metadata: Metadata = {
  title: "BinnAgent 考研英语",
  description: "只面向电脑浏览器的考研英语读写训练空间",
};

const themeBootstrapRegistry = Object.fromEntries(
  Object.values(THEME_REGISTRY).map((theme) => [
    theme.id,
    {
      tier: theme.tier,
      rank: THEME_TIERS[theme.tier].rank,
      colorScheme: theme.colorScheme,
      capabilities: theme.capabilities,
      assets: theme.assets ?? {},
    },
  ]),
);

const themeInitializer = `(() => {
  try {
    const themes = ${JSON.stringify(themeBootstrapRegistry)};
    const saved = JSON.parse(localStorage.getItem("binnagent:theme:v1") || "{}");
    const legacyTheme = saved.theme === "sakura" ? "ragdoll" : saved.theme;
    const theme = Object.prototype.hasOwnProperty.call(themes, legacyTheme) ? legacyTheme : "paper";
    const definition = themes[theme];
    const density = ["compact", "comfortable", "spacious"].includes(saved.density)
      ? saved.density
      : "comfortable";
    const motion = saved.motion === "reduced" ? "reduced" : "full";
    const collectorMode = saved.collectorMode === "night" ? "night" : "day";
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.themeTier = definition.tier;
    root.dataset.themeFeatures = definition.capabilities.join(" ");
    root.dataset.density = density;
    root.dataset.motion = motion;
    root.dataset.collectorMode = collectorMode;
    root.style.colorScheme =
      definition.tier === "collector" && collectorMode === "night"
        ? "dark"
        : definition.colorScheme;
    root.style.setProperty("--theme-tier-rank", String(definition.rank));
    const assetVariables = {
      ambient: "--theme-asset-ambient",
      hero: "--theme-asset-hero",
      "hero-night": "--theme-asset-hero-night",
      "sidebar-ornament": "--theme-asset-sidebar-ornament",
      "hero-accent": "--theme-asset-hero-accent",
      emblem: "--theme-asset-emblem",
      "section-divider": "--theme-asset-section-divider",
      "heading-crest": "--theme-asset-heading-crest",
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
      "card-corner-decor": "--theme-asset-card-corner-decor"
    };
    Object.entries(assetVariables).forEach(([slot, variable]) => {
      const asset = definition.assets[slot];
      root.style.setProperty(variable, asset ? 'url("' + asset.src + '")' : "none");
      root.style.setProperty("--theme-asset-" + slot + "-fit", asset?.fit || "contain");
      root.style.setProperty("--theme-asset-" + slot + "-position", asset?.position || "center");
      if (!asset || !asset.preload) return;
      const preload = document.createElement("link");
      preload.rel = "preload";
      preload.as = "image";
      preload.href = asset.src;
      if (asset.mimeType) preload.type = asset.mimeType;
      preload.dataset.themeAsset = theme + ":" + slot;
      document.head.appendChild(preload);
    });
  } catch {}
})();`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html
      lang="zh-CN"
      data-theme="paper"
      data-theme-tier="standard"
      data-theme-features="palette surfaces"
      data-density="comfortable"
      data-motion="full"
      data-collector-mode="day"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializer }} />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ThemeEffects />
      </body>
    </html>
  );
}
