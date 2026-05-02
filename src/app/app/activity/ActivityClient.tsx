"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type ActivityRow = {
  id: string;
  actorUserId: string | null;
  actorName: string;
  action: string;
  targetType: string;
  targetId: string | null;
  targetName: string;
  message: string;
  metadata: Record<string, unknown>;
  boardId: string | null;
  createdAt: string;
};

export type ActivityActor = { id: string; name: string };
export type ActivityBoardOption = {
  id: string;
  title: string;
  color: string;
};

const ACTION_FAMILIES: { key: string; label: string; prefix: string }[] = [
  { key: "all", label: "Everything", prefix: "" },
  { key: "task", label: "Cards", prefix: "task." },
  { key: "list", label: "Lists", prefix: "list." },
  { key: "board", label: "Boards", prefix: "board." },
  { key: "checklist", label: "Checklists", prefix: "checklist" }, // catches both checklist. and checklist_item.
];

export default function ActivityClient({
  initialActivity,
  initialNextCursor,
  actors,
  boards,
  isAdmin,
  retentionDays,
}: {
  initialActivity: ActivityRow[];
  initialNextCursor: string | null;
  actors: ActivityActor[];
  boards: ActivityBoardOption[];
  isAdmin: boolean;
  retentionDays: number | null;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<ActivityRow[]>(initialActivity);
  const [cursor, setCursor] = useState<string | null>(initialNextCursor);
  const [loading, setLoading] = useState(false);

  const [actorId, setActorId] = useState("");
  const [boardId, setBoardId] = useState("");
  const [actionFamily, setActionFamily] = useState("all");

  const grouped = useMemo(() => groupByDay(rows), [rows]);

  const fetchPage = useCallback(
    async (params: {
      actor?: string;
      board?: string;
      family?: string;
      before?: string | null;
      reset?: boolean;
    }) => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (params.actor) qs.set("actor", params.actor);
        if (params.board) qs.set("board", params.board);
        if (params.family && params.family !== "all") {
          qs.set("actionPrefix", familyToPrefix(params.family));
        }
        if (params.before) qs.set("before", params.before);
        qs.set("limit", "50");
        const res = await fetch(`/api/app/activity?${qs.toString()}`);
        const data = await res.json();
        if (res.ok) {
          if (params.reset) {
            setRows(data.activity);
          } else {
            setRows((prev) => [...prev, ...data.activity]);
          }
          setCursor(data.nextCursor);
        }
      } finally {
        setLoading(false);
      }
    },
    []
  );

  function applyFilters() {
    fetchPage({
      actor: actorId,
      board: boardId,
      family: actionFamily,
      reset: true,
    });
  }

  function clearFilters() {
    setActorId("");
    setBoardId("");
    setActionFamily("all");
    fetchPage({ reset: true });
  }

  function loadMore() {
    if (!cursor) return;
    fetchPage({
      actor: actorId,
      board: boardId,
      family: actionFamily,
      before: cursor,
    });
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2
            className="text-[40px] font-semibold tracking-tight leading-[1.1]"
            style={{
              fontFamily: "var(--font-crimson), Georgia, serif",
              color: "var(--color-app-ink)",
            }}
          >
            Activity
          </h2>
          <p
            className="mt-2 text-[13px]"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-fg-muted)",
            }}
          >
            Office audit log — every change in Work Flow, who did what and
            when.
          </p>
        </div>
        {isAdmin ? <RetentionPill current={retentionDays} /> : null}
      </div>

      {/* Filters */}
      <div className="mt-7">
        <div className="flex flex-wrap items-center gap-2">
          {ACTION_FAMILIES.map((f) => {
            const active = actionFamily === f.key;
            return (
              <button
                key={f.key}
                onClick={() => {
                  setActionFamily(f.key);
                  fetchPage({
                    actor: actorId,
                    board: boardId,
                    family: f.key,
                    reset: true,
                  });
                }}
                className="rounded-md px-3 py-1.5 text-[12px] font-medium transition-all"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  backgroundColor: active
                    ? "var(--color-app-ink)"
                    : "var(--color-app-paper)",
                  color: active
                    ? "var(--color-app-ivory)"
                    : "var(--color-app-fg-soft)",
                  boxShadow: active
                    ? "0 6px 16px -10px rgba(10,17,36,0.45)"
                    : "0 1px 0 var(--color-app-edge)",
                }}
              >
                {f.label}
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2">
            <select
              value={actorId}
              onChange={(e) => {
                setActorId(e.target.value);
                fetchPage({
                  actor: e.target.value,
                  board: boardId,
                  family: actionFamily,
                  reset: true,
                });
              }}
              className="rounded-md border px-3 py-1.5 text-[12px] outline-none"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                borderColor: "var(--color-app-edge)",
                backgroundColor: "var(--color-app-paper)",
                color: "var(--color-app-ink)",
              }}
            >
              <option value="">Anyone</option>
              {actors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              value={boardId}
              onChange={(e) => {
                setBoardId(e.target.value);
                fetchPage({
                  actor: actorId,
                  board: e.target.value,
                  family: actionFamily,
                  reset: true,
                });
              }}
              className="rounded-md border px-3 py-1.5 text-[12px] outline-none"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                borderColor: "var(--color-app-edge)",
                backgroundColor: "var(--color-app-paper)",
                color: "var(--color-app-ink)",
              }}
            >
              <option value="">All boards</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
            {(actorId || boardId || actionFamily !== "all") && (
              <button
                onClick={clearFilters}
                className="text-[11px] uppercase"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  color: "var(--color-app-fg-muted)",
                  letterSpacing: 1.2,
                }}
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Feed */}
      {rows.length === 0 ? (
        <div
          className="mt-7 rounded-xl px-5 py-16 text-center"
          style={{
            backgroundColor: "var(--color-app-paper)",
            border: "1px dashed var(--color-app-edge)",
          }}
        >
          <p
            className="text-[14px]"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-fg-muted)",
            }}
          >
            No activity yet — once anyone in your office moves a card or
            checks off an item, it&rsquo;ll show here.
          </p>
        </div>
      ) : (
        <div className="mt-7 space-y-7">
          {grouped.map((g, gi) => (
            <div key={g.label}>
              <h3
                className="sticky top-[68px] z-10 mb-3 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  color: "var(--color-app-copper-deep)",
                }}
              >
                {g.label}
              </h3>
              <ul
                className="rounded-xl divide-y"
                style={{
                  backgroundColor: "var(--color-app-paper)",
                  boxShadow: "0 1px 0 var(--color-app-edge)",
                }}
              >
                {g.rows.map((a, i) => (
                  <li
                    key={a.id}
                    className="fade-up-sm px-5 py-3.5 flex items-start gap-3"
                    style={{
                      animationDelay: `${Math.min(i, 12) * 25 + gi * 30}ms`,
                      borderColor: "var(--color-app-edge-soft)",
                    }}
                  >
                    <span
                      className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold"
                      style={{
                        fontFamily:
                          "var(--font-crimson), Georgia, serif",
                        backgroundColor: "var(--color-app-ink)",
                        color: "var(--color-app-ivory)",
                      }}
                      title={a.actorName}
                    >
                      {initials(a.actorName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div
                        className="text-[13px] leading-[1.5]"
                        style={{
                          fontFamily: "var(--font-manrope), sans-serif",
                          color: "var(--color-app-ink)",
                        }}
                        dangerouslySetInnerHTML={{
                          __html: renderMessage(a.actorName, a.message),
                        }}
                      />
                      <div className="mt-1 flex items-center gap-2 text-[11px]">
                        <span
                          style={{
                            fontFamily:
                              "var(--font-dm-mono), monospace",
                            color: "var(--color-app-fg-muted)",
                            letterSpacing: 0.3,
                          }}
                        >
                          {fmtTime(a.createdAt)}
                        </span>
                        {a.boardId ? (
                          <Link
                            href={`/app/workflow/${a.boardId}`}
                            className="rounded px-2 py-0.5 transition-colors"
                            style={{
                              fontFamily:
                                "var(--font-dm-mono), monospace",
                              color: "var(--color-app-copper-deep)",
                              backgroundColor:
                                "rgba(197,133,58,0.10)",
                              letterSpacing: 0.3,
                            }}
                          >
                            Open board
                          </Link>
                        ) : null}
                      </div>
                    </div>
                    <ActionChip action={a.action} />
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {cursor ? (
            <div className="flex justify-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="rounded-md border px-5 py-2 text-[12px] font-semibold transition-colors"
                style={{
                  fontFamily: "var(--font-manrope), sans-serif",
                  borderColor: "var(--color-app-edge)",
                  backgroundColor: "var(--color-app-paper)",
                  color: "var(--color-app-fg-soft)",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                {loading ? "Loading…" : "Load older"}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </>
  );
}

/* ─── Retention pill (admin) ─── */

function RetentionPill({ current }: { current: number | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const label =
    current === null ? "Keep forever" : current === 90 ? "Auto-delete after 90 days" : current === 365 ? "Auto-delete after 1 year" : `Auto-delete after ${current} days`;

  const options: { v: number | null; label: string; sub: string }[] = [
    { v: null, label: "Keep forever", sub: "No auto-delete." },
    { v: 90, label: "Auto-delete after 90 days", sub: "Quarterly cleanup." },
    { v: 365, label: "Auto-delete after 1 year", sub: "Yearly cleanup." },
  ];

  async function update(v: number | null) {
    setBusy(true);
    try {
      const res = await fetch("/api/app/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityRetentionDays: v }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-[12px] font-semibold"
        style={{
          fontFamily: "var(--font-manrope), sans-serif",
          borderColor: "var(--color-app-edge)",
          backgroundColor: "var(--color-app-paper)",
          color: "var(--color-app-ink)",
        }}
      >
        <RetentionIcon />
        {label}
        <ChevronIcon />
      </button>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-12 z-40 min-w-[280px] rounded-xl p-1.5"
            style={{
              backgroundColor: "var(--color-app-paper)",
              boxShadow: "0 16px 32px -10px rgba(10,17,36,0.25)",
              border: "1px solid var(--color-app-edge)",
            }}
          >
            {options.map((o) => {
              const active = current === o.v;
              return (
                <button
                  key={o.label}
                  onClick={() => !busy && update(o.v)}
                  className="flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
                  style={{
                    backgroundColor: active
                      ? "var(--color-app-canvas-2)"
                      : "transparent",
                    opacity: busy ? 0.6 : 1,
                  }}
                >
                  <span
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: active
                        ? "var(--color-app-copper)"
                        : "var(--color-app-paper)",
                      border: active
                        ? "1px solid var(--color-app-copper)"
                        : "1.5px solid var(--color-app-edge)",
                    }}
                  >
                    {active ? (
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          backgroundColor: "var(--color-app-copper-text)",
                        }}
                      />
                    ) : null}
                  </span>
                  <div className="min-w-0">
                    <div
                      className="text-[13px] font-semibold"
                      style={{
                        fontFamily: "var(--font-manrope), sans-serif",
                        color: "var(--color-app-ink)",
                      }}
                    >
                      {o.label}
                    </div>
                    <div
                      className="mt-0.5 text-[11px]"
                      style={{
                        fontFamily: "var(--font-manrope), sans-serif",
                        color: "var(--color-app-fg-muted)",
                      }}
                    >
                      {o.sub}
                    </div>
                  </div>
                </button>
              );
            })}
            <div
              className="mx-3 mt-1 mb-2 border-t pt-2 text-[11px]"
              style={{
                borderColor: "var(--color-app-edge-soft)",
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-fg-muted)",
              }}
            >
              Pruning runs lazily on every Activity page load. Existing
              entries older than the chosen window will be removed on the
              next visit.
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

/* ─── Action chip ─── */

function ActionChip({ action }: { action: string }) {
  const verb =
    action.startsWith("task.") || action.startsWith("checklist")
      ? "Card"
      : action.startsWith("list.")
        ? "List"
        : action.startsWith("board.")
          ? "Board"
          : "System";
  const colors: Record<string, { bg: string; fg: string }> = {
    Card: {
      bg: "var(--color-app-aqua-soft)",
      fg: "var(--color-app-aqua)",
    },
    List: {
      bg: "rgba(197,133,58,0.18)",
      fg: "var(--color-app-copper-deep)",
    },
    Board: {
      bg: "rgba(10,17,36,0.10)",
      fg: "var(--color-app-ink)",
    },
    System: {
      bg: "var(--color-app-canvas-2)",
      fg: "var(--color-app-fg-muted)",
    },
  };
  const c = colors[verb];
  return (
    <span
      className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em]"
      style={{
        fontFamily: "var(--font-dm-mono), monospace",
        backgroundColor: c.bg,
        color: c.fg,
      }}
    >
      {verb}
    </span>
  );
}

/* ─── Helpers ─── */

function familyToPrefix(family: string): string {
  if (family === "task") return "task.";
  if (family === "list") return "list.";
  if (family === "board") return "board.";
  if (family === "checklist") return "checklist";
  return "";
}

function groupByDay(
  rows: ActivityRow[]
): { label: string; rows: ActivityRow[] }[] {
  const groups: Record<string, { label: string; rows: ActivityRow[] }> = {};
  const order: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  for (const r of rows) {
    const d = new Date(r.createdAt);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    let label: string;
    if (d.getTime() === today.getTime()) label = "Today";
    else if (d.getTime() === yesterday.getTime()) label = "Yesterday";
    else
      label = d.toLocaleDateString("en-IN", {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year:
          d.getFullYear() !== new Date().getFullYear()
            ? "numeric"
            : undefined,
      });
    if (!groups[key]) {
      groups[key] = { label, rows: [] };
      order.push(key);
    }
    groups[key].rows.push(r);
  }
  return order.map((k) => groups[k]);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function renderMessage(actor: string, message: string): string {
  const escape = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  const safe = escape(message).replace(
    /\*\*([^*]+)\*\*/g,
    (_, inner) =>
      `<strong style="color:var(--color-app-ink);font-weight:600">${inner}</strong>`
  );
  return `<span style="color:var(--color-app-ink);font-weight:600">${escape(actor)}</span> ${safe}`;
}

function RetentionIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
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
function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
