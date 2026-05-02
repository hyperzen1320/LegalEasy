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

// Connection handles. The visible dot is rendered inside a much larger
// element so the actual hit area is generous; we draw the dot with a
// `background` that fills only a small inner circle while the
// transparent outer area still receives pointer events. Pair this with
// the canvas-level connectionRadius=50 to get forgiving "near a handle"
// snap detection.
const HANDLE_HIT = 32; // total clickable size
const HANDLE_DOT = 16; // visible dot size
const HANDLE_BASE: React.CSSProperties = {
  width: HANDLE_HIT,
  height: HANDLE_HIT,
  borderRadius: 999,
  border: "none",
  background: "transparent",
  // Cursor flips to crosshair so the affordance is obvious.
  cursor: "crosshair",
  transition: "transform 150ms, box-shadow 150ms",
};

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
  // Always show handles for editors (so they can connect), hide for viewers.
  const showHandles = canEdit;
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
        overflow: "hidden",
        transition: "box-shadow 200ms, transform 200ms",
      }}
    >
      {/* Top stripe */}
      <div
        style={{
          height: 4,
          background: `linear-gradient(90deg, ${stripeColor}, ${stripeColor}cc)`,
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

      {/* Connection handles — generous 32×32 hit areas with a 16×16
          visible dot rendered via radial-gradient. Canvas runs in
          ConnectionMode.Loose so each handle is BOTH source and target.
          Always rendered (so dragged connections can land on them) but
          only visible on hover/selection. */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        isConnectable={canEdit}
        style={{
          ...HANDLE_BASE,
          background: `radial-gradient(circle, ${stripeColor} 0 ${HANDLE_DOT / 2}px, ${stripeColor}33 ${HANDLE_DOT / 2}px ${HANDLE_DOT / 2 + 4}px, transparent ${HANDLE_DOT / 2 + 4}px)`,
          top: -HANDLE_HIT / 2,
          opacity: showHandles ? 1 : 0,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={canEdit}
        style={{
          ...HANDLE_BASE,
          background: `radial-gradient(circle, ${stripeColor} 0 ${HANDLE_DOT / 2}px, ${stripeColor}33 ${HANDLE_DOT / 2}px ${HANDLE_DOT / 2 + 4}px, transparent ${HANDLE_DOT / 2 + 4}px)`,
          right: -HANDLE_HIT / 2,
          opacity: showHandles ? 1 : 0,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={canEdit}
        style={{
          ...HANDLE_BASE,
          background: `radial-gradient(circle, ${stripeColor} 0 ${HANDLE_DOT / 2}px, ${stripeColor}33 ${HANDLE_DOT / 2}px ${HANDLE_DOT / 2 + 4}px, transparent ${HANDLE_DOT / 2 + 4}px)`,
          bottom: -HANDLE_HIT / 2,
          opacity: showHandles ? 1 : 0,
        }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        isConnectable={canEdit}
        style={{
          ...HANDLE_BASE,
          background: `radial-gradient(circle, ${stripeColor} 0 ${HANDLE_DOT / 2}px, ${stripeColor}33 ${HANDLE_DOT / 2}px ${HANDLE_DOT / 2 + 4}px, transparent ${HANDLE_DOT / 2 + 4}px)`,
          left: -HANDLE_HIT / 2,
          opacity: showHandles ? 1 : 0,
        }}
      />
    </div>
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
