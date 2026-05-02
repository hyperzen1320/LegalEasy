"use client";

import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export type ConnectionEdgeData = {
  label: string;
  color: string | null;
  style: "solid" | "dashed";
  accent: string;
  canEdit: boolean;
  onLabelChange: (id: string, label: string) => void;
  onDelete: (id: string) => void;
};

export default function ConnectionEdge(
  props: EdgeProps & { data?: ConnectionEdgeData }
) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    data,
  } = props;

  const [hover, setHover] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data?.label ?? "");

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    curvature: 0.35,
  });

  const stroke = data?.color || data?.accent || "#c5853a";
  const strokeWidth = selected || hover ? 2.4 : 1.7;
  const dashArray = data?.style === "dashed" ? "8 4" : undefined;

  function commitLabel() {
    setEditing(false);
    if (draftLabel !== (data?.label ?? "")) {
      data?.onLabelChange(id, draftLabel);
    }
  }

  return (
    <>
      {/* Wide invisible hit-target for hover */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ cursor: data?.canEdit ? "pointer" : "default" }}
      />
      {/* Glow on hover */}
      {(hover || selected) && (
        <path
          d={edgePath}
          fill="none"
          stroke={stroke}
          strokeOpacity={0.15}
          strokeWidth={10}
          strokeLinecap="round"
        />
      )}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke,
          strokeWidth,
          strokeDasharray: dashArray,
          strokeLinecap: "round",
          transition: "stroke-width 150ms",
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="absolute"
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {editing && data?.canEdit ? (
            <input
              autoFocus
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitLabel();
                if (e.key === "Escape") {
                  setDraftLabel(data?.label ?? "");
                  setEditing(false);
                }
              }}
              placeholder="Label this connection…"
              className="rounded-md px-2.5 py-1 text-[11px] font-medium outline-none"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-ink)",
                backgroundColor: "var(--color-app-paper)",
                border: `1.5px solid ${stroke}`,
                minWidth: 140,
                boxShadow: "0 4px 12px -4px rgba(10,17,36,0.20)",
              }}
            />
          ) : data?.label ? (
            <button
              onClick={() => data?.canEdit && setEditing(true)}
              className="rounded-md px-2.5 py-1 text-[11px] font-medium transition-shadow"
              style={{
                fontFamily: "var(--font-manrope), sans-serif",
                color: "var(--color-app-ink)",
                backgroundColor: "var(--color-app-paper)",
                border: `1px solid ${stroke}55`,
                cursor: data?.canEdit ? "pointer" : "default",
                boxShadow: hover
                  ? "0 4px 12px -4px rgba(10,17,36,0.20)"
                  : "0 1px 3px rgba(10,17,36,0.08)",
              }}
            >
              {data.label}
            </button>
          ) : (hover || selected) && data?.canEdit ? (
            <button
              onClick={() => setEditing(true)}
              className="rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em]"
              style={{
                fontFamily: "var(--font-dm-mono), monospace",
                color: "var(--color-app-fg-muted)",
                backgroundColor: "var(--color-app-paper)",
                border: "1px dashed var(--color-app-edge)",
                cursor: "pointer",
              }}
            >
              + Label
            </button>
          ) : null}

          {(hover || selected) && data?.canEdit ? (
            <button
              onClick={() => {
                if (confirm("Disconnect these lists?")) {
                  data.onDelete(id);
                }
              }}
              aria-label="Remove connection"
              className="flex h-6 w-6 items-center justify-center rounded-full"
              style={{
                backgroundColor: "var(--color-app-paper)",
                border: "1px solid var(--color-app-danger)",
                color: "var(--color-app-danger)",
                boxShadow: "0 4px 12px -4px rgba(193,74,55,0.30)",
                cursor: "pointer",
              }}
            >
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden
              >
                <path
                  d="M6 6l12 12M6 18L18 6"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
