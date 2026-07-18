import {
  layoutWithLines,
  prepareWithSegments,
  type PreparedTextWithSegments,
} from "@chenglou/pretext";

const ASCII_CHARACTERS = ".:+-=*#@&~<>[]/\\";
const COMPLEX_GLYPH_CHARACTERS = "01";
const CJK_CHARACTER = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const REFERENCE_HEADING_FONT_SIZE = 80;
const MAX_HEADING_FONT_SIZE = 84;
const MIN_HEADING_FONT_SIZE = 32;
const MAX_HEADING_PARTICLES = 6000;
const MAX_BUBBLES = 150;

interface CollectorEffectOptions {
  particleHeadings: boolean;
  pointerTrail: boolean;
}

interface HeadingParticle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  velocityX: number;
  velocityY: number;
  character: string;
  opacity: number;
  targetOpacity: number;
  phase: number;
  delay: number;
}

interface HeadingScene {
  heading: HTMLHeadingElement;
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
  particles: HeadingParticle[];
  prepared: PreparedTextWithSegments | null;
  preparedKey: string;
  text: string;
  color: string;
  width: number;
  height: number;
  naturalHeight: number;
  devicePixelRatio: number;
  pointerX: number;
  pointerY: number;
  visible: boolean;
  startedAt: number;
  particleFontSize: number;
  targetFont: string;
  underlayLines: Array<{ text: string; x: number; y: number }>;
  hasComplexGlyphs: boolean;
  removePointerListeners: () => void;
}

interface BubbleParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  radius: number;
  life: number;
  maxLife: number;
  wobble: number;
}

function randomCharacter(complexGlyphs = false): string {
  const characters = complexGlyphs ? COMPLEX_GLYPH_CHARACTERS : ASCII_CHARACTERS;
  return characters[Math.floor(Math.random() * characters.length)] ?? ".";
}

function numericStyle(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function canvasFont(style: CSSStyleDeclaration, fontSize: number): string {
  return `${style.fontStyle} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
}

function headingText(heading: HTMLHeadingElement): string {
  return (heading.textContent ?? "").replace(/\s+/g, " ").trim();
}

function setCanvasSize(
  canvas: HTMLCanvasElement,
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  devicePixelRatio: number,
) {
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.width = Math.max(1, Math.ceil(width * devicePixelRatio));
  canvas.height = Math.max(1, Math.ceil(height * devicePixelRatio));
  context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}

function prepareHeadingScene(scene: HeadingScene) {
  const { heading, canvas, context } = scene;
  const text = headingText(heading);
  const width = Math.max(1, heading.clientWidth);
  if (!text || width <= 1) return;

  const style = getComputedStyle(heading);
  const hasComplexGlyphs = CJK_CHARACTER.test(text);
  const originalFontSize = numericStyle(style.fontSize, 40);
  const letterSpacing = numericStyle(style.letterSpacing, 0);
  const rootStyle = getComputedStyle(document.documentElement);
  const color = rootStyle.getPropertyValue("--theme-particle-heading-color").trim() || style.color;
  const referenceFont = canvasFont(style, REFERENCE_HEADING_FONT_SIZE);
  const referencePrepared = prepareWithSegments(text, referenceFont, { letterSpacing });
  const referenceLine = layoutWithLines(
    referencePrepared,
    Number.MAX_SAFE_INTEGER,
    REFERENCE_HEADING_FONT_SIZE,
  ).lines[0];
  const fittedFontSize = referenceLine
    ? Math.floor(REFERENCE_HEADING_FONT_SIZE * (width / referenceLine.width) * 0.95)
    : originalFontSize;
  const fontSize = Math.max(
    MIN_HEADING_FONT_SIZE,
    Math.min(MAX_HEADING_FONT_SIZE, Math.max(originalFontSize, fittedFontSize)),
  );
  const lineHeight = fontSize * 1.18;
  const font = canvasFont(style, fontSize);
  const preparedKey = `${text}\n${font}\n${letterSpacing}`;
  if (scene.preparedKey !== preparedKey || !scene.prepared) {
    scene.prepared = prepareWithSegments(text, font, {
      letterSpacing,
      wordBreak: style.wordBreak === "keep-all" ? "keep-all" : "normal",
    });
    scene.preparedKey = preparedKey;
  }

  const lines = layoutWithLines(scene.prepared, width, lineHeight).lines;
  const height = Math.max(scene.naturalHeight, Math.ceil(lines.length * lineHeight + 8));
  const source = document.createElement("canvas");
  source.width = Math.ceil(width);
  source.height = Math.ceil(height);
  const sourceContext = source.getContext("2d", { willReadFrequently: true });
  if (!sourceContext) return;
  sourceContext.clearRect(0, 0, width, height);
  sourceContext.font = font;
  sourceContext.fillStyle = "#fff";
  sourceContext.textBaseline = "middle";
  sourceContext.textAlign = "left";
  if ("letterSpacing" in sourceContext) sourceContext.letterSpacing = `${letterSpacing}px`;
  const totalTextHeight = Math.max(lineHeight, lines.length * lineHeight);
  const firstBaseline = (height - totalTextHeight) / 2 + lineHeight / 2;
  const underlayLines = lines.map((line, index) => {
    const x =
      style.textAlign === "center"
        ? (width - line.width) / 2
        : style.textAlign === "right" || style.textAlign === "end"
          ? width - line.width
          : 0;
    const y = firstBaseline + index * lineHeight;
    sourceContext.fillText(line.text, x, y);
    return { text: line.text, x, y };
  });

  const pixels = sourceContext.getImageData(0, 0, source.width, source.height).data;
  const sampleStep = window.innerWidth <= 600 || hasComplexGlyphs ? 2 : 4;
  const targets: Array<{ x: number; y: number }> = [];
  for (let y = 0; y < source.height; y += sampleStep) {
    for (let x = 0; x < source.width; x += sampleStep) {
      if ((pixels[(y * source.width + x) * 4 + 3] ?? 0) > 96) targets.push({ x, y });
    }
  }
  if (targets.length > MAX_HEADING_PARTICLES) {
    const keepEvery = Math.ceil(targets.length / MAX_HEADING_PARTICLES);
    scene.particles = targets.filter((_, index) => index % keepEvery === 0).map(createParticle);
  } else {
    scene.particles = targets.map(createParticle);
  }

  function createParticle(target: { x: number; y: number }): HeadingParticle {
    return {
      x: target.x + (Math.random() - 0.5) * width * 0.7,
      y: target.y + (Math.random() - 0.5) * height * 2.2,
      targetX: target.x,
      targetY: target.y,
      velocityX: 0,
      velocityY: 0,
      character: randomCharacter(hasComplexGlyphs),
      opacity: 0,
      targetOpacity: 0.85 + Math.random() * 0.15,
      phase: Math.random() * Math.PI * 2,
      delay: (target.x / width) * 1.2,
    };
  }

  scene.text = text;
  scene.color = color;
  scene.width = width;
  scene.height = height;
  scene.devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  scene.startedAt = performance.now();
  scene.particleFontSize = window.innerWidth <= 600 || hasComplexGlyphs ? 3 : 6;
  scene.targetFont = font;
  scene.underlayLines = underlayLines;
  scene.hasComplexGlyphs = hasComplexGlyphs;
  heading.style.setProperty("--collector-particle-heading-height", `${height}px`);
  setCanvasSize(canvas, context, width, height, scene.devicePixelRatio);
  heading.classList.add("collector-particle-heading");
  heading.classList.toggle("collector-particle-heading-cjk", CJK_CHARACTER.test(text));
}

function createHeadingScene(heading: HTMLHeadingElement): HeadingScene | null {
  if (!headingText(heading) || heading.clientWidth <= 1 || heading.clientHeight <= 1) return null;
  const canvas = document.createElement("canvas");
  canvas.className = "collector-particle-heading-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("2d");
  if (!context) return null;
  heading.append(canvas);

  const scene: HeadingScene = {
    heading,
    canvas,
    context,
    particles: [],
    prepared: null,
    preparedKey: "",
    text: "",
    color: "",
    width: 0,
    height: 0,
    naturalHeight: Math.max(1, heading.clientHeight),
    devicePixelRatio: 1,
    pointerX: Number.NEGATIVE_INFINITY,
    pointerY: Number.NEGATIVE_INFINITY,
    visible: true,
    startedAt: performance.now(),
    particleFontSize: 6,
    targetFont: "",
    underlayLines: [],
    hasComplexGlyphs: false,
    removePointerListeners: () => undefined,
  };

  const movePointer = (event: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    scene.pointerX = event.clientX - rect.left;
    scene.pointerY = event.clientY - rect.top;
  };
  const moveTouch = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    const rect = canvas.getBoundingClientRect();
    scene.pointerX = touch.clientX - rect.left;
    scene.pointerY = touch.clientY - rect.top;
  };
  const clearPointer = () => {
    scene.pointerX = Number.NEGATIVE_INFINITY;
    scene.pointerY = Number.NEGATIVE_INFINITY;
  };
  canvas.addEventListener("mousemove", movePointer, { passive: true });
  canvas.addEventListener("mouseleave", clearPointer);
  canvas.addEventListener("touchstart", moveTouch, { passive: true });
  canvas.addEventListener("touchmove", moveTouch, { passive: true });
  canvas.addEventListener("touchend", clearPointer);
  scene.removePointerListeners = () => {
    canvas.removeEventListener("mousemove", movePointer);
    canvas.removeEventListener("mouseleave", clearPointer);
    canvas.removeEventListener("touchstart", moveTouch);
    canvas.removeEventListener("touchmove", moveTouch);
    canvas.removeEventListener("touchend", clearPointer);
  };
  prepareHeadingScene(scene);
  return scene;
}

function drawHeadingScene(scene: HeadingScene, now: number) {
  if (!scene.visible) return;
  const { context, particles } = scene;
  context.clearRect(0, 0, scene.width, scene.height);
  context.fillStyle = scene.color;
  if (scene.hasComplexGlyphs) {
    context.globalAlpha = 0.3;
    context.font = scene.targetFont;
    context.textAlign = "left";
    context.textBaseline = "middle";
    for (const line of scene.underlayLines) {
      context.fillText(line.text, line.x, line.y);
    }
  }
  context.font = `600 ${scene.particleFontSize}px ui-monospace, "SFMono-Regular", Consolas, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  const elapsed = (now - scene.startedAt) / 1000;
  const compact = window.innerWidth <= 600;
  const interactionRadius = compact ? 50 : 100;
  const interactionForce = compact ? 5 : 3;

  for (const particle of particles) {
    const localElapsed = Math.max(0, elapsed - particle.delay);
    if (localElapsed < 0.01) {
      context.globalAlpha = 0.02;
      context.fillText(particle.character, particle.x, particle.y);
      continue;
    }
    particle.velocityX += (particle.targetX - particle.x) * 0.042;
    particle.velocityY += (particle.targetY - particle.y) * 0.042;
    const deltaX = particle.x - scene.pointerX;
    const deltaY = particle.y - scene.pointerY;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance < interactionRadius && distance > 0) {
      const force = (1 - distance / interactionRadius) ** 2 * interactionForce;
      particle.velocityX += (deltaX / distance) * force;
      particle.velocityY += (deltaY / distance) * force;
    }
    particle.velocityX *= 0.88;
    particle.velocityY *= 0.88;
    particle.x += particle.velocityX;
    particle.y += particle.velocityY;
    particle.opacity +=
      (particle.targetOpacity - particle.opacity) * (localElapsed > 0 ? 0.04 : 0.01);
    if (localElapsed < 0.8 || Math.random() < 0.0008) {
      particle.character = randomCharacter(scene.hasComplexGlyphs);
    }
    context.globalAlpha = Math.max(
      0,
      particle.targetOpacity + Math.sin(elapsed * 0.8 + particle.phase) * 0.08,
    );
    context.fillText(particle.character, particle.x, particle.y);
  }
  context.globalAlpha = 1;
}

export function mountCollectorEffects(options: CollectorEffectOptions): () => void {
  const rootStyle = getComputedStyle(document.documentElement);
  const scenes: HeadingScene[] = [];
  const sceneByHeading = new Map<HTMLHeadingElement, HeadingScene>();
  const bubbles: BubbleParticle[] = [];
  let animationFrame = 0;
  let scanFrame = 0;
  let wheelFrame = 0;
  let lastFrameAt = performance.now();
  let pagePointerX = -1;
  let pagePointerY = -1;
  let lastTrailAt = 0;
  let lastScrollY = window.scrollY;
  let pendingWheelDelta = 0;

  const headingObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const scene = sceneByHeading.get(entry.target as HTMLHeadingElement);
      if (scene) scene.visible = entry.isIntersecting;
    });
  });
  const resizeObserver = new ResizeObserver((entries) => {
    entries.forEach((entry) => {
      const scene = sceneByHeading.get(entry.target as HTMLHeadingElement);
      if (scene) prepareHeadingScene(scene);
    });
  });

  const removeScene = (scene: HeadingScene) => {
    headingObserver.unobserve(scene.heading);
    resizeObserver.unobserve(scene.heading);
    scene.removePointerListeners();
    scene.heading.classList.remove("collector-particle-heading", "collector-particle-heading-cjk");
    scene.heading.style.removeProperty("--collector-particle-heading-height");
    scene.canvas.remove();
    sceneByHeading.delete(scene.heading);
    const index = scenes.indexOf(scene);
    if (index >= 0) scenes.splice(index, 1);
  };

  const scanHeadings = () => {
    scanFrame = 0;
    const connectedHeadings = new Set(document.querySelectorAll<HTMLHeadingElement>("h1"));
    scenes.slice().forEach((scene) => {
      if (!connectedHeadings.has(scene.heading) || !scene.canvas.isConnected) removeScene(scene);
    });
    if (!options.particleHeadings) return;
    connectedHeadings.forEach((heading) => {
      const existing = sceneByHeading.get(heading);
      if (existing) {
        const currentText = headingText(heading);
        if (currentText !== existing.text) prepareHeadingScene(existing);
        return;
      }
      const scene = createHeadingScene(heading);
      if (!scene) return;
      scenes.push(scene);
      sceneByHeading.set(heading, scene);
      headingObserver.observe(heading);
      resizeObserver.observe(heading);
    });
  };

  const scheduleScan = () => {
    if (scanFrame) return;
    scanFrame = requestAnimationFrame(scanHeadings);
  };
  const domObserver = new MutationObserver(scheduleScan);
  domObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
  scheduleScan();
  void document.fonts.ready.then(() => scenes.forEach(prepareHeadingScene));

  let trailCanvas: HTMLCanvasElement | null = null;
  let trailContext: CanvasRenderingContext2D | null = null;
  let trailDevicePixelRatio = 1;
  const trailColor = rootStyle.getPropertyValue("--theme-pointer-trail-color").trim();
  const trailHighlight = rootStyle.getPropertyValue("--theme-pointer-trail-highlight").trim();

  const resizeTrail = () => {
    if (!trailCanvas || !trailContext) return;
    trailDevicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    setCanvasSize(
      trailCanvas,
      trailContext,
      window.innerWidth,
      window.innerHeight,
      trailDevicePixelRatio,
    );
  };

  const emitBubbles = (x: number, y: number, scrollDelta: number) => {
    const speed = Math.min(Math.abs(scrollDelta), 200);
    const direction = scrollDelta > 0 ? -1 : 1;
    for (let index = 0; index < 3; index += 1) {
      const maxLife = 0.6 + Math.random() * 0.2;
      bubbles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        velocityX: (Math.random() - 0.5) * 60,
        velocityY: direction * (60 + speed * 0.8 + Math.random() * 40),
        radius: 3 + Math.random() * 5,
        life: maxLife,
        maxLife,
        wobble: Math.random() * Math.PI * 2,
      });
    }
    if (bubbles.length > MAX_BUBBLES) bubbles.splice(0, bubbles.length - MAX_BUBBLES);
  };

  const trackMouse = (event: MouseEvent) => {
    pagePointerX = event.clientX;
    pagePointerY = event.clientY;
  };
  const trackTouch = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    pagePointerX = touch.clientX;
    pagePointerY = touch.clientY;
  };
  const clearPagePointer = () => {
    pagePointerX = -1;
    pagePointerY = -1;
  };
  const emitThrottledTrail = (scrollDelta: number) => {
    const now = performance.now();
    if (now - lastTrailAt < 30 || pagePointerX < 0) return;
    lastTrailAt = now;
    emitBubbles(pagePointerX, pagePointerY, scrollDelta);
  };
  const handleWheel = (event: WheelEvent) => {
    if (pagePointerX < 0) return;
    pendingWheelDelta = event.deltaY;
    if (wheelFrame) return;
    wheelFrame = requestAnimationFrame(() => {
      wheelFrame = 0;
      const scrollDelta = pendingWheelDelta;
      pendingWheelDelta = 0;
      if (scrollDelta === 0) return;
      const atTopBoundary = window.scrollY <= 0 && scrollDelta < 0;
      const atBottomBoundary =
        window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 1 &&
        scrollDelta > 0;
      if (atTopBoundary || atBottomBoundary) return;
      emitThrottledTrail(scrollDelta);
    });
  };
  const handleScroll = () => {
    if (pagePointerX < 0) return;
    const scrollDelta = window.scrollY - lastScrollY;
    lastScrollY = window.scrollY;
    if (Math.abs(scrollDelta) < 2) return;
    emitThrottledTrail(scrollDelta);
  };

  if (options.pointerTrail) {
    trailCanvas = document.createElement("canvas");
    trailCanvas.className = "collector-pointer-trail-canvas";
    trailCanvas.setAttribute("aria-hidden", "true");
    trailContext = trailCanvas.getContext("2d");
    document.body.append(trailCanvas);
    resizeTrail();
    window.addEventListener("mousemove", trackMouse, { passive: true });
    window.addEventListener("touchstart", trackTouch, { passive: true });
    window.addEventListener("touchmove", trackTouch, { passive: true });
    window.addEventListener("touchend", clearPagePointer);
    document.addEventListener("mouseleave", clearPagePointer);
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("blur", clearPagePointer);
  }

  const drawBubbles = (deltaSeconds: number) => {
    if (!trailContext) return;
    trailContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (let index = bubbles.length - 1; index >= 0; index -= 1) {
      const bubble = bubbles[index];
      if (!bubble) continue;
      bubble.life -= deltaSeconds;
      if (bubble.life <= 0) {
        bubbles.splice(index, 1);
        continue;
      }
      bubble.wobble += deltaSeconds * 4;
      bubble.x += (bubble.velocityX + Math.sin(bubble.wobble) * 9) * deltaSeconds;
      bubble.y += bubble.velocityY * deltaSeconds;
      bubble.velocityX *= 0.985;
      bubble.velocityY *= 0.992;
      const progress = bubble.life / bubble.maxLife;
      trailContext.globalAlpha = Math.max(0, progress * progress * 0.82);
      trailContext.beginPath();
      trailContext.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
      trailContext.strokeStyle = trailColor;
      trailContext.lineWidth = Math.max(1, bubble.radius * 0.22);
      trailContext.stroke();
      trailContext.beginPath();
      trailContext.arc(
        bubble.x - bubble.radius * 0.28,
        bubble.y - bubble.radius * 0.3,
        Math.max(0.8, bubble.radius * 0.18),
        0,
        Math.PI * 2,
      );
      trailContext.fillStyle = trailHighlight;
      trailContext.fill();
    }
    trailContext.globalAlpha = 1;
  };

  const animate = (now: number) => {
    animationFrame = 0;
    const deltaSeconds = Math.min((now - lastFrameAt) / 1000, 0.05);
    lastFrameAt = now;
    scenes.forEach((scene) => drawHeadingScene(scene, now));
    drawBubbles(deltaSeconds);
    if (!document.hidden) animationFrame = requestAnimationFrame(animate);
  };

  const startAnimation = () => {
    if (!animationFrame && !document.hidden) {
      lastFrameAt = performance.now();
      animationFrame = requestAnimationFrame(animate);
    }
  };
  const visibilityChange = () => {
    if (document.hidden) {
      clearPagePointer();
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = 0;
      }
    } else {
      startAnimation();
    }
  };
  const windowResize = () => {
    resizeTrail();
    scenes.forEach(prepareHeadingScene);
  };
  document.addEventListener("visibilitychange", visibilityChange);
  window.addEventListener("resize", windowResize, { passive: true });
  startAnimation();

  return () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    if (scanFrame) cancelAnimationFrame(scanFrame);
    if (wheelFrame) cancelAnimationFrame(wheelFrame);
    domObserver.disconnect();
    headingObserver.disconnect();
    resizeObserver.disconnect();
    scenes.slice().forEach(removeScene);
    document.removeEventListener("visibilitychange", visibilityChange);
    window.removeEventListener("resize", windowResize);
    window.removeEventListener("mousemove", trackMouse);
    window.removeEventListener("touchstart", trackTouch);
    window.removeEventListener("touchmove", trackTouch);
    window.removeEventListener("touchend", clearPagePointer);
    document.removeEventListener("mouseleave", clearPagePointer);
    window.removeEventListener("wheel", handleWheel);
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("blur", clearPagePointer);
    trailCanvas?.remove();
    bubbles.length = 0;
  };
}
