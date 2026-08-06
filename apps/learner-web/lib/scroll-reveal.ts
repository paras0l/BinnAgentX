interface RevealWithinContainerOptions {
  container: HTMLElement | null;
  target: HTMLElement | null;
  topOffset?: number;
  reducedMotion?: boolean;
}

interface GeneratedResultAnimation {
  animation: Animation;
  cancel: () => void;
}

const generatedResultAnimations = new WeakMap<HTMLElement, GeneratedResultAnimation>();

export function revealWithinScrollContainer({
  container,
  target,
  topOffset = 16,
  reducedMotion = false,
}: RevealWithinContainerOptions): boolean {
  if (!container || !target) return false;

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const nextTop = Math.max(
    0,
    container.scrollTop + targetRect.top - containerRect.top - topOffset,
  );

  container.scrollTo({
    top: nextTop,
    behavior: reducedMotion ? "auto" : "smooth",
  });
  target.focus({ preventScroll: true });
  return true;
}

export function announceGeneratedResult(
  options: RevealWithinContainerOptions,
): boolean {
  const { target, reducedMotion = false } = options;
  if (!revealWithinScrollContainer(options) || !target) return false;

  generatedResultAnimations.get(target)?.cancel();
  if (reducedMotion || typeof target.animate !== "function") return true;

  const animation = target.animate(
    [
      { outlineColor: "transparent", boxShadow: "none", offset: 0 },
      {
        outlineColor: "color-mix(in srgb, var(--theme-accent) 82%, white)",
        boxShadow:
          "0 0 0 5px color-mix(in srgb, var(--theme-accent) 24%, transparent)",
        offset: 0.18,
      },
      { outlineColor: "transparent", boxShadow: "none", offset: 0.38 },
      {
        outlineColor: "color-mix(in srgb, var(--theme-accent) 82%, white)",
        boxShadow:
          "0 0 0 5px color-mix(in srgb, var(--theme-accent) 24%, transparent)",
        offset: 0.58,
      },
      { outlineColor: "transparent", boxShadow: "none", offset: 0.78 },
      { outlineColor: "transparent", boxShadow: "none", offset: 1 },
    ],
    { duration: 2200, easing: "ease-out" },
  );
  const cleanup = () => {
    target.removeEventListener("mouseenter", cancel);
    if (generatedResultAnimations.get(target)?.animation === animation) {
      generatedResultAnimations.delete(target);
    }
  };
  const cancel = () => {
    animation.cancel();
    cleanup();
  };

  target.addEventListener("mouseenter", cancel, { once: true });
  animation.addEventListener("finish", cleanup, { once: true });
  generatedResultAnimations.set(target, { animation, cancel });
  return true;
}
