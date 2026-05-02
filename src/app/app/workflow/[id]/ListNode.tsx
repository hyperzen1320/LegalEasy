"use client";

import { useState, useRef, useEffect } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CardPreview, { type PreviewTask } from "./CardPreview";

export type ListNodeData = {
  list: {
    id: string;
    title: string;
    sortOrder: number;
    width: number;
    color: string | null;
  };
  tasks: PreviewTask[];
  accent: string;
  canEdit: boolean;
  selected?: boolean;
  onTaskClick: (id: string) => void;
  onListRename: (listId: string, title: string) => void;
  onListDelete: (listId: string) => void;
  onListColorChange: (listId: string, color: string | null) => void;
  onTaskAdd: (listId: string, title: string) => void;
};

// Connection handles. Pattern borrowed from ScopeOut's MindMap canvas:
//
//  • An INVISIBLE React Flow <Handle> at each side, sized 1×1 — these are
//    the actual connection anchor points used for snap-on-drop.
//  • A VISIBLE 28×28 "+" connector pill positioned 18px outside the node
//    that doubles as the drag handle (it sits inside the React Flow
//    handle's stacking context with pointerEvents pass-through).
//  • The pill scales up + glows on hover so the user gets unmistakable
//    feedback that this is what they grab to draw a connection.
//  • Only renders on hover/selection of the node — a clean canvas at
//    rest, an obvious affordance the moment the cursor enters.
//
// The pill is also a real <Handle> with the same id as the invisible
// dot, so React Flow accepts a connection drag started on it. We render
// both for redundancy: the invisible dot keeps the snap radius working
// when a connection is dropped near the node edge, and the visible pill
// is what the user actually grabs.

const CONNECTOR_SIZE = 28;
const CONNECTOR_OFFSET = 18; // distance from the node edge to the pill center

export default function ListNode(props: NodeProps & { data: ListNodeData }) {
  const { data, selected, id: nodeId } = props;
  const { list, tasks, accent, canEdit, onTaskClick } = data;

  const droppable = useDroppable({
    id: `list-drop:${list.id}`,
    data: { type: "list", listId: list.id },
  });

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [menu, setMenu] = useState(false);
  useEffect(() => setTitle(list.title), [list.title]);

  function commitTitle() {
    setEditing(false);
    if (title.trim() && title.trim() !== list.title) {
      data.onListRename(list.id, title.trim());
    } else {
      setTitle(list.title);
    }
  }

  function commitAddCard() {
    if (newTitle.trim()) {
      data.onTaskAdd(list.id, newTitle.trim());
      setNewTitle("");
    } else {
      setAdding(false);
    }
  }

  const stripeColor = list.color || accent;
  // Lists with a temp:* id are still being saved server-side. We mark
  // them so the global pending styles (dim + blinking dot) apply.
  const isPending = list.id.startsWith("tmp:");

  return (
    <div
      className="relative"
      data-le-id={list.id}
      data-le-pending={isPending ? "true" : undefined}
      style={{
        width: list.width,
        backgroundColor: "rgba(255, 255, 255, 0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 14,
        boxShadow: selected
          ? `0 0 0 2px ${stripeColor}80, 0 24px 48px -16px rgba(10,17,36,0.25), 0 4px 12px -4px rgba(10,17,36,0.10)`
          : "0 16px 32px -12px rgba(10,17,36,0.18), 0 2px 6px -2px rgba(10,17,36,0.08)",
        border: "1px solid rgba(10,17,36,0.06)",
        // overflow stays VISIBLE so the list-menu dropdown (color swatches,
        // delete) can escape the wrapper. Earlier this was hidden, which
        // clipped the bottom row of swatches. The top accent stripe now
        // self-clips via its own border-top radii.
        overflow: "visible",
        transition: "box-shadow 200ms, transform 200ms",
      }}
    >
      {/* Top stripe — self-clipped with the same top-corner radii as the
          wrapper, so removing the wrapper's overflow:hidden doesn't leave
          a visible square edge. */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${stripeColor}, ${stripeColor}cc)`,
          borderTopLeftRadius: 14,
          borderTopRightRadius: 14,
        }}
      />

      {/* Header — this is the drag handle for the node */}
      <div
        className="flex items-center gap-2 px-4 pt-3 pb-2"
        style={{
          cursor: canEdit ? "grab" : "default",
        }}
      >
        {editing ? (
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitTitle();
              }
              if (e.key === "Escape") {
                setTitle(list.title);
                setEditing(false);
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="nodrag flex-1 rounded bg-transparent px-1 text-[14px] font-semibold outline-none"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-ink)",
              border: `1px solid ${stripeColor}`,
            }}
          />
        ) : (
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (canEdit) setEditing(true);
            }}
            className="nodrag flex-1 text-left text-[14px] font-semibold tracking-tight"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-ink)",
            }}
          >
            {list.title}
          </button>
        )}
        <span
          className="text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            color: "var(--color-app-fg-muted)",
            backgroundColor: "var(--color-app-canvas-2)",
            letterSpacing: 0.5,
            minWidth: 22,
            textAlign: "center",
          }}
        >
          {tasks.length}
        </span>
        {canEdit ? (
          <ListMenu
            stripeColor={stripeColor}
            open={menu}
            onOpen={() => setMenu(true)}
            onClose={() => setMenu(false)}
            onRename={() => {
              setMenu(false);
              setEditing(true);
            }}
            onColorChange={(c) => {
              setMenu(false);
              data.onListColorChange(list.id, c);
            }}
            onDelete={() => {
              setMenu(false);
              if (
                confirm(
                  `Delete list "${list.title}"? All ${tasks.length} card${tasks.length === 1 ? "" : "s"} in this list will be removed too.`
                )
              ) {
                data.onListDelete(list.id);
              }
            }}
          />
        ) : null}
      </div>

      {/* Card area */}
      <div
        ref={droppable.setNodeRef}
        className="nodrag nowheel"
        style={{
          padding: "4px 8px 8px",
          minHeight: 60,
          backgroundColor: droppable.isOver
            ? `${stripeColor}10`
            : "transparent",
          transition: "background-color 200ms",
        }}
      >
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {tasks.map((t) => (
              <SortableCard
                key={t.id}
                task={t}
                accent={stripeColor}
                onClick={() => onTaskClick(t.id)}
              />
            ))}
            {tasks.length === 0 && !adding ? (
              <div
                className="flex flex-col items-center justify-center rounded-md py-6 text-center"
                style={{
                  border: "1px dashed var(--color-app-edge)",
                }}
              >
                <span
                  className="text-[10px] uppercase tracking-[0.22em]"
                  style={{
                    fontFamily: "var(--font-dm-mono), monospace",
                    color: "var(--color-app-fg-muted)",
                    fontStyle: "normal",
                  }}
                >
                  {droppable.isOver ? "Drop here" : "Empty"}
                </span>
              </div>
            ) : null}
          </div>
        </SortableContext>
      </div>

      {/* Add card composer */}
      {canEdit ? (
        <div className="nodrag px-2 pb-3" onPointerDown={(e) => e.stopPropagation()}>
          {adding ? (
            <div
              className="rounded-md p-2"
              style={{
                backgroundColor: "var(--color-app-paper)",
                boxShadow: `0 0 0 2px ${stripeColor}40`,
              }}
            >
              <textarea
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    commitAddCard();
                  }
                  if (e.key === "Escape") {
                    setAdding(false);
                    setNewTitle("");
                  }
                }}
                placeholder="Title of this card…"
                rows={2}
                className="block w-full resize-none rounded bg-transparent px-2 py-1.5 text-[13px] outline-none"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  color: "var(--color-app-ink)",
                }}
              />
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  onClick={commitAddCard}
                  className="rounded-md px-3 py-1 text-[11px] font-semibold"
                  style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    backgroundColor: stripeColor,
                    color: stripeColor === "#c5853a" ? "#2a1c08" : "#ffffff",
                  }}
                >
                  Add card
                </button>
                <button
                  onClick={() => {
                    setAdding(false);
                    setNewTitle("");
                  }}
                  className="text-[10px] uppercase"
                  style={{
                    fontFamily: "var(--font-dm-mono), monospace",
                    color: "var(--color-app-fg-muted)",
                    letterSpacing: 1.2,
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="flex w-full items-center gap-1.5 rounded-md px-3 py-2 text-left text-[12px] transition-colors"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-fg-muted)",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--color-app-canvas-2)";
                e.currentTarget.style.color = "var(--color-app-ink)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "var(--color-app-fg-muted)";
              }}
            >
              <span aria-hidden style={{ fontSize: 14 }}>
                +
              </span>
              Add a card
            </button>
          )}
        </div>
      ) : null}

      {/* Connection pills. One <Handle> per side, sized 28×28 with a
          bold "+" inside and a clear coloured fill so it reads as a
          button rather than a vague dot. Centered on the node edge so
          the edge endpoint snaps cleanly. Visible at 0.5 opacity at
          rest (subtle but discoverable), and pops to 1.0 + a small
          scale on hover. */}
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <ConnectionPill
          key={side}
          side={side}
          color={stripeColor}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}

function ConnectionPill({
  side,
  color,
  canEdit,
}: {
  side: "top" | "right" | "bottom" | "left";
  color: string;
  canEdit: boolean;
}) {
  const sideToPos: Record<typeof side, Position> = {
    top: Position.Top,
    right: Position.Right,
    bottom: Position.Bottom,
    left: Position.Left,
  };

  // Pill is half inside / half outside the node so the connection
  // endpoint snaps onto the node edge while the visible affordance
  // extends outside, away from the cards/header where the user might
  // accidentally try to drag-pan.
  const pos: React.CSSProperties = {};
  switch (side) {
    case "top":
      pos.top = -CONNECTOR_SIZE / 2;
      pos.left = "50%";
      pos.transform = "translateX(-50%)";
      break;
    case "right":
      pos.right = -CONNECTOR_SIZE / 2;
      pos.top = "50%";
      pos.transform = "translateY(-50%)";
      break;
    case "bottom":
      pos.bottom = -CONNECTOR_SIZE / 2;
      pos.left = "50%";
      pos.transform = "translateX(-50%)";
      break;
    case "left":
      pos.left = -CONNECTOR_SIZE / 2;
      pos.top = "50%";
      pos.transform = "translateY(-50%)";
      break;
  }

  return (
    <Handle
      type="source"
      position={sideToPos[side]}
      id={side}
      isConnectable={canEdit}
      className="le-connection-pill"
      style={{
        ...pos,
        width: CONNECTOR_SIZE,
        height: CONNECTOR_SIZE,
        minWidth: CONNECTOR_SIZE,
        minHeight: CONNECTOR_SIZE,
        borderRadius: 999,
        backgroundColor: color,
        border: "2px solid #fff",
        boxShadow: `0 4px 10px -2px ${color}66`,
        cursor: "crosshair",
        opacity: canEdit ? 0.55 : 0,
        transition:
          "opacity 160ms ease, transform 160ms ease, box-shadow 160ms ease",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: 15,
        fontWeight: 700,
        lineHeight: 1,
        fontFamily: "system-ui, -apple-system, sans-serif",
        // Make sure the pill is above sibling content so it's grabbable
        // even when a card extends to the list edge.
        zIndex: 5,
      }}
    >
      <span
        aria-hidden
        style={{
          transform: "translateY(-1px)",
          pointerEvents: "none",
        }}
      >
        +
      </span>
    </Handle>
  );
}

/* ─── Sortable card wrapper (lives inside the list) ─── */

function SortableCard({
  task,
  accent,
  onClick,
}: {
  task: PreviewTask;
  accent: string;
  onClick: () => void;
}) {
  const sortable = useSortable({
    id: task.id,
    data: { type: "task", taskId: task.id, listId: task.listId },
  });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : 1,
  };
  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      {...sortable.attributes}
      {...sortable.listeners}
    >
      <CardPreview task={task} onClick={onClick} accent={accent} />
    </div>
  );
}

/* ─── List menu ─── */

const COLOR_PRESETS: { v: string | null; hex: string; label: string }[] = [
  { v: null, hex: "transparent", label: "Default" },
  { v: "#3a5a40", hex: "#3a5a40", label: "Forest" },
  { v: "#c5853a", hex: "#c5853a", label: "Copper" },
  { v: "#56a0a8", hex: "#56a0a8", label: "Sea" },
  { v: "#c14a37", hex: "#c14a37", label: "Terracotta" },
  { v: "#d4a373", hex: "#d4a373", label: "Ochre" },
  { v: "#6b2737", hex: "#6b2737", label: "Plum" },
  { v: "#0a1124", hex: "#0a1124", label: "Ink" },
];

function ListMenu({
  stripeColor,
  open,
  onOpen,
  onClose,
  onRename,
  onDelete,
  onColorChange,
}: {
  stripeColor: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onRename: () => void;
  onDelete: () => void;
  onColorChange: (color: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div
      ref={ref}
      className="relative nodrag"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          open ? onClose() : onOpen();
        }}
        className="flex h-7 w-7 items-center justify-center rounded transition-colors"
        style={{ color: "var(--color-app-fg-muted)" }}
        aria-label="List menu"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="6" cy="12" r="1.6" />
          <circle cx="12" cy="12" r="1.6" />
          <circle cx="18" cy="12" r="1.6" />
        </svg>
      </button>
      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={onClose} />
          <div
            className="absolute right-0 top-9 z-40 min-w-[200px] rounded-lg p-2"
            style={{
              backgroundColor: "var(--color-app-paper)",
              boxShadow:
                "0 16px 32px -10px rgba(10,17,36,0.25), 0 0 0 1px var(--color-app-edge)",
            }}
          >
            <button
              onClick={onRename}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] rounded transition-colors"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-ink)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--color-app-canvas-2)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              Rename list
            </button>
            <div
              className="px-3 py-1.5 mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                color: "var(--color-app-fg-muted)",
              }}
            >
              Colour
            </div>
            <div className="px-2 pb-1 grid grid-cols-4 gap-1.5">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c.label}
                  onClick={() => onColorChange(c.v)}
                  title={c.label}
                  aria-label={c.label}
                  className="h-7 rounded transition-transform hover:scale-110"
                  style={{
                    backgroundColor:
                      c.v === null ? "var(--color-app-canvas-2)" : c.hex,
                    border:
                      stripeColor === (c.v ?? "")
                        ? "2px solid var(--color-app-ink)"
                        : "1px solid var(--color-app-edge)",
                  }}
                />
              ))}
            </div>
            <div
              className="my-1.5 mx-2 border-t"
              style={{ borderColor: "var(--color-app-edge-soft)" }}
            />
            <button
              onClick={onDelete}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] rounded transition-colors"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-danger)",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor =
                  "var(--color-app-danger-soft)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "transparent")
              }
            >
              Delete list
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
