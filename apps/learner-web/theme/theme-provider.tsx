"use client";

import { useLayoutEffect, type ReactNode } from "react";

import type { ThemeDensity, ThemeMotion } from "./contracts";
import type { ThemeId } from "./registry";
import { applyThemePreferences } from "./runtime";

export function ThemeProvider({
  children,
  theme,
  density,
  motion,
}: {
  children: ReactNode;
  theme: ThemeId;
  density: ThemeDensity;
  motion: ThemeMotion;
}) {
  useLayoutEffect(() => {
    applyThemePreferences({ theme, density, motion });
  }, [density, motion, theme]);

  return children;
}
