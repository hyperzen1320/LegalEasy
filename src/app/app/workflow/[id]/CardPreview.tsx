"use client";

import type { CSSProperties } from "react";

export type PreviewTask = {
  id: string;
  listId: string;
  title: string;
  description: string;
  sortOrder: number;
  assignee: { id: string; name: string; role: string } | null;
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

export default function CardPreview({
  task,
  onClick,
  isDraggingOverlay,
  accent,
}: {
  task: PreviewTask;
  onClick: () => void;
  isDraggingOverlay?: boolean;
  accent: string;
}) {
  const due = task.dueDate ? new Date(task.dueDate) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = due && due < today;
  const isToday = due && due.toDateString() === new Date().toDateString();

  const dueLabel = due
    ? due.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
      })
    : "";

  const checklistTotal = task.checklistSummary.totalItems;
  const checklistDone = task.checklistSummary.doneItems;
  const checklistPct =
    checklistTotal > 0 ? Math.round((checklistDone / checklistTotal) * 100) : 0;
  const allDone = checklistTotal > 0 && checklistDone === checklistTotal;

  const priority = task.priority;
  const priorityStyle =
    priority === "high"
      ? {
          bg: "rgba(193,74,55,0.14)",
          fg: "var(--color-app-danger)",
          dot: "#c14a37",
          label: "High",
        }
      : priority === "medium"
        ? {
            bg: "rgba(197,133,58,0.16)",
            fg: "var(--color-app-copper-deep)",
            dot: "#c5853a",
            label: "Medium",
          }
        : priority === "low"
          ? {
              bg: "var(--color-app-aqua-soft)",
              fg: "var(--color-app-aqua)",
              dot: "#56a0a8",
              label: "Low",
            }
          : null;

  const descPreview = (task.description || "")
    .replace(/\n+/g, " ")
    .trim()
    .slice(0, 140);

  const cardStyle: CSSProperties = {
    backgroundColor: "var(--color-app-paper)",
    boxShadow: isDraggingOverlay
      ? "0 24px 48px -12px rgba(10,17,36,0.30), 0 8px 16px -8px rgba(10,17,36,0.18)"
      : "0 1px 0 var(--color-app-edge), 0 2px 4px -2px rgba(10,17,36,0.04)",
    transform: isDraggingOverlay ? "rotate(2deg) scale(1.02)" : undefined,
    transition: "box-shadow 180ms, transform 180ms",
    borderRadius: 10,
    overflow: "hidden",
    cursor: "pointer",
    position: "relative",
  };

  return (
    <div onClick={onClick} className="group nodrag" style={cardStyle}>
      {/* Top accent bar — subtle, picks up the board colour */}
      <div
        style={{
          height: 3,
          background: `linear-gradient(90deg, ${accent} 0%, ${accent}99 100%)`,
        }}
      />
      <div className="px-3.5 py-3">
        {/* Priority pill (top) */}
        {priorityStyle ? (
          <div className="mb-2 flex items-center gap-1.5">
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.16em]"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                backgroundColor: priorityStyle.bg,
                color: priorityStyle.fg,
              }}
            >
              <span
                className="h-1 w-1 rounded-full"
                style={{ backgroundColor: priorityStyle.dot }}
              />
              {priorityStyle.label}
            </span>
          </div>
        ) : null}

        {/* Title */}
        <div
          className="text-[14px] leading-[1.32] tracking-tight"
          style={{
            fontFamily: "var(--font-crimson), Georgia, serif",
            color: "var(--color-app-ink)",
            fontWeight: 600,
          }}
        >
          {task.title}
        </div>

        {/* Description preview */}
        {descPreview ? (
          <p
            className="mt-1.5 text-[11.5px] leading-[1.5] line-clamp-2"
            style={{
              fontFamily: "var(--font-manrope), sans-serif",
              color: "var(--color-app-fg-soft)",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {descPreview}
            {(task.description || "").length > 140 ? "…" : ""}
          </p>
        ) : null}

        {/* Checklist progress bar (only if there are items) */}
        {checklistTotal > 0 ? (
          <div className="mt-2.5">
            <div className="flex items-center justify-between">
              <span
                className="inline-flex items-center gap-1 text-[10px] font-semibold tabular-nums"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  color: allDone
                    ? "var(--color-app-aqua)"
                    : "var(--color-app-fg-muted)",
                  letterSpacing: 0.4,
                }}
              >
                <CheckIcon size={11} />
                {checklistDone}/{checklistTotal}
              </span>
              <span
                className="text-[10px] tabular-nums"
                style={{
                  fontFamily: "var(--font-dm-mono), monospace",
                  color: "var(--color-app-fg-muted)",
                }}
              >
                {checklistPct}%
              </span>
            </div>
            <div
              className="mt-1 h-1 rounded-full overflow-hidden"
              style={{ backgroundColor: "var(--color-app-canvas-2)" }}
            >
              <div
                className="h-full transition-all"
                style={{
                  width: `${checklistPct}%`,
                  background: allDone
                    ? "linear-gradient(90deg, #56a0a8, #1f4e54)"
                    : `linear-gradient(90deg, ${accent}, ${accent}cc)`,
                }}
              />
            </div>
          </div>
        ) : null}

        {/* Footer: due date + assignee */}
        {(due || task.assignee || task.hasDescription) && (
          <div className="mt-2.5 flex items-center gap-2">
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
                  letterSpacing: 0.3,
                }}
                title={
                  isOverdue
                    ? "Overdue"
                    : isToday
                      ? "Due today"
                      : "Due " + dueLabel
                }
              >
                <ClockIcon />
                {dueLabel}
              </span>
            ) : null}

            {task.hasDescription && !descPreview ? (
              <span
                style={{ color: "var(--color-app-fg-muted)" }}
                title="Has description"
              >
                <DescIcon />
              </span>
            ) : null}

            <div className="ml-auto flex items-center gap-1.5">
              {task.assignee ? (
                <span
                  title={task.assignee.name}
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-semibold ring-2"
                  style={{
                    fontFamily: "var(--font-crimson), Georgia, serif",
                    backgroundColor: "var(--color-app-ink)",
                    color: "var(--color-app-ivory)",
                    boxShadow: "0 1px 3px rgba(10,17,36,0.20)",
                    // @ts-expect-error CSS var
                    "--tw-ring-color": "var(--color-app-paper)",
                  }}
                >
                  {initials(task.assignee.name)}
                </span>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function CheckIcon({ size = 11 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 12l5 5L20 7"
        stroke="currentColor"
        strokeWidth="2.6"
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

function DescIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 6h14M5 12h14M5 18h9"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
