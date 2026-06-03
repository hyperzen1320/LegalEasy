"use client";

import { useState, useRef, useEffect } from "react";
import { type NodeProps } from "@xyflow/react";
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
    description: string;
    listDate: string;
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
  onListDescriptionChange: (listId: string, description: string) => void;
  onListDateChange: (listId: string, listDate: string) => void;
  onTaskAdd: (listId: string, title: string) => void;
};

export default function ListNode(props: NodeProps & { data: ListNodeData }) {
  const { data, selected } = props;
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
            description={list.description}
            listDate={list.listDate}
            open={menu}
            onOpen={() => setMenu(true)}
            onClose={() => setMenu(false)}
            onRename={() => {
              setMenu(false);
              setEditing(true);
            }}
            onDescriptionChange={(d) => data.onListDescriptionChange(list.id, d)}
            onDateChange={(d) => data.onListDateChange(list.id, d)}
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

function ListMenu({
  description,
  listDate,
  open,
  onOpen,
  onClose,
  onRename,
  onDescriptionChange,
  onDateChange,
  onDelete,
}: {
  description: string;
  listDate: string;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onRename: () => void;
  onDescriptionChange: (description: string) => void;
  onDateChange: (listDate: string) => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Local draft for the description — commit on blur rather than PATCHing
  // every keystroke. Re-sync if the prop changes underneath us (a
  // collaborator edited it and the live feed resynced the board).
  const [descDraft, setDescDraft] = useState(description);
  useEffect(() => setDescDraft(description), [description]);

  // <input type="date"> wants a yyyy-mm-dd value; listDate is a full ISO.
  const dateValue = listDate ? listDate.slice(0, 10) : "";

  function commitDescription() {
    if (descDraft.trim() !== (description || "").trim()) {
      onDescriptionChange(descDraft.trim());
    }
  }

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
            className="absolute right-0 top-9 z-40 w-[252px] rounded-lg p-2"
            style={{
              backgroundColor: "var(--color-app-paper)",
              boxShadow:
                "0 16px 32px -10px rgba(10,17,36,0.25), 0 0 0 1px var(--color-app-edge)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {/* Name */}
            <button
              onClick={onRename}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-[13px] rounded transition-colors"
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
              <span>Edit name</span>
              <PencilGlyph />
            </button>

            {/* Date — defaults to the list's creation date, editable here. */}
            <div className="px-3 pt-2">
              <label
                className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  color: "var(--color-app-fg-muted)",
                }}
              >
                Date
              </label>
              <input
                type="date"
                value={dateValue}
                onChange={(e) => onDateChange(e.target.value)}
                className="mt-1.5 block w-full rounded-md border px-2.5 py-1.5 text-[12.5px] outline-none"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  borderColor: "var(--color-app-edge)",
                  backgroundColor: "var(--color-app-paper)",
                  color: "var(--color-app-ink)",
                }}
              />
            </div>

            {/* Description — collaboratively editable; commits on blur. */}
            <div className="px-3 pt-2.5">
              <label
                className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  color: "var(--color-app-fg-muted)",
                }}
              >
                Description
              </label>
              <textarea
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={commitDescription}
                placeholder="What goes in this list?"
                rows={3}
                className="mt-1.5 block w-full resize-none rounded-md border px-2.5 py-1.5 text-[12.5px] leading-[1.5] outline-none"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  borderColor: "var(--color-app-edge)",
                  backgroundColor: "var(--color-app-paper)",
                  color: "var(--color-app-ink)",
                }}
              />
            </div>

            <div
              className="my-1.5 mx-1 border-t"
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

function PencilGlyph() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      style={{ color: "var(--color-app-fg-muted)" }}
    >
      <path
        d="M4 20h4l10-10-4-4L4 16v4z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M14 6l4 4"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}
