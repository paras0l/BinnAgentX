"use client";

import { useLayoutEffect, type ReactNode } from "react";

import type { ThemeCollectorMode, ThemeDensity, ThemeMotion } from "./contracts";
import type { ThemeId } from "./registry";
import { applyThemePreferences } from "./runtime";

export function ThemeProvider({
  children,
  theme,
  density,
  motion,
  collectorMode,
}: {
  children: ReactNode;
  theme: ThemeId;
  density: ThemeDensity;
  motion: ThemeMotion;
  collectorMode: ThemeCollectorMode;
}) {
  useLayoutEffect(() => {
    applyThemePreferences({ theme, density, motion, collectorMode });
  }, [collectorMode, density, motion, theme]);

  return children;
}
