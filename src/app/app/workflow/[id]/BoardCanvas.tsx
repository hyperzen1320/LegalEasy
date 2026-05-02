"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
  pointerWithin,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import CardDetail from "./CardDetail";

export type BoardMember = {
  id: string;
  name: string;
  role: string;
};

export type CanvasList = {
  id: string;
  title: string;
  sortOrder: number;
};

export type CanvasTask = {
  id: string;
  listId: string;
  title: string;
  description: string;
  sortOrder: number;
  assignee: BoardMember | null;
  dueDate: string | null;
  priority: "low" | "medium" | "high" | null;
  checklistSummary: {
    totalChecklists: number;
    totalItems: number;
    doneItems: number;
  };
  hasDescription: boolean;
  updatedAt: string;
};

type DragMeta =
  | { type: "list"; listId: string }
  | { type: "task"; taskId: string; listId: string };

export default function BoardCanvas({
  boardId,
  accent,
  initialLists,
  initialTasks,
  members,
  role,
}: {
  boardId: string;
  accent: string;
  initialLists: CanvasList[];
  initialTasks: CanvasTask[];
  members: BoardMember[];
  role: string;
}) {
  const router = useRouter();
  const canEdit = role !== "viewer";

  const [lists, setLists] = useState<CanvasList[]>(initialLists);
  const [tasks, setTasks] = useState<CanvasTask[]>(initialTasks);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragMeta | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Group tasks by list, in sortOrder
  const tasksByList = useMemo(() => {
    const map = new Map<string, CanvasTask[]>();
    for (const list of lists) map.set(list.id, []);
    for (const t of tasks) {
      const arr = map.get(t.listId);
      if (arr) arr.push(t);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [lists, tasks]);

  /* ─── Drag handlers ─── */

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as DragMeta | undefined;
    if (!data) return;
    setActiveDrag(data);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;
    const a = active.data.current as DragMeta | undefined;
    const o = over.data.current as DragMeta | { type: "listDrop"; listId: string } | undefined;
    if (!a || a.type !== "task") return;

    // If we hover over a list (drop zone), move task to end of that list
    if (o && (o as { type: string }).type === "listDrop") {
      const targetListId = (o as { type: "listDrop"; listId: string }).listId;
      if (a.listId !== targetListId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === a.taskId ? { ...t, listId: targetListId } : t
          )
        );
        a.listId = targetListId;
      }
    }
    // If we hover over another task in another list, move to that task's list
    if (o && (o as { type: string }).type === "task") {
      const overTask = o as { type: "task"; taskId: string; listId: string };
      if (a.listId !== overTask.listId) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === a.taskId ? { ...t, listId: overTask.listId } : t
          )
        );
        a.listId = overTask.listId;
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;
    const a = active.data.current as DragMeta | undefined;
    const o = over.data.current as
      | DragMeta
      | { type: "listDrop"; listId: string }
      | undefined;
    if (!a) return;

    /* List reordering (horizontal) */
    if (a.type === "list" && o && (o as { type: string }).type === "list") {
      const overList = o as { type: "list"; listId: string };
      if (a.listId === overList.listId) return;
      const oldIdx = lists.findIndex((l) => l.id === a.listId);
      const newIdx = lists.findIndex((l) => l.id === overList.listId);
      if (oldIdx === -1 || newIdx === -1) return;
      const next = arrayMove(lists, oldIdx, newIdx);
      setLists(next);

      try {
        await fetch(`/api/app/boards/${boardId}/reorder`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listIds: next.map((l) => l.id) }),
        });
        router.refresh();
      } catch {
        // revert if failed (rare)
      }
      return;
    }

    /* Task move / reorder (vertical, possibly cross-list) */
    if (a.type === "task") {
      let targetListId = a.listId;
      let toIndex = 0;

      if (o && (o as { type: string }).type === "task") {
        const overTask = o as { type: "task"; taskId: string; listId: string };
        targetListId = overTask.listId;
        const listTasks = (tasksByList.get(targetListId) || []).filter(
          (t) => t.id !== a.taskId
        );
        const overIdx = listTasks.findIndex((t) => t.id === overTask.taskId);
        toIndex = overIdx >= 0 ? overIdx : listTasks.length;
      } else if (o && (o as { type: string }).type === "listDrop") {
        targetListId = (o as { type: "listDrop"; listId: string }).listId;
        toIndex = (tasksByList.get(targetListId) || []).filter(
          (t) => t.id !== a.taskId
        ).length;
      }

      // Optimistic local update
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === a.taskId ? { ...t, listId: targetListId } : t
        );
        // Recompute sortOrders for the destination list
        const inDest = next
          .filter((t) => t.listId === targetListId && t.id !== a.taskId)
          .sort((x, y) => x.sortOrder - y.sortOrder);
        const moving = next.find((t) => t.id === a.taskId);
        if (moving) {
          inDest.splice(toIndex, 0, moving);
          inDest.forEach((t, i) => (t.sortOrder = i));
        }
        return [...next];
      });

      try {
        await fetch(`/api/app/tasks/${a.taskId}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toListId: targetListId, toIndex }),
        });
        router.refresh();
      } catch {
        // ignore for now
      }
    }
  };

  /* ─── Mutation handlers ─── */

  const onListAdded = useCallback((list: CanvasList) => {
    setLists((prev) => [...prev, list]);
  }, []);

  const onListUpdated = useCallback((list: CanvasList) => {
    setLists((prev) => prev.map((l) => (l.id === list.id ? list : l)));
  }, []);

  const onListDeleted = useCallback((listId: string) => {
    setLists((prev) => prev.filter((l) => l.id !== listId));
    setTasks((prev) => prev.filter((t) => t.listId !== listId));
  }, []);

  const onTaskAdded = useCallback((task: CanvasTask) => {
    setTasks((prev) => [...prev, task]);
  }, []);

  const onTaskUpdated = useCallback((task: Partial<CanvasTask> & { id: string }) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, ...task } : t))
    );
  }, []);

  const onTaskDeleted = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  const activeTask =
    activeDrag?.type === "task"
      ? tasks.find((t) => t.id === activeDrag.taskId) || null
      : null;
  const activeList =
    activeDrag?.type === "list"
      ? lists.find((l) => l.id === activeDrag.listId) || null
      : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <div className="mt-6 -mx-10 px-10 pb-6 overflow-x-auto">
        <SortableContext
          items={lists.map((l) => l.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex items-start gap-4" style={{ minHeight: 380 }}>
            {lists.map((list) => (
              <ListColumn
                key={list.id}
                list={list}
                tasks={tasksByList.get(list.id) || []}
                accent={accent}
                canEdit={canEdit}
                boardId={boardId}
                onListUpdated={onListUpdated}
                onListDeleted={onListDeleted}
                onTaskAdded={onTaskAdded}
                onTaskClick={(id) => setOpenTaskId(id)}
              />
            ))}
            {canEdit ? (
              <AddList
                boardId={boardId}
                onAdded={onListAdded}
              />
            ) : null}
          </div>
        </SortableContext>
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 220,
          easing: "cubic-bezier(0.2, 0.7, 0.1, 1)",
        }}
      >
        {activeTask ? (
          <TaskCard
            task={activeTask}
            isDraggingOverlay
            canEdit={canEdit}
            onClick={() => {}}
          />
        ) : activeList ? (
          <ListColumn
            list={activeList}
            tasks={tasksByList.get(activeList.id) || []}
            accent={accent}
            canEdit={false}
            boardId={boardId}
            onListUpdated={() => {}}
            onListDeleted={() => {}}
            onTaskAdded={() => {}}
            onTaskClick={() => {}}
            isOverlay
          />
        ) : null}
      </DragOverlay>

      {openTaskId ? (
        <CardDetail
          taskId={openTaskId}
          members={members}
          canEdit={canEdit}
          onClose={() => setOpenTaskId(null)}
          onUpdated={(t) => onTaskUpdated(t)}
          onDeleted={() => {
            onTaskDeleted(openTaskId);
            setOpenTaskId(null);
          }}
        />
      ) : null}
    </DndContext>
  );
}

/* ─── List column ─── */

function ListColumn({
  list,
  tasks,
  accent,
  canEdit,
  boardId,
  onListUpdated,
  onListDeleted,
  onTaskAdded,
  onTaskClick,
  isOverlay,
}: {
  list: CanvasList;
  tasks: CanvasTask[];
  accent: string;
  canEdit: boolean;
  boardId: string;
  onListUpdated: (list: CanvasList) => void;
  onListDeleted: (listId: string) => void;
  onTaskAdded: (task: CanvasTask) => void;
  onTaskClick: (id: string) => void;
  isOverlay?: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(list.title);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const sortable = useSortable({
    id: list.id,
    data: { type: "list", listId: list.id },
    disabled: isOverlay,
  });
  const droppable = useDroppableList(list.id);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging && !isOverlay ? 0.4 : 1,
    width: 300,
    minWidth: 300,
  };

  async function saveTitle() {
    setEditing(false);
    if (title.trim() && title !== list.title) {
      const res = await fetch(`/api/app/lists/${list.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (res.ok) {
        onListUpdated({ ...list, title: title.trim() });
        router.refresh();
      } else {
        setTitle(list.title);
      }
    } else {
      setTitle(list.title);
    }
  }

  async function deleteList() {
    setMenuOpen(false);
    if (
      !confirm(
        `Delete list "${list.title}"? All ${tasks.length} card${
          tasks.length === 1 ? "" : "s"
        } in this list will be removed too.`
      )
    )
      return;
    const res = await fetch(`/api/app/lists/${list.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      onListDeleted(list.id);
      router.refresh();
    }
  }

  async function addCard() {
    if (!newTitle.trim()) {
      setAdding(false);
      return;
    }
    const res = await fetch(`/api/app/boards/${boardId}/tasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId: list.id, title: newTitle.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      onTaskAdded(data.task);
      setNewTitle("");
      router.refresh();
    } else {
      setAdding(false);
    }
  }

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className="flex flex-col rounded-2xl"
    >
      <div
        ref={droppable.setNodeRef}
        className="flex-1 rounded-2xl"
        style={{
          backgroundColor: "var(--color-app-canvas-2)",
          border: droppable.isOver
            ? `2px dashed ${accent}`
            : "2px dashed transparent",
          transition: "border-color 150ms",
        }}
      >
        {/* Header */}
        <div
          {...sortable.attributes}
          {...sortable.listeners}
          className="flex items-center gap-2 px-4 py-3"
          style={{ cursor: canEdit ? "grab" : "default" }}
        >
          {editing ? (
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  saveTitle();
                }
                if (e.key === "Escape") {
                  setTitle(list.title);
                  setEditing(false);
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 rounded bg-transparent px-1 text-[14px] font-semibold outline-none"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-ink)",
                border: "1px solid var(--color-app-copper)",
              }}
            />
          ) : (
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                if (canEdit) setEditing(true);
              }}
              className="flex-1 text-left text-[14px] font-semibold tracking-tight"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-ink)",
              }}
            >
              {list.title}
            </button>
          )}
          <span
            className="text-[10px] font-semibold tabular-nums"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-fg-muted)",
              letterSpacing: 0.5,
            }}
          >
            {tasks.length}
          </span>
          {canEdit ? (
            <div
              className="relative"
              onPointerDown={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex h-7 w-7 items-center justify-center rounded transition-colors"
                style={{ color: "var(--color-app-fg-muted)" }}
                aria-label="List menu"
              >
                <MoreIcon />
              </button>
              {menuOpen ? (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setMenuOpen(false)}
                  />
                  <div
                    className="absolute right-0 top-9 z-40 min-w-[160px] rounded-md py-1.5"
                    style={{
                      backgroundColor: "var(--color-app-paper)",
                      boxShadow: "0 12px 32px -10px rgba(10,17,36,0.25)",
                      border: "1px solid var(--color-app-edge)",
                    }}
                  >
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setEditing(true);
                      }}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[12px] transition-colors hover:bg-[var(--color-app-canvas-2)]"
                      style={{
                        fontFamily: "var(--font-manrope), sans-serif",
                        color: "var(--color-app-ink)",
                      }}
                    >
                      Rename list
                    </button>
                    <button
                      onClick={deleteList}
                      className="flex w-full items-center gap-2 px-3.5 py-2 text-left text-[12px] transition-colors hover:bg-[var(--color-app-danger-soft)]"
                      style={{
                        fontFamily: "var(--font-manrope), sans-serif",
                        color: "var(--color-app-danger)",
                      }}
                    >
                      Delete list
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Cards */}
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2 px-2 pb-2">
            {tasks.map((t) => (
              <SortableTask
                key={t.id}
                task={t}
                canEdit={canEdit}
                onClick={() => onTaskClick(t.id)}
              />
            ))}
            {tasks.length === 0 && !adding ? (
              <div
                className="rounded-md px-3 py-6 text-center text-[11px]"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  color: "var(--color-app-fg-muted)",
                  fontStyle: "italic",
                }}
              >
                {canEdit ? "Drop cards here" : "No cards"}
              </div>
            ) : null}
          </div>
        </SortableContext>

        {/* Add card */}
        {canEdit ? (
          <div className="px-2 pb-2">
            {adding ? (
              <div
                className="rounded-md p-2"
                style={{
                  backgroundColor: "var(--color-app-paper)",
                  boxShadow: "0 1px 0 var(--color-app-edge)",
                }}
              >
                <textarea
                  autoFocus
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      addCard();
                    }
                    if (e.key === "Escape") {
                      setAdding(false);
                      setNewTitle("");
                    }
                  }}
                  placeholder="What's the title of this card?"
                  rows={2}
                  className="block w-full resize-none rounded bg-transparent px-2 py-1.5 text-[13px] outline-none"
                  style={{
                    fontFamily: "var(--font-manrope), sans-serif",
                    color: "var(--color-app-ink)",
                  }}
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={addCard}
                    className="rounded-md px-3 py-1 text-[11px] font-semibold"
                    style={{
                      fontFamily: "var(--font-manrope), sans-serif",
                      backgroundColor: "var(--color-app-copper)",
                      color: "var(--color-app-copper-text)",
                    }}
                  >
                    Add card
                  </button>
                  <button
                    onClick={() => {
                      setAdding(false);
                      setNewTitle("");
                    }}
                    className="text-[11px]"
                    style={{
                      fontFamily: "var(--font-dm-mono), monospace",
                      color: "var(--color-app-fg-muted)",
                      letterSpacing: 1,
                      textTransform: "uppercase",
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAdding(true)}
                className="flex w-full items-center gap-1.5 rounded-md px-3 py-2 text-left text-[12px] transition-colors hover:bg-[var(--color-app-paper)]"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  color: "var(--color-app-fg-muted)",
                }}
              >
                <span aria-hidden>+</span>
                Add a card
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* Custom hook to make a list droppable for tasks */
function useDroppableList(listId: string) {
  const id = `droplist:${listId}`;
  return useSortable({
    id,
    data: { type: "listDrop", listId },
  });
}

/* ─── Sortable task wrapper ─── */

function SortableTask({
  task,
  canEdit,
  onClick,
}: {
  task: CanvasTask;
  canEdit: boolean;
  onClick: () => void;
}) {
  const sortable = useSortable({
    id: task.id,
    data: { type: "task", taskId: task.id, listId: task.listId },
    disabled: !canEdit,
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
      <TaskCard task={task} canEdit={canEdit} onClick={onClick} />
    </div>
  );
}

/* ─── Task card ─── */

function TaskCard({
  task,
  canEdit,
  onClick,
  isDraggingOverlay,
}: {
  task: CanvasTask;
  canEdit: boolean;
  onClick: () => void;
  isDraggingOverlay?: boolean;
}) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = due && due < today;
  const isToday =
    due && due.toDateString() === new Date().toDateString();
  const dueLabel = due
    ? due.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      })
    : "";

  const checklistRatio =
    task.checklistSummary.totalItems > 0
      ? `${task.checklistSummary.doneItems}/${task.checklistSummary.totalItems}`
      : "";
  const allDone =
    task.checklistSummary.totalItems > 0 &&
    task.checklistSummary.doneItems === task.checklistSummary.totalItems;

  const priorityStyle =
    task.priority === "high"
      ? { bg: "rgba(193,74,55,0.18)", fg: "var(--color-app-danger)" }
      : task.priority === "medium"
        ? { bg: "rgba(197,133,58,0.18)", fg: "var(--color-app-copper-deep)" }
        : task.priority === "low"
          ? { bg: "var(--color-app-aqua-soft)", fg: "var(--color-app-aqua)" }
          : null;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="rounded-lg p-3 transition-shadow"
      style={{
        backgroundColor: "var(--color-app-paper)",
        boxShadow: isDraggingOverlay
          ? "0 16px 32px -8px rgba(10,17,36,0.30)"
          : "0 1px 0 var(--color-app-edge)",
        cursor: canEdit ? "grab" : "pointer",
        transform: isDraggingOverlay ? "rotate(2deg)" : undefined,
      }}
    >
      {priorityStyle ? (
        <span
          className="mb-1.5 inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
          style={{
            fontFamily: "var(--font-dm-mono), monospace",
            backgroundColor: priorityStyle.bg,
            color: priorityStyle.fg,
          }}
        >
          {task.priority}
        </span>
      ) : null}
      <div
        className="text-[14px] leading-[1.35]"
        style={{
          fontFamily: "var(--font-crimson), Georgia, serif",
          color: "var(--color-app-ink)",
          fontWeight: 600,
        }}
      >
        {task.title}
      </div>
      {(task.hasDescription ||
        checklistRatio ||
        due ||
        task.assignee) && (
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {task.hasDescription ? (
            <span
              title="Has description"
              style={{ color: "var(--color-app-fg-muted)" }}
            >
              <DescIcon />
            </span>
          ) : null}
          {checklistRatio ? (
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                backgroundColor: allDone
                  ? "var(--color-app-aqua-soft)"
                  : "var(--color-app-canvas-2)",
                color: allDone
                  ? "var(--color-app-aqua)"
                  : "var(--color-app-fg-soft)",
              }}
            >
              <CheckIcon />
              {checklistRatio}
            </span>
          ) : null}
          {due ? (
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                backgroundColor: isOverdue
                  ? "var(--color-app-danger-soft)"
                  : isToday
                    ? "rgba(197,133,58,0.18)"
                    : "var(--color-app-canvas-2)",
                color: isOverdue
                  ? "var(--color-app-danger)"
                  : isToday
                    ? "var(--color-app-copper-deep)"
                    : "var(--color-app-fg-soft)",
              }}
            >
              <ClockIcon />
              {dueLabel}
            </span>
          ) : null}
          {task.assignee ? (
            <span
              title={task.assignee.name}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold"
              style={{
                fontFamily: "var(--font-crimson), Georgia, serif",
                backgroundColor: "var(--color-app-ink)",
                color: "var(--color-app-ivory)",
              }}
            >
              {initials(task.assignee.name)}
            </span>
          ) : null}
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

/* ─── Add list (right edge) ─── */

function AddList({
  boardId,
  onAdded,
}: {
  boardId: string;
  onAdded: (list: CanvasList) => void;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  async function add() {
    if (!title.trim()) {
      setAdding(false);
      return;
    }
    const res = await fetch(`/api/app/boards/${boardId}/lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      onAdded(data.list);
      setTitle("");
      setAdding(false);
      router.refresh();
    }
  }

  return (
    <div style={{ width: 300, minWidth: 300 }}>
      {adding ? (
        <div
          className="rounded-2xl p-3"
          style={{
            backgroundColor: "var(--color-app-canvas-2)",
            border: "1.5px dashed var(--color-app-edge)",
          }}
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setTitle("");
              }
            }}
            placeholder="List title…"
            className="block w-full rounded bg-app-paper px-2 py-1.5 text-[13px] outline-none"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-ink)",
              backgroundColor: "var(--color-app-paper)",
              border: "1px solid var(--color-app-edge)",
            }}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={add}
              className="rounded-md px-3 py-1 text-[11px] font-semibold"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                backgroundColor: "var(--color-app-copper)",
                color: "var(--color-app-copper-text)",
              }}
            >
              Add list
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setTitle("");
              }}
              className="text-[11px]"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                color: "var(--color-app-fg-muted)",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex w-full items-center gap-2 rounded-2xl px-4 py-3 text-left text-[13px] font-semibold transition-colors"
          style={{
            fontFamily: "var(--font-manrope), sans-serif",
            backgroundColor: "rgba(255,255,255,0.5)",
            border: "1.5px dashed var(--color-app-edge)",
            color: "var(--color-app-fg-soft)",
          }}
        >
          <span aria-hidden>+</span> Add list
        </button>
      )}
    </div>
  );
}

/* ─── Icons ─── */

function MoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="6" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="18" cy="12" r="1.6" />
    </svg>
  );
}
function DescIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 6h14M5 12h14M5 18h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12l5 5L20 7"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7v5l3 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
