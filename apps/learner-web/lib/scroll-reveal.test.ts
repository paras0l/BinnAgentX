import { describe, expect, it, vi } from "vitest";

import { announceGeneratedResult, revealWithinScrollContainer } from "./scroll-reveal";

describe("revealWithinScrollContainer", () => {
  it("scrolls only the supplied container and preserves focus without another scroll", () => {
    const container = document.createElement("section");
    const target = document.createElement("article");
    Object.defineProperty(container, "scrollTop", { value: 240, writable: true });
    container.getBoundingClientRect = () => ({ top: 100 }) as DOMRect;
    target.getBoundingClientRect = () => ({ top: 560 }) as DOMRect;
    const scrollTo = vi.fn();
    const focus = vi.fn();
    container.scrollTo = scrollTo;
    target.focus = focus;

    expect(
      revealWithinScrollContainer({ container, target, topOffset: 72 }),
    ).toBe(true);
    expect(scrollTo).toHaveBeenCalledWith({ top: 628, behavior: "smooth" });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("does nothing until both rendered elements are available", () => {
    expect(revealWithinScrollContainer({ container: null, target: null })).toBe(false);
  });

  it("restarts the shared success animation after every generated result", () => {
    const container = document.createElement("section");
    const target = document.createElement("article");
    container.scrollTo = vi.fn();
    target.focus = vi.fn();
    const firstAnimation = {
      addEventListener: vi.fn(),
      cancel: vi.fn(),
    } as unknown as Animation;
    const secondAnimation = {
      addEventListener: vi.fn(),
      cancel: vi.fn(),
    } as unknown as Animation;
    target.animate = vi.fn().mockReturnValueOnce(firstAnimation).mockReturnValueOnce(secondAnimation);

    expect(announceGeneratedResult({ container, target })).toBe(true);
    expect(announceGeneratedResult({ container, target })).toBe(true);
    expect(firstAnimation.cancel).toHaveBeenCalledOnce();
    expect(target.animate).toHaveBeenCalledTimes(2);
    expect(target.animate).toHaveBeenLastCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ outlineColor: "transparent", offset: 0 }),
        expect.objectContaining({ offset: 0.58 }),
        expect.objectContaining({ outlineColor: "transparent", offset: 1 }),
      ]),
      { duration: 2200, easing: "ease-out" },
    );

    target.dispatchEvent(new MouseEvent("mouseenter"));
    expect(secondAnimation.cancel).toHaveBeenCalledOnce();
  });

  it("keeps positioning and focus but suppresses animation for reduced motion", () => {
    const container = document.createElement("section");
    const target = document.createElement("article");
    container.scrollTo = vi.fn();
    target.focus = vi.fn();
    target.animate = vi.fn();

    expect(announceGeneratedResult({ container, target, reducedMotion: true })).toBe(true);
    expect(target.animate).not.toHaveBeenCalled();
  });
});
