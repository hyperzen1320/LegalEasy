"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
  useNodesState,
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
import CardPreview, { type PreviewTask } from "./CardPreview";
import CardDetail from "./CardDetail";
import BellDrawer from "./BellDrawer";
import RequestDeleteDialog, { type RequestTarget } from "./RequestDeleteDialog";
import CanvasToolbar from "./CanvasToolbar";
import KeyboardShortcutsModal from "./KeyboardShortcutsModal";
import RecentChangeOverlay from "./RecentChangeOverlay";
import PresenceDock from "./PresenceDock";
import { useBoardLiveFeed } from "@/lib/use-board-live-feed";
import { useBoardPresence } from "@/lib/use-board-presence";
import {
  TEMP_ID_PREFIX,
  isTempId,
} from "@/lib/use-optimistic-action";

export type CanvasList = {
  id: string;
  title: string;
  description: string;
  // ISO string. Defaults to the list's creation date; editable from the
  // ⋮ menu.
  listDate: string;
  sortOrder: number;
  position: { x: number; y: number };
  width: number;
  color: string | null;
};

export type BoardMember = { id: string; name: string; role: string };

const nodeTypes = { list: ListNode };
const proOptions = { hideAttribution: true };

type BoardCanvasProps = {
  currentUserId: string | null;
  boardId: string;
  board: { id: string; title: string; description: string; color: string };
  accent: string;
  accentSoft: string;
  gradient: [string, string];
  initialViewport: { x: number; y: number; zoom: number };
  initialLists: CanvasList[];
  initialTasks: PreviewTask[];
  members: BoardMember[];
  role: string;
};

export default function BoardCanvas(props: BoardCanvasProps) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

function Inner({
  currentUserId,
  boardId,
  board,
  accent,
  gradient,
  initialViewport,
  initialLists,
  initialTasks,
  members,
  role,
}: BoardCanvasProps) {
  const router = useRouter();
  const canEdit = role !== "viewer";

  /* ─── Live feed + presence ─── */
  const liveFeed = useBoardLiveFeed({
    boardId,
    partnerId: null,
    lastSeenStorageKey: `legaleasy:lastseen:board:${boardId}`,
  });
  const presence = useBoardPresence(boardId);
  const [showMinimap, setShowMinimap] = useState(false);
  const [locked, setLocked] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  // Increments whenever the user attempts an editing action while the
  // canvas is locked — drives a brief flash + shake on the Lock pill in
  // the toolbar so the source of the block is unambiguous.
  const [lockPulseSig, setLockPulseSig] = useState(0);
  const pulseLock = useCallback(() => {
    setLockPulseSig((s) => s + 1);
  }, []);

  // Debounced resync of authoritative board state when the live feed
  // reports changes that affect lists / tasks and the actor was someone
  // other than us. We don't trust activity metadata to carry every field
  // needed to render — instead we re-pull the board from the /full
  // endpoint, capped to once every 800ms regardless of how many events
  // arrive in a burst.
  const resyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResyncAtRef = useRef<number>(0);
  const scheduleResync = useCallback(() => {
    const now = Date.now();
    const since = now - lastResyncAtRef.current;
    const delay = since > 800 ? 0 : 800 - since;
    if (resyncTimerRef.current) return;
    resyncTimerRef.current = setTimeout(async () => {
      resyncTimerRef.current = null;
      lastResyncAtRef.current = Date.now();
      try {
        const res = await fetch(`/api/app/boards/${boardId}/full`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          lists: CanvasList[];
          tasks: PreviewTask[];
        };
        // Preserve any in-flight optimistic entities (temp:* ids) so we
        // don't yank a card the user just added but the server hasn't
        // returned for yet. ALSO preserve the local list position +
        // width — those mutate via drag, save asynchronously, and a
        // resync that overwrites them while a drag-save is in flight
        // makes lists snap back. Server is canonical for content
        // (title, color, sortOrder); client is canonical for layout
        // until the next mount.
        setLists((prev) => {
          const fromServer = data.lists ?? [];
          const optimistic = prev.filter((l) => isTempId(l.id));
          const merged = fromServer.map((server) => {
            const local = prev.find((l) => l.id === server.id);
            if (!local || isTempId(local.id)) return server;
            return {
              ...server,
              position: local.position,
              width: local.width,
            };
          });
          return [...merged, ...optimistic];
        });
        setTasks((prev) => {
          const fromServer = data.tasks ?? [];
          const optimistic = prev.filter((t) => isTempId(t.id));
          return [...fromServer, ...optimistic];
        });
      } catch {
        /* ignore */
      }
    }, delay);
  }, [boardId]);

  useEffect(() => {
    return () => {
      if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current);
    };
  }, []);

  // Detect interesting cross-user events. Anything from a different actor
  // that targets a list/task means our state may be stale.
  const lastSeenIndexRef = useRef(0);
  useEffect(() => {
    const start = lastSeenIndexRef.current;
    if (start >= liveFeed.newRows.length) return;
    const fresh = liveFeed.newRows.slice(start);
    lastSeenIndexRef.current = liveFeed.newRows.length;

    let needsResync = false;
    for (const row of fresh) {
      if (row.actorUserId && row.actorUserId === currentUserId) continue;
      if (
        row.action.startsWith("task.") ||
        row.action.startsWith("list.") ||
        row.action.startsWith("board.") ||
        row.action === "delete_request.approved"
      ) {
        needsResync = true;
        break;
      }
    }
    if (needsResync) scheduleResync();
  }, [liveFeed.newRows, scheduleResync, currentUserId]);

  /* ─── State ─── */
  const [lists, setLists] = useState<CanvasList[]>(initialLists);
  const [tasks, setTasks] = useState<PreviewTask[]>(initialTasks);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [bellOpen, setBellOpen] = useState(false);

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

  // Rename and recolour are simple swap-then-confirm patterns: the local
  // state changes immediately, and if the server rejects we revert. We
  // capture the previous value in a closure so the rollback is precise.
  const onListRename = useCallback(
    async (listId: string, title: string) => {
      let previous: string | null = null;
      setLists((prev) =>
        prev.map((l) => {
          if (l.id !== listId) return l;
          previous = l.title;
          return { ...l, title };
        })
      );
      try {
        const res = await fetch(`/api/app/lists/${listId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error("rename_failed");
      } catch {
        if (previous !== null) {
          const restored = previous;
          setLists((prev) =>
            prev.map((l) => (l.id === listId ? { ...l, title: restored } : l))
          );
        }
      }
    },
    []
  );
  // Description + date edits follow the same optimistic-then-confirm
  // shape as rename. The server emits list.updated on success, so other
  // open canvases resync and the edit lands "for everyone".
  const onListDescriptionChange = useCallback(
    async (listId: string, description: string) => {
      let previous: string | null = null;
      setLists((prev) =>
        prev.map((l) => {
          if (l.id !== listId) return l;
          previous = l.description;
          return { ...l, description };
        })
      );
      try {
        const res = await fetch(`/api/app/lists/${listId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description }),
        });
        if (!res.ok) throw new Error("describe_failed");
      } catch {
        if (previous !== null) {
          const restored = previous;
          setLists((prev) =>
            prev.map((l) =>
              l.id === listId ? { ...l, description: restored } : l
            )
          );
        }
      }
    },
    []
  );
  const onListDateChange = useCallback(
    async (listId: string, listDate: string) => {
      let previous: string | null = null;
      setLists((prev) =>
        prev.map((l) => {
          if (l.id !== listId) return l;
          previous = l.listDate;
          return { ...l, listDate };
        })
      );
      try {
        const res = await fetch(`/api/app/lists/${listId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listDate }),
        });
        if (!res.ok) throw new Error("date_failed");
      } catch {
        if (previous !== null) {
          const restored = previous;
          setLists((prev) =>
            prev.map((l) =>
              l.id === listId ? { ...l, listDate: restored } : l
            )
          );
        }
      }
    },
    []
  );
  const [requestTarget, setRequestTarget] = useState<RequestTarget | null>(
    null
  );

  const onListDelete = useCallback(async (listId: string) => {
    // Snapshot so we can roll back if the server rejects (or returns
    // 403 with the request-flow code). We use object refs through the
    // setState callbacks so we read the latest pre-removal arrays even
    // if other state changes happen mid-flight.
    const snapshot: {
      lists: CanvasList[] | null;
      tasks: PreviewTask[] | null;
    } = { lists: null, tasks: null };
    setLists((prev) => {
      snapshot.lists = prev;
      return prev.filter((l) => l.id !== listId);
    });
    setTasks((prev) => {
      snapshot.tasks = prev;
      return prev.filter((t) => t.listId !== listId);
    });

    const restore = () => {
      if (snapshot.lists) setLists(snapshot.lists);
      if (snapshot.tasks) setTasks(snapshot.tasks);
    };

    try {
      const res = await fetch(`/api/app/lists/${listId}`, {
        method: "DELETE",
      });
      if (res.ok) return;
      restore();
      if (res.status === 403) {
        const data = await res.json().catch(() => null);
        if (data && data.code === "delete_request_required") {
          setRequestTarget({
            type: "list",
            id: data.targetId,
            name: data.targetName,
            hint: data.error,
          });
        }
      }
    } catch {
      restore();
    }
  }, []);

  const onTaskAdd = useCallback(
    async (listId: string, title: string) => {
      // Place an optimistic card at the bottom of the list immediately so
      // there is no perceived lag. Sort order = max(existing) + 1 for the
      // target list. We put a temp:* id on it so the renderer can show a
      // pending state and so we can swap it for the real one on success.
      const tempId = `${TEMP_ID_PREFIX}${Date.now().toString(36)}`;
      const trimmedTitle = title.trim();
      const tempTask: PreviewTask = {
        id: tempId,
        listId,
        title: trimmedTitle,
        description: "",
        sortOrder: Number.MAX_SAFE_INTEGER, // floats to bottom until swap
        assignee: null,
        dueDate: null,
        priority: null,
        checklistSummary: { totalChecklists: 0, totalItems: 0, doneItems: 0 },
        hasDescription: false,
        updatedAt: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, tempTask]);

      try {
        const res = await fetch(`/api/app/boards/${boardId}/tasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ listId, title: trimmedTitle }),
        });
        const data = await res.json();
        if (res.ok && data.task) {
          setTasks((prev) =>
            prev.map((t) => (t.id === tempId ? (data.task as PreviewTask) : t))
          );
        } else {
          setTasks((prev) => prev.filter((t) => t.id !== tempId));
        }
      } catch {
        setTasks((prev) => prev.filter((t) => t.id !== tempId));
      }
    },
    [boardId]
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
          onListDescriptionChange,
          onListDateChange,
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
      onListDescriptionChange,
      onListDateChange,
      onTaskAdd,
    ]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(
    buildNodes(lists)
  );

  // Re-sync nodes when our local state changes (lists/tasks)
  useEffect(() => {
    setNodes(buildNodes(lists));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists, tasks]);

  /* ─── Position auto-save ─── */
  //
  // Earlier this used an 800ms debounce regardless of context, which meant
  // refreshing the page within 800ms of releasing a drag silently dropped
  // the save and the list snapped back to its previous position on reload.
  // Now we flush in three places: (a) immediately on drag-end, (b) on the
  // sendBeacon path during `beforeunload` so refresh/close still saves,
  // and (c) the legacy debounce as a safety net for any non-drag callers.

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

  // Final-chance flush on tab close / refresh: fetch may not finish, but
  // sendBeacon is designed for exactly this — fire-and-forget on unload.
  useEffect(() => {
    const handler = () => {
      if (pendingPositions.current.size === 0) return;
      const positions = Array.from(pendingPositions.current.entries()).map(
        ([listId, p]) => ({ listId, ...p })
      );
      pendingPositions.current.clear();
      try {
        const blob = new Blob([JSON.stringify({ positions })], {
          type: "application/json",
        });
        navigator.sendBeacon(
          `/api/app/boards/${boardId}/lists/positions`,
          blob
        );
      } catch {
        /* unloading — nothing else we can do */
      }
    };
    window.addEventListener("beforeunload", handler);
    window.addEventListener("pagehide", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      window.removeEventListener("pagehide", handler);
    };
  }, [boardId]);

  const queuePositionSave = useCallback(
    (listId: string, x: number, y: number, opts?: { immediate?: boolean }) => {
      pendingPositions.current.set(listId, { x, y });
      if (positionSaveTimer.current) {
        clearTimeout(positionSaveTimer.current);
        positionSaveTimer.current = null;
      }
      if (opts?.immediate) {
        // Drag-end fires this — save right away rather than debouncing,
        // so a quick refresh after release still persists.
        flushPositions();
        return;
      }
      positionSaveTimer.current = setTimeout(flushPositions, 600);
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
          // Drag just ended — flush immediately, no debounce. If the user
          // refreshes a beat later the position is already on the server.
          queuePositionSave(ch.id, pos.x, pos.y, { immediate: true });
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
      } catch {
        // ignore — live feed will reconcile if our optimistic move was wrong
      }
    },
    [tasksByList]
  );

  // Move a card to another list from the card-detail panel (the "select
  // a card → pick a list" path; drag-and-drop between lists is handled
  // by onCardDragEnd above). Lands the card at the bottom of the target.
  const moveCardToList = useCallback(
    async (taskId: string, toListId: string) => {
      const current = tasks.find((t) => t.id === taskId);
      if (!current || current.listId === toListId) return;
      const toIndex = (tasksByList.get(toListId) || []).length;
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, listId: toListId, sortOrder: toIndex }
            : t
        )
      );
      try {
        await fetch(`/api/app/tasks/${taskId}/move`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ toListId, toIndex }),
        });
      } catch {
        // live feed reconciles if this optimistic move was wrong
      }
    },
    [tasks, tasksByList]
  );

  /* ─── Add list ─── */

  const onAddList = useCallback(async (titleInput: string) => {
    const trimmed = titleInput.trim();
    if (!trimmed) return;

    const tempId = `${TEMP_ID_PREFIX}${Date.now().toString(36)}`;
    const maxX = lists.reduce((m, l) => Math.max(m, l.position.x), 0);
    const newPos = { x: maxX + 360, y: 80 };
    const tempList: CanvasList = {
      id: tempId,
      title: trimmed,
      description: "",
      listDate: new Date().toISOString(),
      sortOrder: lists.length,
      position: newPos,
      width: 320,
      color: null,
    };
    setLists((prev) => [...prev, tempList]);

    try {
      const res = await fetch(`/api/app/boards/${boardId}/lists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      const data = await res.json();
      if (!res.ok || !data.list) {
        setLists((prev) => prev.filter((l) => l.id !== tempId));
        return;
      }
      // Swap temp for real, preserving the optimistic position.
      setLists((prev) =>
        prev.map((l) =>
          l.id === tempId
            ? {
                id: data.list.id,
                title: data.list.title,
                description: "",
                listDate: new Date().toISOString(),
                sortOrder: data.list.sortOrder,
                position: newPos,
                width: 320,
                color: null,
              }
            : l
        )
      );
      // Persist the position the user just assumed.
      await fetch(`/api/app/boards/${boardId}/lists/positions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positions: [{ listId: data.list.id, x: newPos.x, y: newPos.y }],
        }),
      });
    } catch {
      setLists((prev) => prev.filter((l) => l.id !== tempId));
    }
  }, [boardId, lists]);

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
          onNodesChange={handleNodesChange}
          onMoveEnd={onMoveEnd}
          nodeTypes={nodeTypes}
          defaultViewport={initialViewport}
          minZoom={0.3}
          maxZoom={2}
          proOptions={proOptions}
          panOnScroll
          selectionOnDrag={false}
          deleteKeyCode={null}
          fitView={false}
          nodesDraggable={canEdit && !locked}
          panOnDrag={!locked}
          zoomOnScroll={!locked}
          zoomOnPinch={!locked}
          zoomOnDoubleClick={!locked}
          elementsSelectable
          colorMode="light"
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.4}
            color="rgba(10,17,36,0.10)"
          />
          {showMinimap ? (
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
          ) : null}
          {/* Locked shield. Sits ABOVE all canvas content (nodes,
              MiniMap) but BELOW the toolbar — covers every click
              target that would otherwise mutate the board (Add card,
              ⋮ menus, card opens, etc.).
              Each click increments `lockPulseSig` which flashes the
              Lock pill so the user knows where the block came from.
              The toolbar's higher z-index keeps Lock / Zoom / Fit /
              Help all reachable. */}
          {locked ? (
            <div
              role="presentation"
              aria-hidden
              onMouseDownCapture={(e) => {
                e.stopPropagation();
                pulseLock();
              }}
              onClickCapture={(e) => {
                e.stopPropagation();
                pulseLock();
              }}
              onWheelCapture={(e) => e.stopPropagation()}
              style={{
                position: "absolute",
                inset: 0,
                zIndex: 25,
                cursor: "not-allowed",
                background: "transparent",
              }}
              title="Canvas is locked — click the Lock pill to unlock"
            />
          ) : null}
          <CanvasToolbar
            showMinimap={showMinimap}
            onToggleMinimap={() => setShowMinimap((v) => !v)}
            locked={locked}
            onToggleLock={() => setLocked((v) => !v)}
            onOpenHelp={() => setHelpOpen(true)}
            lockPulseSig={lockPulseSig}
          />
        </ReactFlow>

        <CanvasTopBar
          board={board}
          accent={accent}
          gradient={gradient}
          members={members}
          canEdit={canEdit}
          onAddList={onAddList}
          locked={locked}
          onLockedAttempt={pulseLock}
          totalLists={lists.length}
          totalCards={tasks.length}
          boardId={boardId}
          onBellOpen={() => setBellOpen(true)}
          presence={presence}
          unreadCount={liveFeed.unreadCount}
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
          lists={lists.map((l) => ({ id: l.id, title: l.title }))}
          canEdit={canEdit}
          onClose={() => setOpenTaskId(null)}
          onUpdated={(t) => {
            setTasks((prev) =>
              prev.map((x) => (x.id === t.id ? { ...x, ...t } : x))
            );
          }}
          onMove={moveCardToList}
          onDeleted={() => {
            setTasks((prev) => prev.filter((t) => t.id !== openTaskId));
            setOpenTaskId(null);
          }}
          onRequestDelete={(target) => setRequestTarget(target)}
        />
      ) : null}

      {bellOpen ? (
        <BellDrawer
          boardId={boardId}
          isAdmin={role === "admin"}
          totalLists={lists.length}
          totalCards={tasks.length}
          perListBreakdown={lists
            .slice()
            .sort((a, b) => a.position.x - b.position.x)
            .map((l) => ({
              id: l.id,
              title: l.title,
              count: tasksByList.get(l.id)?.length ?? 0,
            }))}
          onClose={() => setBellOpen(false)}
          liveRows={liveFeed.newRows}
          onMarkSeen={liveFeed.markSeen}
        />
      ) : null}

      {requestTarget ? (
        <RequestDeleteDialog
          target={requestTarget}
          onClose={() => setRequestTarget(null)}
          onSubmitted={() => {
            setRequestTarget(null);
            // Auto-open the bell drawer on the requests tab so the user
            // can see their pending request immediately. The live feed
            // will refresh the requests count automatically.
            setBellOpen(true);
          }}
        />
      ) : null}

      <RecentChangeOverlay
        newRows={liveFeed.newRows}
        selfUserId={currentUserId}
      />

      {helpOpen ? (
        <KeyboardShortcutsModal onClose={() => setHelpOpen(false)} />
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
  locked,
  onLockedAttempt,
  totalLists,
  totalCards,
  boardId,
  onBellOpen,
  presence,
  unreadCount,
}: {
  board: { id: string; title: string; description: string; color: string };
  accent: string;
  gradient: [string, string];
  members: BoardMember[];
  canEdit: boolean;
  onAddList: (title: string) => void;
  // When the canvas is locked we still render the Add list composer
  // (so the user can SEE where it lives) but every click on it routes
  // to onLockedAttempt so the Lock pill flashes instead of opening the
  // composer. Bell + back link stay fully interactive since they don't
  // mutate the board.
  locked: boolean;
  onLockedAttempt: () => void;
  totalLists: number;
  totalCards: number;
  boardId: string;
  onBellOpen: () => void;
  presence: import("@/lib/use-board-presence").ActiveUser[];
  unreadCount: number;
}) {
  // Pending delete-request count is still its own short poll because it
  // counts a state (pending vs resolved) rather than an event stream.
  // Cheaper to ask once per 10s than to derive from the live feed.
  const [pendingDeleteCount, setPendingDeleteCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const fetchCount = async () => {
      try {
        const res = await fetch(
          `/api/app/delete-requests/count?boardId=${boardId}`,
          { cache: "no-store" }
        );
        if (!res.ok || !alive) return;
        const data = await res.json();
        if (alive) setPendingDeleteCount(data.count || 0);
      } catch {
        /* ignore */
      }
    };
    fetchCount();
    const t = setInterval(fetchCount, 10000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [boardId]);

  // Total bell badge = unread activity since last opened + any pending
  // delete requests. Capped at 99+ so it never overflows the dot.
  const bellCount = unreadCount + pendingDeleteCount;
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
        {/* Live presence: who is on this board right now (replaces the
            static member avatar stack — the live signal is far more
            useful for canvas collaboration). */}
        <PresenceDock active={presence} />

        <div
          style={{
            width: 1,
            height: 22,
            backgroundColor: "var(--color-app-edge)",
          }}
        />

        {/* Stats chip — total lists · total cards */}
        <div
          className="hidden md:flex items-center gap-2 px-2 py-1 rounded-md"
          title="Lists · Cards"
          style={{
            backgroundColor: "var(--color-app-canvas-2)",
          }}
        >
          <span
            className="text-[11px] font-semibold tabular-nums"
            style={{
              fontFamily: "var(--font-dm-mono), monospace",
              color: "var(--color-app-fg-soft)",
              letterSpacing: 0.4,
            }}
          >
            <span style={{ color: "var(--color-app-ink)" }}>{totalLists}</span> lists ·{" "}
            <span style={{ color: "var(--color-app-ink)" }}>{totalCards}</span> cards
          </span>
        </div>

        {/* Bell — opens drawer */}
        <button
          onClick={onBellOpen}
          aria-label="Open board pulse"
          className="relative flex h-8 w-8 items-center justify-center rounded-md transition-colors"
          style={{
            backgroundColor: "var(--color-app-canvas-2)",
            color: "var(--color-app-copper-deep)",
          }}
        >
          <BellIconStroke />
          {bellCount > 0 ? (
            <span
              className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-semibold tabular-nums"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                backgroundColor: "var(--color-app-danger)",
                color: "white",
                border: "2px solid var(--color-app-paper)",
                boxShadow: "0 2px 4px rgba(193,74,55,0.40)",
              }}
            >
              {bellCount}
            </span>
          ) : null}
        </button>

        {canEdit ? (
          <AddListComposer
            accent={accent}
            gradient={gradient}
            onSubmit={onAddList}
            locked={locked}
            onLockedAttempt={onLockedAttempt}
          />
        ) : null}
      </div>
    </div>
  );
}

/**
 * Inline composer for "+ Add list". Earlier this was a window.prompt
 * call which is jarring on a canvas — now it inflates into a small
 * input + Add/Cancel pill right inside the top bar. Enter submits, Esc
 * cancels. Matches the visual weight of the original button.
 */
function AddListComposer({
  accent,
  gradient,
  onSubmit,
  locked,
  onLockedAttempt,
}: {
  accent: string;
  gradient: [string, string];
  onSubmit: (title: string) => void;
  locked: boolean;
  onLockedAttempt: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // If the canvas locks while the composer is open, close it. Keeps the
  // surface honest — no half-typed edits on a locked board.
  useEffect(() => {
    if (locked && open) {
      setOpen(false);
      setTitle("");
    }
  }, [locked, open]);

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  function commit() {
    const t = title.trim();
    if (!t) {
      setOpen(false);
      setTitle("");
      return;
    }
    onSubmit(t);
    setTitle("");
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          if (locked) {
            onLockedAttempt();
            return;
          }
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-semibold transition-transform hover:-translate-y-0.5"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
          color: "#fff",
          boxShadow: `0 8px 20px -8px ${accent}80`,
          opacity: locked ? 0.5 : 1,
          cursor: locked ? "not-allowed" : "pointer",
        }}
        title={locked ? "Canvas is locked" : "Add a new list"}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> Add list
      </button>
    );
  }

  return (
    <div
      className="flex items-center gap-1 rounded-md px-1.5 py-1"
      style={{
        background: `linear-gradient(135deg, ${gradient[0]}, ${gradient[1]})`,
        boxShadow: `0 8px 20px -8px ${accent}80`,
      }}
    >
      <input
        ref={inputRef}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            setOpen(false);
            setTitle("");
          }
        }}
        placeholder="Name this list…"
        className="rounded-sm bg-white/95 px-2 py-1 text-[12px] outline-none"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-ink)",
          width: 180,
        }}
      />
      <button
        onClick={commit}
        className="rounded-sm bg-white/95 px-2.5 py-1 text-[11px] font-semibold"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          color: "var(--color-app-ink)",
        }}
      >
        Add
      </button>
      <button
        onClick={() => {
          setOpen(false);
          setTitle("");
        }}
        aria-label="Cancel"
        className="rounded-sm px-2 py-1 text-[14px] leading-none text-white/85"
        style={{ fontFamily: "var(--font-dm-mono), monospace" }}
      >
        ×
      </button>
    </div>
  );
}

function BellIconStroke() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 8a6 6 0 0 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 21a2 2 0 0 0 4 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
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
