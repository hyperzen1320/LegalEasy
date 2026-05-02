"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ConnectionMode,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type NodeChange,
  type Viewport,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import ListNode, { type ListNodeData } from "./ListNode";
import ConnectionEdge, { type ConnectionEdgeData } from "./ConnectionEdge";
import CardPreview, { type PreviewTask } from "./CardPreview";
import CardDetail from "./CardDetail";

export type CanvasList = {
  id: string;
  title: string;
  sortOrder: number;
  position: { x: number; y: number };
  width: number;
  color: string | null;
};

export type CanvasEdge = {
  id: string;
  sourceListId: string;
  targetListId: string;
  sourceHandle: string;
  targetHandle: string;
  label: string;
  color: string | null;
  style: "solid" | "dashed";
};

export type BoardMember = { id: string; name: string; role: string };

const nodeTypes = { list: ListNode };
const edgeTypes = { connection: ConnectionEdge };
const proOptions = { hideAttribution: true };

export default function BoardCanvas(props: {
  boardId: string;
  board: { id: string; title: string; description: string; color: string };
  accent: string;
  accentSoft: string;
  gradient: [string, string];
  initialViewport: { x: number; y: number; zoom: number };
  initialLists: CanvasList[];
  initialEdges: CanvasEdge[];
  initialTasks: PreviewTask[];
  members: BoardMember[];
  role: string;
}) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

function Inner({
  boardId,
  board,
  accent,
  gradient,
  initialViewport,
  initialLists,
  initialEdges,
  initialTasks,
  members,
  role,
}: {
  boardId: string;
  board: { id: string; title: string; description: string; color: string };
  accent: string;
  accentSoft: string;
  gradient: [string, string];
  initialViewport: { x: number; y: number; zoom: number };
  initialLists: CanvasList[];
  initialEdges: CanvasEdge[];
  initialTasks: PreviewTask[];
  members: BoardMember[];
  role: string;
}) {
  const router = useRouter();
  const canEdit = role !== "viewer";

  /* ─── State ─── */
  const [lists, setLists] = useState<CanvasList[]>(initialLists);
  const [tasks, setTasks] = useState<PreviewTask[]>(initialTasks);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  // Group tasks by list
  const tasksByList = useMemo(() => {
    const map = new Map<string, PreviewTask[]>();
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

  /* ─── Mutation handlers (bound to the node data) ─── */

  const onTaskClick = useCallback((id: string) => setOpenTaskId(id), []);
  const onListRename = useCallback(
    async (listId: string, title: string) => {
      const res = await fetch(`/api/app/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        setLists((prev) =>
          prev.map((l) => (l.id === listId ? { ...l, title } : l))
        );
        router.refresh();
      }
    },
    [router]
  );
  const onListColorChange = useCallback(
    async (listId: string, color: string | null) => {
      const res = await fetch(`/api/app/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color }),
      });
      if (res.ok) {
        setLists((prev) =>
          prev.map((l) => (l.id === listId ? { ...l, color } : l))
        );
      }
    },
    []
  );
  const onListDelete = useCallback(
    async (listId: string) => {
      const res = await fetch(`/api/app/lists/${listId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLists((prev) => prev.filter((l) => l.id !== listId));
        setTasks((prev) => prev.filter((t) => t.listId !== listId));
        router.refresh();
      }
    },
    [router]
  );
  const onTaskAdd = useCallback(
    async (listId: string, title: string) => {
      const res = await fetch(`/api/app/boards/${boardId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listId, title }),
      });
      const data = await res.json();
      if (res.ok) {
        setTasks((prev) => [...prev, data.task]);
        router.refresh();
      }
    },
    [boardId, router]
  );

  const buildNodes = useCallback(
    (currentLists: CanvasList[]): Node[] =>
      currentLists.map<Node>((list) => {
        const data: ListNodeData = {
          list,
          tasks: tasksByList.get(list.id) || [],
          accent,
          canEdit,
          onTaskClick,
          onListRename,
          onListDelete,
          onListColorChange,
          onTaskAdd,
        };
        return {
          id: list.id,
          type: "list",
          position: list.position,
          data: data as unknown as Record<string, unknown>,
          draggable: canEdit,
          selectable: true,
          deletable: false,
        };
      }),
    [
      tasksByList,
      accent,
      canEdit,
      onTaskClick,
      onListRename,
      onListDelete,
      onListColorChange,
      onTaskAdd,
    ]
  );

  /* ─── Edge mutations ─── */

  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const onEdgeLabelChange = useCallback(
    async (edgeId: string, label: string) => {
      const res = await fetch(`/api/app/edges/${edgeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label }),
      });
      if (res.ok) {
        setEdges((prev) =>
          prev.map((e) =>
            e.id === edgeId
              ? {
                  ...e,
                  data: {
                    ...((e.data as object) ?? {}),
                    label,
                  } as unknown as Record<string, unknown>,
                }
              : e
          )
        );
        router.refresh();
      }
    },
    [router, setEdges]
  );

  const onEdgeDelete = useCallback(
    async (edgeId: string) => {
      const res = await fetch(`/api/app/edges/${edgeId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEdges((prev) => prev.filter((e) => e.id !== edgeId));
        router.refresh();
      }
    },
    [router, setEdges]
  );

  const buildEdges = useCallback(
    (currentEdges: CanvasEdge[]): Edge[] =>
      currentEdges.map<Edge>((e) => {
        const data: ConnectionEdgeData = {
          label: e.label,
          color: e.color,
          style: e.style,
          accent,
          canEdit,
          onLabelChange: onEdgeLabelChange,
          onDelete: onEdgeDelete,
        };
        return {
          id: e.id,
          source: e.sourceListId,
          target: e.targetListId,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle,
          type: "connection",
          data: data as unknown as Record<string, unknown>,
        };
      }),
    [accent, canEdit, onEdgeLabelChange, onEdgeDelete]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    buildNodes(lists)
  );

  // Initialize edges once
  useEffect(() => {
    setEdges(buildEdges(initialEdges));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sync nodes when our local state changes (lists/tasks)
  useEffect(() => {
    setNodes(buildNodes(lists));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists, tasks]);

  /* ─── Position auto-save ─── */

  const positionSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPositions = useRef<
    Map<string, { x: number; y: number; width?: number }>
  >(new Map());

  const flushPositions = useCallback(async () => {
    if (pendingPositions.current.size === 0) return;
    const positions = Array.from(pendingPositions.current.entries()).map(
      ([listId, p]) => ({ listId, ...p })
    );
    pendingPositions.current.clear();
    await fetch(`/api/app/boards/${boardId}/lists/positions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ positions }),
    });
  }, [boardId]);

  const queuePositionSave = useCallback(
    (listId: string, x: number, y: number) => {
      pendingPositions.current.set(listId, { x, y });
      if (positionSaveTimer.current) clearTimeout(positionSaveTimer.current);
      positionSaveTimer.current = setTimeout(flushPositions, 800);
    },
    [flushPositions]
  );

  /* ─── Viewport auto-save ─── */

  const viewportSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onMoveEnd = useCallback(
    (_e: unknown, viewport: Viewport) => {
      if (viewportSaveTimer.current) clearTimeout(viewportSaveTimer.current);
      viewportSaveTimer.current = setTimeout(async () => {
        await fetch(`/api/app/boards/${boardId}/viewport`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            x: viewport.x,
            y: viewport.y,
            zoom: viewport.zoom,
          }),
        });
      }, 1500);
    },
    [boardId]
  );

  /* ─── Node drag stop → save position ─── */

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      for (const ch of changes) {
        if (
          ch.type === "position" &&
          (ch as { dragging?: boolean }).dragging === false &&
          (ch as { position?: { x: number; y: number } }).position
        ) {
          const pos = (ch as { position: { x: number; y: number } }).position;
          queuePositionSave(ch.id, pos.x, pos.y);
          setLists((prev) =>
            prev.map((l) =>
              l.id === ch.id ? { ...l, position: { x: pos.x, y: pos.y } } : l
            )
          );
        }
      }
    },
    [onNodesChange, queuePositionSave]
  );

  /* ─── Edge create / connect ─── */

  const onConnect = useCallback(
    async (conn: Connection) => {
      if (!conn.source || !conn.target || conn.source === conn.target) return;
      const targetHandle = conn.targetHandle || "left";
      const sourceHandle = conn.sourceHandle || "right";

      // Optimistic add
      const tempId = `temp-${Date.now()}`;
      const optimistic = addEdge(
        {
          ...conn,
          id: tempId,
          type: "connection",
          data: {
            label: "",
            color: null,
            style: "solid",
            accent,
            canEdit,
            onLabelChange: onEdgeLabelChange,
            onDelete: onEdgeDelete,
          } as unknown as Record<string, unknown>,
        },
        edges
      ).find((e) => e.id === tempId)!;
      setEdges((prev) => [...prev, optimistic]);

      const res = await fetch(`/api/app/boards/${boardId}/edges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceListId: conn.source,
          targetListId: conn.target,
          sourceHandle,
          targetHandle,
        }),
      });
      const data = await res.json();
      if (res.ok && data.edge) {
        setEdges((prev) =>
          prev.map((e) =>
            e.id === tempId
              ? {
                  ...e,
                  id: data.edge.id,
                  data: {
                    label: data.edge.label,
                    color: data.edge.color,
                    style: data.edge.style,
                    accent,
                    canEdit,
                    onLabelChange: onEdgeLabelChange,
                    onDelete: onEdgeDelete,
                  } as unknown as Record<string, unknown>,
                }
              : e
          )
        );
        router.refresh();
      } else {
        setEdges((prev) => prev.filter((e) => e.id !== tempId));
      }
    },
    [
      edges,
      setEdges,
      boardId,
      accent,
      canEdit,
      onEdgeLabelChange,
      onEdgeDelete,
      router,
    ]
  );

  /* ─── @dnd-kit for cards across lists ─── */

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const activeCardTask =
    activeCardId != null ? tasks.find((t) => t.id === activeCardId) : null;

  const onCardDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as
      | { type?: string; taskId?: string }
      | undefined;
    if (data?.type === "task" && data.taskId) setActiveCardId(data.taskId);
  }, []);

  const onCardDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveCardId(null);
      const { active, over } = event;
      if (!over) return;
      const a = active.data.current as
        | { type?: string; taskId?: string; listId?: string }
        | undefined;
      const o = over.data.current as
        | { type?: string; taskId?: string; listId?: string }
        | undefined;
      if (!a || a.type !== "task" || !a.taskId) return;

      let targetListId: string | undefined;
      let toIndex = 0;
      if (o?.type === "list" && o.listId) {
        targetListId = o.listId;
        toIndex = (tasksByList.get(targetListId) || []).filter(
          (t) => t.id !== a.taskId
        ).length;
      } else if (o?.type === "task" && o.listId) {
        targetListId = o.listId;
        const list = (tasksByList.get(targetListId) || []).filter(
          (t) => t.id !== a.taskId
        );
        const overIdx = list.findIndex((t) => t.id === o.taskId);
        toIndex = overIdx >= 0 ? overIdx : list.length;
      }
      if (!targetListId) return;

      // Optimistic local update
      setTasks((prev) => {
        const next = prev.map((t) =>
          t.id === a.taskId ? { ...t, listId: targetListId! } : t
        );
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
        // ignore
      }
    },
    [tasksByList, router]
  );

  /* ─── Add list ─── */

  const onAddList = useCallback(async () => {
    const title = window.prompt("Name the new list");
    if (!title || !title.trim()) return;
    const res = await fetch(`/api/app/boards/${boardId}/lists`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    const data = await res.json();
    if (res.ok && data.list) {
      const maxX = lists.reduce((m, l) => Math.max(m, l.position.x), 0);
      const newPos = { x: maxX + 360, y: 80 };
      setLists((prev) => [
        ...prev,
        {
          id: data.list.id,
          title: data.list.title,
          sortOrder: data.list.sortOrder,
          position: newPos,
          width: 320,
          color: null,
        },
      ]);
      await fetch(`/api/app/boards/${boardId}/lists/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positions: [{ listId: data.list.id, x: newPos.x, y: newPos.y }],
        }),
      });
      router.refresh();
    }
  }, [boardId, lists, router]);

  /* ─── Render ─── */

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        backgroundColor: "var(--color-app-canvas)",
      }}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onCardDragStart}
        onDragEnd={onCardDragEnd}
        onDragCancel={() => setActiveCardId(null)}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={canEdit ? onConnect : undefined}
          onMoveEnd={onMoveEnd}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultViewport={initialViewport}
          minZoom={0.3}
          maxZoom={2}
          proOptions={proOptions}
          connectionMode={ConnectionMode.Loose}
          panOnScroll
          selectionOnDrag={false}
          deleteKeyCode={null}
          fitView={false}
          nodesDraggable={canEdit}
          nodesConnectable={canEdit}
          elementsSelectable
          colorMode="light"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.4}
            color="rgba(10,17,36,0.10)"
          />
          <Controls
            position="bottom-left"
            style={{
              background: "var(--color-app-paper)",
              boxShadow: "0 8px 24px -8px rgba(10,17,36,0.20)",
              borderRadius: 8,
              border: "1px solid var(--color-app-edge)",
              overflow: "hidden",
            }}
          />
          <MiniMap
            position="bottom-right"
            pannable
            zoomable
            nodeColor={(n) => {
              const data = n.data as unknown as ListNodeData;
              return data?.list?.color || accent;
            }}
            nodeStrokeColor="rgba(10,17,36,0.25)"
            nodeBorderRadius={6}
            maskColor="rgba(10,17,36,0.08)"
            style={{
              background: "var(--color-app-paper)",
              border: "1px solid var(--color-app-edge)",
              borderRadius: 8,
              overflow: "hidden",
            }}
          />
        </ReactFlow>

        <CanvasTopBar
          board={board}
          accent={accent}
          gradient={gradient}
          members={members}
          canEdit={canEdit}
          onAddList={onAddList}
        />

        {/* dropAnimation={null} — kills the snap-back glitch where the
            card flies back to its origin before reappearing in the new
            list. We want it to vanish at drop point and re-render in the
            destination list (optimistic update has already placed it). */}
        <DragOverlay dropAnimation={null}>
          {activeCardTask ? (
            <div style={{ width: 304 }}>
              <CardPreview
                task={activeCardTask}
                onClick={() => {}}
                isDraggingOverlay
                accent={accent}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {openTaskId ? (
        <CardDetail
          taskId={openTaskId}
          members={members}
          canEdit={canEdit}
          onClose={() => setOpenTaskId(null)}
          onUpdated={(t) => {
            setTasks((prev) =>
              prev.map((x) => (x.id === t.id ? { ...x, ...t } : x))
            );
          }}
          onDeleted={() => {
            setTasks((prev) => prev.filter((t) => t.id !== openTaskId));
            setOpenTaskId(null);
          }}
        />
      ) : null}
    </div>
  );
}

/* ─── Floating top bar ─── */

function CanvasTopBar({
  board,
  accent,
  gradient,
  members,
  canEdit,
  onAddList,
}: {
  board: { id: string; title: string; description: string; color: string };
  accent: string;
  gradient: [string, string];
  members: BoardMember[];
  canEdit: boolean;
  onAddList: () => void;
}) {
  return (
    <div
      style={{
        position: "absolute",
        top: 16,
        left: 16,
        right: 16,
        display: "flex",
        alignItems: "center",
        gap: 12,
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      {/* Board chip — left */}
      <div
        className="flex items-center gap-3 rounded-2xl px-4 py-2.5"
        style={{
          backgroundColor: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(10,17,36,0.06)",
          boxShadow:
            "0 16px 40px -12px rgba(10,17,36,0.18), 0 4px 8px -4px rgba(10,17,36,0.06)",
          pointerEvents: "auto",
        }}
      >
        <Link
          href="/app/workflow"
          aria-label="All boards"
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-[var(--color-app-canvas-2)]"
          style={{ color: "var(--color-app-fg-muted)" }}
        >
          <BackIcon />
        </Link>
        <div
          style={{
            width: 1,
            height: 22,
            backgroundColor: "var(--color-app-edge)",
          }}
        />
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md"
          style={{
            background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
            boxShadow: `0 6px 14px -4px ${accent}55`,
          }}
        >
          <BoardIcon />
        </div>
        <div className="min-w-0">
          <div
            className="text-[10px] uppercase tracking-[0.22em]"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-fg-muted)",
            }}
          >
            Workflow
          </div>
          <div
            className="text-[16px] font-semibold leading-none tracking-tight"
            style={{
              fontFamily: "var(--font-crimson), Georgia, serif",
              color: "var(--color-app-ink)",
              marginTop: 2,
            }}
          >
            {board.title}
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }} />

      {/* Right cluster */}
      <div
        className="flex items-center gap-2 rounded-2xl px-3 py-2"
        style={{
          backgroundColor: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(10,17,36,0.06)",
          boxShadow:
            "0 16px 40px -12px rgba(10,17,36,0.18), 0 4px 8px -4px rgba(10,17,36,0.06)",
          pointerEvents: "auto",
        }}
      >
        <div className="flex items-center -space-x-1.5 mr-1.5">
          {members.slice(0, 4).map((m) => (
            <div
              key={m.id}
              title={m.name}
              className="flex h-7 w-7 items-center justify-center rounded-full text-[9px] font-semibold"
              style={{
                fontFamily: "var(--font-crimson), Georgia, serif",
                backgroundColor: "var(--color-app-ink)",
                color: "var(--color-app-ivory)",
                border: "2px solid var(--color-app-paper)",
              }}
            >
              {initials(m.name)}
            </div>
          ))}
          {members.length > 4 ? (
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                backgroundColor: "var(--color-app-canvas-2)",
                color: "var(--color-app-fg-soft)",
                border: "2px solid var(--color-app-paper)",
              }}
            >
              +{members.length - 4}
            </div>
          ) : null}
        </div>

        {canEdit ? (
          <>
            <div
              style={{
                width: 1,
                height: 22,
                backgroundColor: "var(--color-app-edge)",
              }}
            />
            <button
              onClick={onAddList}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-transform hover:-translate-y-0.5"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
                color: "#fff",
                boxShadow: `0 8px 20px -8px ${accent}80`,
              }}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add list
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function BoardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4" width="7" height="16" rx="1.5" stroke="white" strokeWidth="1.6" />
      <rect x="14" y="4" width="7" height="9" rx="1.5" stroke="white" strokeWidth="1.6" />
      <rect x="14" y="16" width="7" height="4" rx="1.5" stroke="white" strokeWidth="1.6" />
    </svg>
  );
}
