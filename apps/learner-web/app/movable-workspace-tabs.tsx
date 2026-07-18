"use client";

import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export type WorkspacePane = "left" | "right";
export type ExpressionWorkspaceTab = "brief" | "board" | "review" | "task" | "temporary" | "notes";

export interface ExpressionTabLayout {
  left: ExpressionWorkspaceTab[];
  right: ExpressionWorkspaceTab[];
}

export interface ActiveExpressionTabs {
  left: ExpressionWorkspaceTab | null;
  right: ExpressionWorkspaceTab | null;
}

interface DropTarget {
  pane: WorkspacePane;
  index: number;
}

interface PendingDrag {
  pointerId: number;
  tab: ExpressionWorkspaceTab;
  startX: number;
  startY: number;
  active: boolean;
}

interface MovableWorkspaceTabsProps {
  pane: WorkspacePane;
  tabs: ExpressionWorkspaceTab[];
  activeTab: ExpressionWorkspaceTab | null;
  labels: Record<ExpressionWorkspaceTab, string>;
  badges?: Partial<Record<ExpressionWorkspaceTab, string>>;
  onActivate: (pane: WorkspacePane, tab: ExpressionWorkspaceTab) => void;
  onMove: (tab: ExpressionWorkspaceTab, target: DropTarget) => void;
}

const LONG_PRESS_MS = 300;
const CANCEL_DISTANCE = 8;

export function defaultExpressionTabLayout(includeTemporary: boolean): ExpressionTabLayout {
  return {
    left: ["brief", "board", "review"],
    right: includeTemporary ? ["task", "temporary", "notes"] : ["task", "notes"],
  };
}

export function normalizeExpressionTabLayout(
  value: unknown,
  includeTemporary: boolean,
): ExpressionTabLayout {
  const fallback = defaultExpressionTabLayout(includeTemporary);
  const allowed = new Set<ExpressionWorkspaceTab>([...fallback.left, ...fallback.right]);
  if (!value || typeof value !== "object") return fallback;

  const candidate = value as Partial<Record<WorkspacePane, unknown>>;
  const seen = new Set<ExpressionWorkspaceTab>();
  const readPane = (pane: WorkspacePane) => {
    if (!Array.isArray(candidate[pane])) return [];
    return candidate[pane].filter((tab): tab is ExpressionWorkspaceTab => {
      if (typeof tab !== "string" || !allowed.has(tab as ExpressionWorkspaceTab)) return false;
      const typedTab = tab as ExpressionWorkspaceTab;
      if (seen.has(typedTab)) return false;
      seen.add(typedTab);
      return true;
    });
  };

  const left = readPane("left");
  const right = readPane("right");
  for (const tab of [...fallback.left, ...fallback.right]) {
    if (!seen.has(tab)) (fallback.left.includes(tab) ? left : right).push(tab);
  }
  return { left, right };
}

export function moveExpressionTab(
  layout: ExpressionTabLayout,
  tab: ExpressionWorkspaceTab,
  target: DropTarget,
): ExpressionTabLayout {
  const sourcePane = layout.left.includes(tab)
    ? "left"
    : layout.right.includes(tab)
      ? "right"
      : null;
  if (!sourcePane) return layout;

  const next = {
    left: layout.left.filter((item) => item !== tab),
    right: layout.right.filter((item) => item !== tab),
  };
  const targetTabs = next[target.pane];
  const sourceIndex = layout[sourcePane].indexOf(tab);
  const adjustedIndex =
    sourcePane === target.pane && sourceIndex < target.index ? target.index - 1 : target.index;
  targetTabs.splice(Math.max(0, Math.min(adjustedIndex, targetTabs.length)), 0, tab);
  return next;
}

export function readExpressionTabLayout(
  storageKey: string,
  includeTemporary: boolean,
): ExpressionTabLayout {
  try {
    return normalizeExpressionTabLayout(
      JSON.parse(window.localStorage.getItem(storageKey) ?? "null"),
      includeTemporary,
    );
  } catch {
    return defaultExpressionTabLayout(includeTemporary);
  }
}

export function saveExpressionTabLayout(storageKey: string, layout: ExpressionTabLayout) {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(layout));
  } catch {
    // The current layout remains usable when storage is unavailable.
  }
}

function dropTargetAtPoint(clientX: number, clientY: number): DropTarget | null {
  const strip = document
    .elementFromPoint(clientX, clientY)
    ?.closest<HTMLElement>("[data-movable-tab-strip]");
  const pane = strip?.dataset.movableTabStrip;
  if (!strip || (pane !== "left" && pane !== "right")) return null;

  const buttons = Array.from(strip.querySelectorAll<HTMLElement>("[data-movable-tab]"));
  const index = buttons.findIndex(
    (button) => clientX < button.getBoundingClientRect().left + button.offsetWidth / 2,
  );
  return { pane, index: index < 0 ? buttons.length : index };
}

export function MovableWorkspaceTabs({
  pane,
  tabs,
  activeTab,
  labels,
  badges,
  onActivate,
  onMove,
}: MovableWorkspaceTabsProps) {
  const [pressedTab, setPressedTab] = useState<ExpressionWorkspaceTab | null>(null);
  const [draggedTab, setDraggedTab] = useState<ExpressionWorkspaceTab | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const pendingRef = useRef<PendingDrag | null>(null);
  const timerRef = useRef<number | null>(null);
  const suppressClickRef = useRef(false);

  const clearTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const resetDrag = () => {
    clearTimer();
    pendingRef.current = null;
    setPressedTab(null);
    setDraggedTab(null);
    setDropTarget(null);
    document.documentElement.classList.remove("workspace-tab-dragging");
  };

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      document.documentElement.classList.remove("workspace-tab-dragging");
    },
    [],
  );

  const beginPress = (event: ReactPointerEvent<HTMLButtonElement>, tab: ExpressionWorkspaceTab) => {
    if (event.button !== 0) return;
    clearTimer();
    suppressClickRef.current = false;
    setPressedTab(tab);
    pendingRef.current = {
      pointerId: event.pointerId,
      tab,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
    setPointer({ x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    timerRef.current = window.setTimeout(() => {
      const pending = pendingRef.current;
      if (!pending || pending.pointerId !== event.pointerId) return;
      pending.active = true;
      suppressClickRef.current = true;
      setDraggedTab(tab);
      setDropTarget({ pane, index: tabs.indexOf(tab) });
      document.documentElement.classList.add("workspace-tab-dragging");
    }, LONG_PRESS_MS);
  };

  const movePress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pending = pendingRef.current;
    if (!pending || pending.pointerId !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
    if (!pending.active && distance > CANCEL_DISTANCE) {
      resetDrag();
      return;
    }
    if (!pending.active) return;
    event.preventDefault();
    setPointer({ x: event.clientX, y: event.clientY });
    setDropTarget(dropTargetAtPoint(event.clientX, event.clientY));
  };

  const finishPress = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const pending = pendingRef.current;
    if (!pending || pending.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const shouldMove = pending.active && dropTarget;
    const tab = pending.tab;
    resetDrag();
    if (shouldMove) onMove(tab, shouldMove);
  };

  return (
    <div
      className={`movable-workspace-tabs${dropTarget?.pane === pane ? " drop-target" : ""}`}
      data-movable-tab-strip={pane}
    >
      {tabs.length === 0 ? <span className="movable-tab-empty">把标签拖到这里</span> : null}
      {tabs.length > 0 ? (
        <div
          className="movable-tab-list"
          role="tablist"
          aria-label={pane === "left" ? "左栏标签" : "右栏标签"}
        >
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={activeTab === tab}
              aria-label={`${labels[tab]}，长按拖动调整位置`}
              className={`${pressedTab === tab ? "pressing" : ""}${
                draggedTab === tab ? " dragging" : ""
              }`}
              data-movable-tab={tab}
              onClick={(event) => {
                if (suppressClickRef.current) {
                  event.preventDefault();
                  suppressClickRef.current = false;
                  return;
                }
                onActivate(pane, tab);
              }}
              onPointerDown={(event) => beginPress(event, tab)}
              onPointerMove={movePress}
              onPointerUp={finishPress}
              onPointerCancel={finishPress}
              onLostPointerCapture={(event) => {
                if (pendingRef.current?.pointerId === event.pointerId) finishPress(event);
              }}
            >
              {labels[tab]}
              {badges?.[tab] ? <span>{badges[tab]}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
      {draggedTab ? (
        <span
          className="movable-tab-ghost"
          style={{ transform: `translate(${pointer.x + 12}px, ${pointer.y + 12}px)` }}
          aria-hidden="true"
        >
          {labels[draggedTab]}
        </span>
      ) : null}
      <span className="sr-only" aria-live="polite">
        {draggedTab ? `正在移动${labels[draggedTab]}` : ""}
      </span>
    </div>
  );
}
