"use client";

import {
  Children,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  useEffect,
  useRef,
} from "react";

const MIN_SPLIT_PERCENT = 24;
const MAX_SPLIT_PERCENT = 76;
const KEYBOARD_STEP_PERCENT = 2;

type SplitGridStyle = CSSProperties & {
  "--workspace-split"?: string;
};

interface DragState {
  pointerId: number;
  left: number;
  width: number;
}

interface ResizableTaskGridProps {
  children: ReactNode;
  className: string;
  defaultSplit: number;
  storageKey: string;
  separatorLabel: string;
}

function clampSplit(value: number): number {
  return Math.min(MAX_SPLIT_PERCENT, Math.max(MIN_SPLIT_PERCENT, value));
}

function readStoredSplit(storageKey: string, fallback: number): number {
  try {
    const stored = Number.parseFloat(window.localStorage.getItem(storageKey) ?? "");
    return Number.isFinite(stored) ? clampSplit(stored) : fallback;
  } catch {
    return fallback;
  }
}

function storeSplit(storageKey: string, value: number) {
  try {
    window.localStorage.setItem(storageKey, value.toFixed(2));
  } catch {
    // Resizing still works when storage is unavailable.
  }
}

export function ResizableTaskGrid({
  children,
  className,
  defaultSplit,
  storageKey,
  separatorLabel,
}: ResizableTaskGridProps) {
  const panes = Children.toArray(children);
  const initialSplit = clampSplit(defaultSplit);
  const gridRef = useRef<HTMLDivElement>(null);
  const separatorRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const splitRef = useRef(initialSplit);
  const pendingSplitRef = useRef(initialSplit);
  const animationFrameRef = useRef<number | null>(null);

  const applySplit = (value: number) => {
    const split = clampSplit(value);
    splitRef.current = split;
    gridRef.current?.style.setProperty("--workspace-split", `${split}%`);
    separatorRef.current?.setAttribute("aria-valuenow", String(Math.round(split)));
    separatorRef.current?.setAttribute("aria-valuetext", `左侧区域 ${Math.round(split)}%`);
  };

  const flushPendingSplit = () => {
    if (animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    applySplit(pendingSplitRef.current);
  };

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = null;
    flushPendingSplit();
    storeSplit(storageKey, splitRef.current);
    document.documentElement.classList.remove("workspace-resizing");
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    applySplit(readStoredSplit(storageKey, clampSplit(defaultSplit)));
    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
      }
      document.documentElement.classList.remove("workspace-resizing");
    };
  }, [defaultSplit, storageKey]);

  if (panes.length !== 2) {
    throw new Error("ResizableTaskGrid requires exactly two panes.");
  }

  return (
    <div
      ref={gridRef}
      className={`task-grid resizable-task-grid ${className}`}
      style={{ "--workspace-split": `${initialSplit}%` } as SplitGridStyle}
    >
      {panes[0]}
      <div
        ref={separatorRef}
        className="workspace-splitter"
        data-ui-anchor="splitter"
        role="separator"
        tabIndex={0}
        aria-label={separatorLabel}
        aria-orientation="vertical"
        aria-valuemin={MIN_SPLIT_PERCENT}
        aria-valuemax={MAX_SPLIT_PERCENT}
        aria-valuenow={Math.round(initialSplit)}
        aria-valuetext={`左侧区域 ${Math.round(initialSplit)}%`}
        title="左右拖动调整宽度；双击恢复默认"
        onDoubleClick={() => {
          applySplit(defaultSplit);
          storeSplit(storageKey, splitRef.current);
        }}
        onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
          let nextSplit: number | null = null;
          if (event.key === "ArrowLeft") {
            nextSplit = splitRef.current - KEYBOARD_STEP_PERCENT;
          } else if (event.key === "ArrowRight") {
            nextSplit = splitRef.current + KEYBOARD_STEP_PERCENT;
          } else if (event.key === "Home") {
            nextSplit = MIN_SPLIT_PERCENT;
          } else if (event.key === "End") {
            nextSplit = MAX_SPLIT_PERCENT;
          }
          if (nextSplit === null) return;
          event.preventDefault();
          applySplit(nextSplit);
          storeSplit(storageKey, splitRef.current);
        }}
        onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
          if (event.button !== 0 || !gridRef.current) return;
          const bounds = gridRef.current.getBoundingClientRect();
          if (bounds.width <= 0) return;
          event.preventDefault();
          dragRef.current = {
            pointerId: event.pointerId,
            left: bounds.left,
            width: bounds.width,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
          document.documentElement.classList.add("workspace-resizing");
        }}
        onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          pendingSplitRef.current = ((event.clientX - drag.left) / drag.width) * 100;
          if (animationFrameRef.current !== null) return;
          animationFrameRef.current = window.requestAnimationFrame(() => {
            animationFrameRef.current = null;
            applySplit(pendingSplitRef.current);
          });
        }}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onLostPointerCapture={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) finishDrag(event);
        }}
      >
        <span aria-hidden="true" />
      </div>
      {panes[1]}
    </div>
  );
}
