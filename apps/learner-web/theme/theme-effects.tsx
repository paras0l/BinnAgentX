"use client";

import { useEffect } from "react";

type EffectCleanup = () => void;

function enabledFeatures(): { particleHeadings: boolean; pointerTrail: boolean } | null {
  const root = document.documentElement;
  const features = new Set((root.dataset.themeFeatures ?? "").split(/\s+/).filter(Boolean));
  const particleHeadings = features.has("particle-headings");
  const pointerTrail = features.has("pointer-trail");
  if (root.dataset.themeTier !== "collector" || (!particleHeadings && !pointerTrail)) return null;
  if (root.dataset.motion === "reduced") return null;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  return { particleHeadings, pointerTrail };
}

export function ThemeEffects() {
  useEffect(() => {
    let cleanup: EffectCleanup | null = null;
    let activation = 0;
    let scheduledFrame = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const stop = () => {
      activation += 1;
      cleanup?.();
      cleanup = null;
    };

    const sync = () => {
      scheduledFrame = 0;
      stop();
      const features = enabledFeatures();
      if (!features) return;
      const currentActivation = activation;
      void import("./collector-effects-runtime").then(({ mountCollectorEffects }) => {
        if (currentActivation !== activation || !enabledFeatures()) return;
        cleanup = mountCollectorEffects(features);
      });
    };

    const scheduleSync = () => {
      if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
      scheduledFrame = requestAnimationFrame(sync);
    };

    const observer = new MutationObserver(scheduleSync);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "data-theme-tier", "data-theme-features", "data-motion"],
    });
    reducedMotion.addEventListener("change", scheduleSync);
    scheduleSync();

    return () => {
      if (scheduledFrame) cancelAnimationFrame(scheduledFrame);
      observer.disconnect();
      reducedMotion.removeEventListener("change", scheduleSync);
      stop();
    };
  }, []);

  return null;
}
